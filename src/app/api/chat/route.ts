import { NextResponse } from "next/server";
import { groqClient, getGroqContent } from "@/lib/groq";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { productName, target, focus, messages } = body as {
    productName?: string;
    target?: string;
    focus?: string[];
    messages?: { role: "user" | "assistant"; content: string }[];
  };

  if (!groqClient) {
    return NextResponse.json(
      { error: "GROQ_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const focusText = Array.isArray(focus) && focus.length > 0 ? focus.join(", ") : "일반";
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
    "스타일:",
    "- 실제 검색에 쓰일 수 있는 자연스러운 단어 위주로 제안합니다.",
    "- 과도한 감탄사나 이모지는 사용하지 않습니다.",
  ].join("\n");

  const history =
    Array.isArray(messages) && messages.length > 0
      ? messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      : [];

  try {
    const completion = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-120b",
      temperature: 0.45,
      max_tokens: 1200,
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
            "",
            "대화 기록을 참고해, 사용자의 최신 메시지에 맞는 추천 제품명을 작성하세요.",
            "응답 형식 (각 제품명 사이에는 빈 줄 하나를 넣어주세요):",
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
      // 로깅은 실패해도 사용자 응답에는 영향을 주지 않도록 await 하지 않습니다.
      void supabase.from("chat_logs").insert({
        product_name: productName,
        target,
        focus: focusText,
        reply,
      });
    }

    return NextResponse.json({ reply });
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
