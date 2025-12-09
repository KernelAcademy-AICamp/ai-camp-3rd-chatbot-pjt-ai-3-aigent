import { NextResponse } from "next/server";
import { groqClient, getGroqContent } from "@/lib/groq";
import {
  DatalabParams,
  runKeywordAnalysisTransaction,
  runKeywordAnalysisForExplicitKeywords,
  KeywordStats,
} from "@/lib/datalab-run";

/**
 * 오른쪽 패널에서 넘어온 기본 분석 조건(datalabParams)과
 * 마지막 사용자 메시지 내용을 바탕으로,
 * 실제 DataLab 분석에 사용할 파라미터를 보정한다.
 *
 * - "키워드 분석 조건:" 스니펫이 있으면 패널 값 기준으로 그대로 사용.
 * - "2023년", "23년도", "이번년도" 등 연도 표현이 있고 스니펫이 없으면
 *   해당 연도 전체(1월1일~12월31일)로 기간을 보정.
 * - 패딩/후드티 등 의류 토큰이 있으면 카테고리를 패션의류로 강제 매핑.
 */
function inferDatalabParams(
  base: DatalabParams | undefined,
  lastUserMessage: string,
): DatalabParams | null {
  if (!base) return null;

  const msg = lastUserMessage || "";

  const hasSnippet = msg.includes("키워드 분석 조건:");

  // 4자리 연도 (예: 2021년, 2023년도)
  const year4Match = msg.match(/(20\d{2})\s*년?도?/);

  // 2자리 연도 (예: 21년도, 23년) -> 2017~2035 범위로 해석
  let year2: number | null = null;
  if (!year4Match) {
    const m2 = msg.match(/\b(\d{2})\s*년?도?\b/);
    if (m2) {
      const num = Number.parseInt(m2[1], 10);
      if (Number.isFinite(num)) {
        const candidate = 2000 + num;
        if (candidate >= 2017 && candidate <= 2035) {
          year2 = candidate;
        }
      }
    }
  }

  // "이번년도", "올해" 같은 표현은 현재 연도로 해석
  const thisYearExpressions = /(이번\s*년?도?|올해)/;
  const hasThisYear = thisYearExpressions.test(msg);

  const hasYear = Boolean(year4Match || year2 || hasThisYear);

  const wantsDataKeywords = [
    "검색량",
    "트렌드",
    "데이터랩",
    "네이버 데이터",
    "키워드 발굴",
    "키워드 분석",
  ];
  const wantsData =
    hasSnippet ||
    hasYear ||
    wantsDataKeywords.some((t) => msg.includes(t));

  // 사용자가 단지 "제품명 추천"만 요청한 경우에는 DataLab 트랜잭션을 실행하지 않습니다.
  if (!wantsData) return null;

  const params: DatalabParams = {
    dateFrom: base.dateFrom,
    dateTo: base.dateTo,
    devices: [...base.devices],
    gender: base.gender,
    ageBuckets: [...base.ageBuckets],
    categories: [...base.categories],
  };

  // 1) "2023년", "23년도" 등 연도 기반 분석 요청이면 기간을 해당 연도로 맞춥니다.
  let year =
    year4Match && Number.parseInt(year4Match[1], 10)
      ? Number.parseInt(year4Match[1], 10)
      : year2;

  // 오른쪽 패널에서 이미 기간을 명시적으로 넣어준 경우(스니펫 사용)에는
  // 자연어에 등장하는 연도 표현으로 기간을 다시 덮어쓰지 않습니다.
  // 반대로 스니펫이 없고 "23년도", "이번년도" 같은 표현만 있는 경우에만
  // 연도 전체(1월1일~12월31일)로 기간을 보정합니다.
  if (!hasSnippet) {
    if (!year && hasThisYear) {
      year = new Date().getFullYear();
    }

    if (year && Number.isFinite(year) && year >= 2017 && year <= 2035) {
      params.dateFrom = `${year}-01-01`;
      params.dateTo = `${year}-12-31`;
    }
  }

  // 2) 의류/패션 관련 키워드가 등장하면 네이버 1분류 "패션의류"로 카테고리를 바꿉니다.
  const apparelTokens = [
    "의류",
    "옷",
    "패딩",
    "코트",
    "자켓",
    "재킷",
    "후드",
    "후드티",
    "맨투맨",
    "티셔츠",
    "셔츠",
    "바지",
    "청바지",
    "스커트",
    "원피스",
    "잠바",
    "점퍼",
    "야상",
  ];

  if (apparelTokens.some((t) => msg.includes(t))) {
    if (!params.categories.includes("패션의류")) {
      params.categories = ["패션의류"];
    }
  }

  return params;
}

