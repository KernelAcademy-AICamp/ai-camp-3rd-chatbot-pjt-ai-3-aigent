import { NextResponse } from "next/server";
import {
  callShoppingCategoryKeywords,
  ShoppingCategoryKeywordsResponse,
} from "@/lib/naver";
import { groqClient, getGroqContent } from "@/lib/groq";
import {
  analyzeAdvancedTrend,
  TrendAnalysisResult,
} from "@/lib/timeseries-analysis";

type KeywordTrendRequest = {
  categoryId: string;
  keywords: string[];
  startDate: string;
  endDate: string;
  timeUnit?: "date" | "week" | "month";
  device?: "" | "pc" | "mo";
  gender?: "" | "m" | "f";
  ages?: string[];
};

type KeywordPoint = { period: string; ratio: number };

type KeywordStats = {
  keyword: string;
  periods: number;
  avgRatio: number;
  recentAvgRatio: number;
  prevAvgRatio: number | null;
  growthRatio: number | null;
  peakMonths: number[];
  // 새로운 시계열 분석 결과
  trendAnalysis?: TrendAnalysisResult;
};

export async function POST(request: Request) {
  const body = (await request.json()) as KeywordTrendRequest;
  const {
    categoryId,
    keywords,
    startDate,
    endDate,
    timeUnit = "month",
    device = "",
    gender = "",
    ages = [],
  } = body;

  if (!categoryId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "categoryId, startDate, endDate는 필수입니다." },
      { status: 400 },
    );
  }

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json(
      { error: "분석할 키워드를 1개 이상 입력해주세요." },
      { status: 400 },
    );
  }

  const uniqueKeywords = Array.from(
    new Set(
      keywords
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .slice(0, 10),
    ),
  );

  if (uniqueKeywords.length === 0) {
    return NextResponse.json(
      { error: "유효한 키워드가 없습니다." },
      { status: 400 },
    );
  }

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueKeywords.length; i += 5) {
    chunks.push(uniqueKeywords.slice(i, i + 5));
  }

  try {
    const responses: ShoppingCategoryKeywordsResponse[] = [];

    for (const chunk of chunks) {
      const payload = {
        startDate,
        endDate,
        timeUnit,
        category: categoryId,
        keyword: chunk.map((kw) => ({
          name: kw,
          param: [kw],
        })),
        device,
        gender,
        ages,
      };

      const res = await callShoppingCategoryKeywords(payload);
      responses.push(res);
    }

    const series: Record<string, KeywordPoint[]> = {};

    for (const res of responses) {
      for (const result of res.results) {
        const kw = result.keyword?.[0] || result.title;
        if (!kw) continue;
        if (!series[kw]) {
          series[kw] = [];
        }
        series[kw].push(...result.data);
      }
    }

    const metrics: Record<string, KeywordStats> = {};

    for (const [kw, data] of Object.entries(series)) {
      const sorted = [...data].sort((a, b) =>
        a.period.localeCompare(b.period),
      );
      const ratios = sorted.map((d) => d.ratio);
      const periods = sorted.length;

      const avgRatio =
        ratios.reduce((sum, v) => sum + v, 0) / (ratios.length || 1);

      const recentWindow = Math.max(1, Math.floor(periods / 3));
      const recent = ratios.slice(-recentWindow);
      const prev = ratios.slice(
        Math.max(0, periods - recentWindow * 2),
        periods - recentWindow,
      );

      const recentAvg =
        recent.reduce((sum, v) => sum + v, 0) / (recent.length || 1);
      const prevAvg =
        prev.length > 0
          ? prev.reduce((sum, v) => sum + v, 0) / prev.length
          : null;
      const growthRatio =
        prevAvg && prevAvg > 0 ? recentAvg / prevAvg : null;

      const monthAgg: Record<
        number,
        {
          sum: number;
          count: number;
        }
      > = {};

      for (const point of sorted) {
        const month = Number.parseInt(point.period.slice(5, 7), 10);
        if (!monthAgg[month]) {
          monthAgg[month] = { sum: 0, count: 0 };
        }
        monthAgg[month].sum += point.ratio;
        monthAgg[month].count += 1;
      }

      const monthAverages = Object.entries(monthAgg).map(
        ([month, { sum, count }]) => ({
          month: Number.parseInt(month, 10),
          avg: sum / (count || 1),
        }),
      );

      monthAverages.sort((a, b) => b.avg - a.avg);
      const peakMonths = monthAverages.slice(0, 3).map((m) => m.month);

      // 시계열 머신러닝 분석 수행 (고급 분석 포함)
      const trendAnalysis = analyzeAdvancedTrend(sorted);

      metrics[kw] = {
        keyword: kw,
        periods,
        avgRatio,
        recentAvgRatio: recentAvg,
        prevAvgRatio: prevAvg,
        growthRatio,
        peakMonths,
        trendAnalysis,
      };
    }

    let analysis: string | null = null;

    // 시계열 분석 기반 상승추세 키워드 정렬
    const sortedByGrowth = Object.values(metrics)
      .filter((m) => m.trendAnalysis)
      .sort((a, b) => {
        const scoreA = a.trendAnalysis?.overallScore.growthScore ?? 0;
        const scoreB = b.trendAnalysis?.overallScore.growthScore ?? 0;
        return scoreB - scoreA;
      });

    // 상승추세 키워드 (성장점수 60 이상)
    const risingKeywords = sortedByGrowth.filter(
      (m) => (m.trendAnalysis?.overallScore.growthScore ?? 0) >= 60
    );

    if (groqClient) {
      const metricLines = Object.values(metrics)
        .map((m) => {
          const ta = m.trendAnalysis;
          const growthPercent =
            m.growthRatio && Number.isFinite(m.growthRatio)
              ? (m.growthRatio - 1) * 100
              : null;

          const months =
            m.peakMonths.length > 0
              ? m.peakMonths.map((mm) => `${mm}월`).join(", ")
              : "특정 계절 패턴 없음";

          const growthText =
            growthPercent === null
              ? "성장률: 데이터 부족"
              : `성장률: 최근 대비 직전 기간 약 ${growthPercent.toFixed(
                1,
              )}%`;

          // 시계열 분석 결과 추가
          const trendKor: Record<string, string> = {
            strong_up: "강한 상승",
            moderate_up: "완만한 상승",
            stable: "보합",
            moderate_down: "완만한 하락",
            strong_down: "강한 하락",
          };
          const recKor: Record<string, string> = {
            highly_recommended: "적극 추천",
            recommended: "추천",
            neutral: "보통",
            caution: "주의",
            not_recommended: "비추천",
          };

          const trendDir = ta
            ? trendKor[ta.linearRegression.trendDirection]
            : "분석불가";
          const mkResult = ta?.mannKendall.significant
            ? ta.mannKendall.tau > 0
              ? "통계적 상승"
              : "통계적 하락"
            : "트렌드 미검출";
          const forecast = ta
            ? ta.holtWinters.forecast.map((f) => f.toFixed(0)).join("→")
            : "-";
          const rec = ta ? recKor[ta.overallScore.recommendation] : "-";
          const growthScore = ta?.overallScore.growthScore.toFixed(0) ?? "-";
          const stabilityScore = ta?.overallScore.stabilityScore.toFixed(0) ?? "-";

          return `- ${m.keyword}: 전체 평균 ${m.avgRatio.toFixed(
            1,
          )}, 최근 평균 ${m.recentAvgRatio.toFixed(
            1,
          )}, ${growthText}, 피크 시즌: ${months}, ML분석[트렌드: ${trendDir}, Mann-Kendall: ${mkResult}, 향후예측: ${forecast}, 성장점수: ${growthScore}/100, 안정성: ${stabilityScore}/100, 종합: ${rec}]`;
        })
        .join("\n");

      const systemPrompt = [
        "당신은 네이버 쇼핑 검색 트렌드를 해석하는 소싱 전문가입니다.",
        "입력으로 카테고리 내 여러 키워드의 검색 지표와 시계열 머신러닝(ML) 분석 결과가 주어집니다.",
        "",
        "ML 분석 지표 설명:",
        "- 트렌드: 선형회귀 기반 상승/하락 방향",
        "- Mann-Kendall: 통계적 트렌드 검정 결과 (유의미한 상승/하락 여부)",
        "- 향후예측: Holt-Winters 모델의 향후 3기간 예측값",
        "- 성장점수: 0~100점 (높을수록 성장성 좋음)",
        "- 안정성: 0~100점 (높을수록 변동성 낮음)",
        "- 종합: 적극추천/추천/보통/주의/비추천",
        "",
        "이 정보를 바탕으로 '적극 추천' 또는 '추천' 키워드를 우선 선정하고,",
        "성장점수가 높고 통계적 상승이 확인된 키워드에 집중하세요.",
        "",
        "형식 및 스타일:",
        "- 마크다운 표, 파이프(|), HTML 태그(<br> 등)은 사용하지 마세요.",
        "- Plain text만 사용하고, 각 키워드마다 4~5줄 이내로 간결하게 정리합니다.",
        "- ML 분석 결과를 근거로 설명하되, 숫자보다는 방향과 의미 위주로 작성합니다.",
        "- 톤은 제품기획자/MD가 쓰는 내부 메모 느낌으로, 과장된 마케팅 문구는 피합니다.",
        "",
        "응답 형식:",
        "1. 키워드명 [종합평가]",
        "   - 트렌드 분석: (ML 분석 결과 기반 설명)",
        "   - 향후 전망: (예측값 기반 설명)",
        "   - 계절성: ...",
        "   - 소싱 메모: ...",
        "",
        "2. 키워드명 [종합평가]",
        "   - 트렌드 분석: ...",
        "   - 향후 전망: ...",
        "   - 계절성: ...",
        "   - 소싱 메모: ...",
      ].join("\n");

      const risingKeywordNames = risingKeywords.map((k) => k.keyword).join(", ");
      const userPrompt = [
        `카테고리 ID: ${categoryId}`,
        `분석 기간: ${startDate} ~ ${endDate} (${timeUnit})`,
        "",
        risingKeywordNames
          ? `ML 분석 기반 상승추세 키워드: ${risingKeywordNames}`
          : "ML 분석 결과 명확한 상승추세 키워드 없음",
        "",
        "키워드별 요약 지표 (ML 분석 포함):",
        metricLines,
        "",
        "요청:",
        "- 위에서 제시한 응답 형식을 그대로 따라 주세요.",
        "- ML 분석에서 '적극 추천' 또는 '추천'으로 나온 키워드를 우선 분석하세요.",
        "- 성장점수와 Mann-Kendall 결과를 근거로 유망도를 판단하세요.",
        "- 가장 유망한 키워드부터 순서대로 5~10개만 작성하세요.",
      ].join("\n");

      const completion = await groqClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0.35,
        max_tokens: 900,
        top_p: 1,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      analysis =
        getGroqContent(completion.choices?.[0]?.message?.content) ?? null;
    }

    // 상승추세 키워드 요약 정보 생성
    const risingKeywordsSummary = risingKeywords.map((k) => ({
      keyword: k.keyword,
      growthScore: k.trendAnalysis?.overallScore.growthScore ?? 0,
      stabilityScore: k.trendAnalysis?.overallScore.stabilityScore ?? 0,
      recommendation: k.trendAnalysis?.overallScore.recommendation ?? "neutral",
      trendDirection: k.trendAnalysis?.linearRegression.trendDirection ?? "stable",
      mannKendall: {
        significant: k.trendAnalysis?.mannKendall.significant ?? false,
        direction: k.trendAnalysis?.mannKendall.tau ?? 0 > 0 ? "up" : "down",
      },
      forecast: k.trendAnalysis?.holtWinters.forecast ?? [],
    }));

    return NextResponse.json({
      categoryId,
      startDate,
      endDate,
      timeUnit,
      keywords: uniqueKeywords,
      metrics,
      series,
      analysis,
      // 새로운 시계열 분석 결과
      mlAnalysis: {
        risingKeywords: risingKeywordsSummary,
        sortedByGrowth: sortedByGrowth.map((k) => ({
          keyword: k.keyword,
          growthScore: k.trendAnalysis?.overallScore.growthScore ?? 0,
          recommendation: k.trendAnalysis?.overallScore.recommendation ?? "neutral",
        })),
      },
    });
  } catch (error) {
    console.error("Naver keyword trends error", error);

    const base = {
      error:
        "네이버 데이터랩 키워드 트렌드 분석에 실패했습니다. 파라미터와 환경변수를 확인해주세요.",
    };

    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      return NextResponse.json(
        { ...base, details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(base, { status: 500 });
  }
}