/**
 * DataLab 분석을 실제로 실행할지 여부를 LLM에 위임해 판단한다.
 * - 휴리스틱상 후보이지만 단순 네이밍/카피 요청일 수 있는 경우에 사용.
 * - JSON 한 줄(`{"should_run": true}`)만 허용하며,
 *   파싱 실패 시에는 보수적으로 true(실행)로 간주한다.
 */
async function decideDatalabByLLM(
  message: string,
  params: DatalabParams,
): Promise<boolean> {
  // groqClient 가 없으면 기본적으로 실행 쪽으로 둡니다.
  if (!groqClient) return true;

  const summaryLines = [
    `기간: ${params.dateFrom || "미지정"} ~ ${params.dateTo || "미지정"}`,
    `디바이스: ${params.devices.join("/") || "전체"}`,
    `성별: ${params.gender || "전체"}`,
    `연령: ${params.ageBuckets.join(", ") || "전체"}`,
    `카테고리: ${params.categories.join(", ") || "전체"}`,
  ].join("\n");

  const systemPrompt = [
    "당신은 라우팅 전담 어시스턴트입니다.",
    "사용자가 방금 입력한 질문이 '네이버 데이터랩 시계열/Top 키워드 분석'까지 실제로 실행해야 하는지 판단하세요.",
    "",
    "DataLab 분석이 필요한 경우:",
    "- 과거/미래 트렌드, 검색량, 성장률, 피크 시즌 등 '데이터 기반' 설명이 명시적으로 필요할 때",
    "- '어떤 키워드가 잘 나가?', '최근/작년/올해 트렌드', '네이버 데이터랩으로 분석해 줘' 같은 요청인 경우",
    "",
    "DataLab 분석이 필요 없는 경우:",
    "- 단순 제품명/카피라이팅 추천, 문장 다듬기, 키워드 조합 아이디어 정도만 요청한 경우",
    "",
    "답변은 반드시 JSON 한 줄로만 출력하세요. 예:",
    `{\"should_run\": true}`,
    `{\"should_run\": false}`,
  ].join("\n");

  const userPrompt = [
    "사용자 질문:",
    message,
    "",
    "현재 기본 분석 조건:",
    summaryLines,
  ].join("\n");

  try {
    const completion = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      max_tokens: 40,
      top_p: 1,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content =
      getGroqContent(completion.choices?.[0]?.message?.content) ?? "";
    if (!content) return true;

    const trimmed = content.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return true;

    const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr) as { should_run?: boolean };
    return parsed.should_run ?? true;
  } catch (err) {
    // 라우팅 판단 실패 시에는 보수적으로 실행 쪽으로 둡니다.
    console.error("Datalab routing LLM error", err);
    return true;
  }
}

type QuestionType = "trend" | "strategy" | "naming" | "other";

/**
 * 사용자의 마지막 메시지를 기반으로 질문 타입을 분류한다.
 * - trend: 시장/검색 트렌드·시즌성 중심 질문
 * - strategy: 소싱/포지셔닝/마진 전략이 핵심인 질문
 * - naming: 제품명/카피라이팅이 핵심인 요청
 * - other: 일반 대화 또는 위에 속하지 않는 경우
 *
 * 분류 결과는 system 프롬프트와 chat_messages.meta.question_type 에 기록된다.
 */
async function classifyQuestionType(message: string): Promise<QuestionType> {
  if (!groqClient) return "other";
  const trimmed = (message || "").trim();
  if (!trimmed) return "other";

  const systemPrompt = [
    "당신은 질문을 분류하는 어시스턴트입니다.",
    "아래 사용자 메시지가 어떤 목적에 가까운지 판단하세요.",
    "",
    "분류 기준:",
    "- trend: 과거/현재/미래 트렌드, 검색량, 성장률, 피크 시즌, '언제 잘 팔렸어?' 같은 시장/데이터 흐름 설명 요청",
    "- strategy: 어떤 상품을 소싱·기획·포지셔닝하면 좋을지, 마진/경쟁도/타깃 관점의 전략이 핵심인 경우",
    "- naming: 제품명·카피라이팅·키워드 조합(예: '제품명 5개만 뽑아줘', '좀 더 프리미엄 느낌으로 이름 바꿔줘')이 핵심인 경우",
    "- other: 위에 딱 맞지 않는 일반 대화/설명 요청",
    "",
    "반드시 JSON 형식으로만 답변하세요. 예:",
    `{\"type\": \"trend\"}`,
    `{\"type\": \"strategy\"}`,
    `{\"type\": \"naming\"}`,
    `{\"type\": \"other\"}`,
  ].join("\n");

  const userPrompt = `사용자 메시지:\n${trimmed}`;

  try {
    const completion = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      max_tokens: 40,
      top_p: 1,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content =
      getGroqContent(completion.choices?.[0]?.message?.content) ?? "";
    const text = content.trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return "other";
    const jsonStr = text.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr) as { type?: QuestionType };
    const t = parsed.type;
    if (t === "trend" || t === "strategy" || t === "naming" || t === "other") {
      return t;
    }
    return "other";
  } catch (err) {
    console.error("Question type classification error", err);
    return "other";
  }
}
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    productName,
    target,
    focus,
    messages,
    datalabParams,
    analysisMode,
  } = body as {
    productName?: string;
    target?: string;
    focus?: string[];
    messages?: { role: "user" | "assistant"; content: string }[];
    datalabParams?: DatalabParams;
    analysisMode?: "datalab" | "generic";
  };

  if (!groqClient) {
    return NextResponse.json(
      { error: "GROQ_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const focusArray = Array.isArray(focus)
    ? focus.filter((f) => typeof f === "string" && f.trim().length > 0)
    : [];
  const focusText =
    focusArray.length > 0 ? focusArray.join(", ") : "일반";
  const basePrompt = [
    "당신은 쇼핑 마켓 검색 패턴과 트렌드를 이해하는 한국어 소싱 전문가 챗봇입니다.",
    "",
    "역할:",
    "1) 사용자가 제품명/키워드 추천, 조합, 수정, 비교 등을 요청하면, 비(非) 의류·비부피형 상품 중심으로 경쟁이 덜한 니치 키워드를 섞어 제품명 5~8개를 제안합니다.",
    "2) 각 제품명마다 포함된 키워드 태그, 성장률/경쟁도 요약, 추천 이유를 한 줄로 덧붙입니다.",
    "3) 사용자가 단순 인사나 서비스 설명을 물어볼 때(예: '안녕', '뭐 하는 서비스야?')는 제품명 리스트를 바로 생성하지 말고, 짧게 인사/설명을 한 뒤 어떤 상품을 도와줄지 되물어봅니다.",
    "4) 정보가 부족하면 기본 상품명, 타깃, 강조 포인트를 추가로 물어본 뒤에 추천을 진행합니다.",
    "5) 이전 대화 맥락을 기억하고, '3번만 더 짧게', '방수 포인트를 더 강조해줘'와 같은 후속 요청에는 직전 추천 결과를 기준으로 수정합니다.",
    "",
    "데이터 활용 원칙:",
    "- 시스템 메시지로 제공되는 '[데이터 기반 키워드 분석 요약]' 텍스트는 네이버 데이터랩에서 실제로 계산된 결과입니다.",
    "- 이 텍스트에 적힌 분석 기간, 카테고리 이름/ID, 키워드 리스트를 사실로 가정하고, 임의로 다른 카테고리 이름으로 바꾸어 말하지 마세요.",
    "- 카테고리 이름은 요약에 그대로 적힌 라벨(예: '생활/건강')을 사용합니다.",
    "",
    "응답 구조:",
    "1. 데이터 기반 키워드 분석 요약",
    "   - 네이버 데이터랩 요약을 3~6줄로 다시 정리합니다.",
    "   - 어떤 카테고리/기간 기준인지, 어떤 유형의 키워드가 상승/보합/감소인지 명확히 설명합니다.",
    "",
    "2. 니치 키워드 및 제품명 제안",
    "   - 데이터 상 유망해 보이는 키워드를 중심으로 니치 키워드 3~6개를 먼저 제안합니다.",
    "   - 이어서 제품명 5~8개를 추천하고, 각 제품명마다 포함 키워드·트렌드/경쟁도 요약·추천 이유를 한 줄씩 적습니다.",
    "",
    "3. 추가 질문/다음 액션",
    "   - 필요하다면 타깃/가격대/채널 등을 1~2문장 내에서 짧게 되물어보거나, 다음에 할 수 있는 분석 방향을 제안합니다.",
    "",
    "스타일:",
    "- 실제 검색에 쓰일 수 있는 자연스러운 단어 위주로 제안합니다.",
    "- 과도한 감탄사나 이모지는 사용하지 않습니다.",
    "- 마크다운 표, 파이프(|), HTML 태그(<br> 등)는 사용하지 않습니다.",
    "- 대신, 섹션 제목에는 `#`, `##`, `###` 와 같은 마크다운 헤딩과 굵게(`**텍스트**`), 리스트(`- 항목`, `1. 항목`)만 사용해 가독성을 높입니다.",
    "",
    "니치 키워드/제품명 설계 원칙:",
    "- 항상 '이 이름으로 실제 스마트스토어/쿠팡 상품명을 올릴 수 있는지'를 기준으로, 구체적이고 현실적인 조합만 사용합니다.",
    "- 니치 포인트는 다음 축을 중심으로 만듭니다:",
    "  · 타깃: 연령, 성별, 직업, 라이프스타일(예: 라이더, 야외근무자, 학생, 시니어 등)",
    "  · 사용 상황/장소: 출퇴근, 등산·낚시·골프, 사무실, 교실, 차량 내부 등",
    "  · 형태/부위/사이즈: 붙이는 타입, 깔창형, 손가락/손목용, 허리·복부용, 미니/대용량 등",
    "  · 가치 요소: 장시간 지속, 저온화상 방지, 친환경(재사용·충전식), 프리미엄 소재, 선물용 패키지 등",
    "- 서로 다른 카테고리를 억지로 섞은 조합(예: '핫팩 무선 전자기기', '핫팩 알러지용 스티커'처럼 구체적인 제품 이미지가 떠오르지 않는 이름)은 피합니다.",
    "- 기존 키워드에 전혀 관계없는 트렌드 단어(스마트홈, 메타버스, 앱 등)를 단순히 붙이는 방식이 아니라, 해당 상품군의 실제 사용 맥락 안에서 자연스럽게 파생될 수 있는 니치를 만듭니다.",
    "- 제품명은 가능한 한 '카테고리 + 타깃/용도 + 핵심 장점'이 한 번에 드러나도록 작성합니다. (예: '라이더 12시간 발열 핫팩 프로', '골프라운드 깔창형 발난로' 등)",
    "",
    "질문 유형에 따른 응답 가이드:",
    "- 질문 유형이 'trend'이면: 위 1번 섹션(데이터 요약)에 비중을 두고, 유망 키워드/상품 방향을 중심으로 설명합니다. 제품명 예시는 2~4개 정도만 간단히.",
    "- 질문 유형이 'strategy'이면: 어느 포지션/타깃/가격대가 유리한지, 어떤 키워드를 잡고 소싱해야 할지 전략적 관점에서 정리합니다. 제품명 예시는 2~3개 정도만 간단히.",
    "- 질문 유형이 'naming'이면: 제품명·카피 작성에 집중하되, 1번 섹션에서 핵심 트렌드만 2~3줄로 짧게 언급합니다.",
    "- 질문 유형이 'other'이면: 사용자의 의도를 파악한 뒤, 필요한 경우 위 세 유형 중 하나로 자연스럽게 방향을 제안합니다.",
  ].join("\n");

  const history =
    Array.isArray(messages) && messages.length > 0
      ? messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      : [];

  let datalabSummary: string | null = null;
  let datalabDebug:
    | {
        categoryId: string;
        startDate: string;
        endDate: string;
        timeUnit: string;
        keywords: string[];
        analysisRunId: number | null;
      }
    | null = null;
  let keywordInsights:
    | {
        startDate: string;
        endDate: string;
        timeUnit: string;
        items: {
          keyword: string;
          periods: number;
          avgRatio: number;
          recentAvgRatio: number;
          growthRatio: number | null;
          peakMonths: number[];
          series: { period: string; ratio: number }[];
        }[];
      }
    | null = null;
  let datalabExecuted = false;
  let datalabKeywordSource: "top10" | "focus" | "unknown" = "unknown";

  const lastUserMessage =
    history
      .filter((m) => m.role === "user")
      .slice(-1)
      .map((m) => m.content)[0] ?? "";

  // 프론트에서 전달한 분석 모드 + 메시지 내 스니펫을 함께 고려해
  // 실제 DataLab 실행 모드를 결정한다.
  //
  // - 기본값은 프론트에서 넘긴 analysisMode 값을 따르되,
  // - 마지막 사용자 메시지에 "키워드 분석 조건:" 스니펫이 명시적으로 포함되어 있으면
  //   안전하게 DataLab 분석 모드로 강제 전환한다.
  //
  // 이렇게 하면 프론트 쪽 상태 버그가 있더라도, 사용자가 스니펫을 넣은 턴에서는
  // 항상 DataLab 파이프라인을 타도록 보장할 수 있다.
  const hasSnippetInMessage = lastUserMessage.includes("키워드 분석 조건:");

  const resolvedAnalysisMode: "datalab" | "generic" =
    analysisMode === "datalab" || hasSnippetInMessage ? "datalab" : "generic";

  const effectiveDatalabParams =
    resolvedAnalysisMode === "datalab"
      ? inferDatalabParams(datalabParams, lastUserMessage)
      : null;

  const questionType = await classifyQuestionType(lastUserMessage);

  if (process.env.NODE_ENV !== "production") {
    console.log("[Datalab][routing] questionType:", questionType, {
      hasBaseParams: Boolean(datalabParams),
      hasEffectiveParams: Boolean(effectiveDatalabParams),
      hasSnippetInMessage,
      lastUserSnippet: lastUserMessage.slice(0, 80),
    });
  }

  if (
    effectiveDatalabParams &&
    effectiveDatalabParams.dateFrom &&
    effectiveDatalabParams.dateTo &&
    Array.isArray(effectiveDatalabParams.categories) &&
    effectiveDatalabParams.categories.length > 0
  ) {
    try {
      let shouldRun = true;

      // 오른쪽 패널 스니펫이 명시적으로 붙은 경우에는 LLM 라우팅 없이 바로 실행.
      const hasSnippet = lastUserMessage.includes("키워드 분석 조건:");

      // 질문이 길고(맥락이 많고), 스니펫은 없고, 휴리스틱으로는 DataLab 후보인 경우에만
      // LLM 라우터에게 한 번 더 물어본다.
      if (!hasSnippet && lastUserMessage.length > 40) {
        shouldRun = await decideDatalabByLLM(
          lastUserMessage,
          effectiveDatalabParams,
        );

        if (process.env.NODE_ENV !== "production") {
          console.log("[Datalab][routing] LLM router decision:", {
            shouldRun,
          });
        }
      }

      if (!shouldRun) {
        datalabSummary = null;
      } else {
        // 1) 네이버 DataLab 분석 트랜잭션 실행
        //    - focusArray(분석 키워드)가 있으면 이를 기준으로 분석
        //    - 없으면 기존처럼 카테고리 Top 10 키워드를 사용
        const hasFocusKeywords = focusArray.length > 0;

        const result = hasFocusKeywords
          ? await runKeywordAnalysisForExplicitKeywords(
              effectiveDatalabParams,
              focusArray,
            )
          : await runKeywordAnalysisTransaction(effectiveDatalabParams);

        datalabExecuted = true;
        datalabKeywordSource = hasFocusKeywords ? "focus" : "top10";

        if (process.env.NODE_ENV !== "production") {
          console.log("[Datalab][analysis] success", {
            categoryId: result.categoryId,
            startDate: result.startDate,
            endDate: result.endDate,
            timeUnit: result.timeUnit,
            keywordCount: result.keywords.length,
            analysisRunId: result.analysisRunId,
          });
        }

        const growthLabel = (g: KeywordStats["growthRatio"]) => {
          if (!g || !Number.isFinite(g)) return "데이터 부족";
          const pct = (g - 1) * 100;
          if (pct > 20) return `강한 상승 (+${pct.toFixed(1)}%)`;
          if (pct > 5) return `완만한 상승 (+${pct.toFixed(1)}%)`;
          if (pct > -5) return `보합 (${pct.toFixed(1)}%)`;
          if (pct > -20) return `완만한 감소 (${pct.toFixed(1)}%)`;
          return `강한 감소 (${pct.toFixed(1)}%)`;
        };

        // growthRatio 기준으로 키워드를 세 그룹으로 나눠
        // LLM이 "유망 후보 vs 참고용"을 더 쉽게 구분할 수 있도록 한다.
        const metricsArray = Object.values(result.metrics);

        const upwardCandidates = metricsArray
          .filter((m) => m.growthRatio && m.growthRatio >= 1.05)
          .sort(
            (a, b) => (b.growthRatio ?? 0) - (a.growthRatio ?? 0),
          );

        const stableCandidates = metricsArray
          .filter(
            (m) =>
              m.growthRatio &&
              m.growthRatio >= 0.95 &&
              m.growthRatio < 1.05,
          )
          .sort(
            (a, b) => (b.growthRatio ?? 0) - (a.growthRatio ?? 0),
          );

        const decliningCandidates = metricsArray
          .filter((m) => !m.growthRatio || m.growthRatio < 0.95)
          .sort(
            (a, b) => (a.growthRatio ?? 0) - (b.growthRatio ?? 0),
          );

        const candidateLines: string[] = [];

        if (upwardCandidates.length > 0) {
          candidateLines.push(
            `- 최근 모멘텀이 있는 키워드(성장률 기준 상위): ${upwardCandidates
              .slice(0, 5)
              .map((m) => m.keyword)
              .join(", ")}`,
          );
        } else if (stableCandidates.length > 0) {
          candidateLines.push(
            `- 최근 보합·완만한 상승 키워드: ${stableCandidates
              .slice(0, 5)
              .map((m) => m.keyword)
              .join(", ")}`,
          );
        }

        if (decliningCandidates.length > 0) {
          candidateLines.push(
            `- 감소/성숙 키워드(참고용): ${decliningCandidates
              .slice(0, 5)
              .map((m) => m.keyword)
              .join(", ")}`,
          );
        }

        const keywordLines = metricsArray
          .map((m) => {
            const peaks =
              m.peakMonths.length > 0
                ? m.peakMonths.map((mm) => `${mm}월`).join(", ")
                : "특정 계절 패턴 없음";
            return `- ${m.keyword}: ${growthLabel(
              m.growthRatio,
            )}, 피크 시즌 ${peaks}`;
          })
          .join("\n");

        keywordInsights = {
          startDate: result.startDate,
          endDate: result.endDate,
          timeUnit: result.timeUnit,
          items: metricsArray.map((m) => ({
            keyword: m.keyword,
            periods: m.periods,
            avgRatio: m.avgRatio,
            recentAvgRatio: m.recentAvgRatio,
            prevAvgRatio: m.prevAvgRatio,
            growthRatio: m.growthRatio,
            peakMonths: m.peakMonths,
            trendAnalysis: m.trendAnalysis,
            series: result.series[m.keyword] ?? [],
          })),
        };

        const categoryLabel =
          effectiveDatalabParams.categories &&
          effectiveDatalabParams.categories.length > 0
            ? effectiveDatalabParams.categories.join(", ")
            : "패널에서 지정한 카테고리";

        datalabSummary = [
          "[데이터 기반 키워드 분석 요약]",
          `- 분석 기간: ${result.startDate} ~ ${result.endDate} (timeUnit=${result.timeUnit})`,
          `- 분석 카테고리: ${categoryLabel} (ID: ${result.categoryId})`,
          hasFocusKeywords
            ? `- 분석 키워드: ${result.keywords.join(", ")}`
            : `- Top 키워드: ${result.keywords.join(", ")}`,
          ...(candidateLines.length
            ? ["- 성장성 기준 요약:", ...candidateLines]
            : []),
          "- 키워드별 성장/계절성:",
          keywordLines,
        ].join("\n");

        datalabDebug = {
          categoryId: result.categoryId,
          startDate: result.startDate,
          endDate: result.endDate,
          timeUnit: result.timeUnit,
          keywords: result.keywords,
          analysisRunId: result.analysisRunId,
        };
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Datalab][analysis] failed", err);
      } else {
        console.error("Datalab analysis failed", err);
      }
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      datalabSummary = [
        "[데이터 기반 키워드 분석 실패]",
        "- 현재 설정된 기간/카테고리 조건으로는 네이버 DataLab Top 키워드/트렌드 데이터를 가져오지 못했습니다.",
        "- 사용자가 원한다면, 기간을 조금 넓히거나 카테고리/상품군을 더 구체적으로 지정하도록 부드럽게 요청한 뒤 다시 분석을 제안하세요.",
        `- 내부 에러 메시지: ${message}`,
      ].join("\n");
    }
  }

  try {
    const completion = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.45,
      max_tokens: 2400,
      top_p: 1,
      stream: false,
      messages: [
        { role: "system", content: basePrompt },
        {
          role: "system",
          content: [
            "현재 분석 컨텍스트:",
            `- 기본 제품명: ${productName || "사용자가 대화에서 지정"}`,
            `- 타깃/상황: ${target || "사용자가 대화에서 지정"}`,
            `- 강조 포인트: ${focusText}`,
            `- 질문 유형: ${questionType}`,
            `- 분석 모드: ${
              resolvedAnalysisMode === "datalab"
                ? "네이버 데이터랩 분석 모드"
                : "일반 대화 모드"
            }`,
            datalabSummary
              ? [
                  "",
                  "[추가 데이터] 네이버 데이터랩 기반 키워드 분석 요약이 포함되어 있습니다.",
                  "아래 텍스트는 실제 API 응답을 바탕으로 생성된 것이므로, 기간/카테고리/키워드 정보를 사실로 가정하고 활용하세요.",
                  datalabSummary,
                  "",
                  "[응답 시 데이터 활용 원칙]",
                  "- '강한 상승' 또는 '완만한 상승', '보합'으로 표시된 키워드를 우선 유망 후보로 사용하세요.",
                  "- '완만한 감소'나 '강한 감소' 키워드는 이미 성숙·하락 구간일 수 있으므로, 직접적인 추천보다는 '지난 시즌에 강했음/참고용' 정도로만 언급합니다.",
                  "- 숫자(성장률, 퍼센트)를 그대로 반복해서 나열하기보다는, 상승/보합/감소 방향과 계절성, 니치 여부를 중심으로 정리하세요.",
                ].join("\n")
              : "",
            ...(focusArray.length
              ? [
                  "",
                  "[분석 키워드(패널 선택 항목) 활용 규칙]",
                  `- 사용자가 패널에서 분석 키워드로 선택한 항목: ${focusArray.join(", ")}`,
                  "- 제품명·니치 키워드 제안 시 이 선택된 분석 키워드를 우선 반영하세요.",
                  "- 가능하다면 각 제품명에는 최소 1개 이상의 분석 키워드를 포함시키고, 포함되지 않는 경우에도 해당 키워드와 직접적인 연관성이 드러나도록 작성합니다.",
                  "- DataLab Top 키워드는 전체 시장 맥락(상승/감소, 계절성)을 설명하는 용도로 사용하고, 실제 추천의 중심축은 사용자가 선택한 분석 키워드입니다.",
                ]
              : []),
            "",
            "대화 기록과 위의 데이터 요약을 모두 참고해, 사용자의 최신 메시지에 맞는 응답을 작성하세요.",
            "",
            "응답 형식(섹션 제목 그대로 사용하지 않아도 되지만, 아래 3가지 내용이 순서대로 포함되도록 작성하세요):",
            "1. 데이터 기반 키워드 분석 요약",
            "2. 니치 키워드 및 제품명 제안",
            "3. 추가 질문/다음 액션 제안 (필요한 경우)",
            "",
            "제품명을 제안할 때는 각 제품명 사이에 빈 줄 하나를 넣고, 다음 형식을 사용합니다:",
            "1) 제품명",
            "   - 포함 키워드: ...",
            "   - 트렌드/경쟁도: ...",
            "   - 추천 이유: ...",
          ].join("\n"),
        },
        ...history,
      ],
    });

    const reply =
      getGroqContent(completion.choices?.[0]?.message?.content) ||
      "추천을 생성하지 못했어요. 입력값을 다시 확인해주세요.";

    const supabase = getSupabaseClient();
    if (supabase) {
      const logPayload: Record<string, unknown> = {
        product_name: productName,
        target,
        focus: focusText,
        reply,
        // TODO: 추후 model_id, latency_ms, session_id, project_id 등을 채워넣을 수 있음.
      };

      if (datalabDebug?.analysisRunId != null) {
        // chat_logs 테이블에 analysis_run_id 컬럼이 있다고 가정하고 기록합니다.
        logPayload.analysis_run_id = datalabDebug.analysisRunId;
      }

      // 로깅은 실패해도 사용자 응답에는 영향을 주지 않도록 await 하지 않습니다.
      void supabase.from("chat_logs").insert(logPayload);

      const assistantMeta =
        datalabDebug?.analysisRunId != null
          ? { analysis_run_id: datalabDebug.analysisRunId, question_type: questionType }
          : { question_type: questionType };

      const userMeta =
        datalabDebug?.analysisRunId != null
          ? { analysis_run_id: datalabDebug.analysisRunId, question_type: questionType }
          : { question_type: questionType };

      // chat_messages 테이블이 존재한다고 가정하고, 마지막 user 메시지와 이번 assistant 응답을 함께 저장합니다.
      if (lastUserMessage) {
        void supabase.from("chat_messages").insert([
          {
            session_id: null,
            role: "user",
            content: lastUserMessage,
            meta: userMeta,
          },
          {
            session_id: null,
            role: "assistant",
            content: reply,
            meta: assistantMeta,
          },
        ]);
      }
    }

    const routingDebug =
      process.env.NODE_ENV !== "production"
        ? {
            mode: resolvedAnalysisMode,
            hasEffectiveParams: Boolean(effectiveDatalabParams),
            datalabExecuted,
            questionType,
            hasSnippetInMessage,
            datalabKeywordSource,
          }
        : undefined;

    return NextResponse.json({
      reply,
      datalabDebug,
      keywordInsights,
      routingDebug,
    });
  } catch (error) {
    console.error("Groq chat error", error);

    const base = {
      error: "추천을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };

    // 개발 환경에서는 디버깅을 위해 에러 메시지도 내려줍니다.
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      return NextResponse.json(
        { ...base, details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(base, { status: 500 });
  }
}
