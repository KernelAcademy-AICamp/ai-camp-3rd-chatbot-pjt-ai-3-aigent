import { NextResponse } from "next/server";
import {
  callShoppingCategoryKeywords,
  ShoppingCategoryKeywordsResponse,
} from "@/lib/naver";
import { groqClient, getGroqContent } from "@/lib/groq";

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

      metrics[kw] = {
        keyword: kw,
        periods,
        avgRatio,
        recentAvgRatio: recentAvg,
        prevAvgRatio: prevAvg,
        growthRatio,
        peakMonths,
      };
    }

    let analysis: string | null = null;

    if (groqClient) {
      const metricLines = Object.values(metrics)
        .map((m) => {
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

          return `- ${m.keyword}: 전체 평균 ${m.avgRatio.toFixed(
            1,
          )}, 최근 평균 ${m.recentAvgRatio.toFixed(
            1,
          )}, ${growthText}, 피크 시즌: ${months}`;
        })
        .join("\n");

      const systemPrompt = [
        "당신은 네이버 쇼핑 검색 트렌드를 해석하는 소싱 전문가입니다.",
        "입력으로 카테고리 내 여러 키워드의 검색 지표(평균, 성장률, 피크 시즌 요약)가 주어집니다.",
        "이 정보를 바탕으로 향후 유망도가 높은 키워드 5~10개를 선정하고,",
        "각 키워드별로 성장성, 계절성(어느 계절에 강한지), 니치/경쟁도 관점의 코멘트를 한국어로 요약하세요.",
        "숫자는 대략적인 방향(상승/보통/정체/감소)을 설명하는 데만 사용하고, 과장된 표현은 피합니다.",
      ].join("\n");

      const userPrompt = [
        `카테고리 ID: ${categoryId}`,
        `분석 기간: ${startDate} ~ ${endDate} (${timeUnit})`,
        "",
        "키워드별 요약 지표:",
        metricLines,
        "",
        "요청:",
        "1) 유망도가 높은 키워드 순서대로 5~10개를 리스트업하고,",
        "2) 각 항목마다 한글 제품기획자 관점에서 '성장성', '계절성', '소싱 관점 코멘트'를 2~3줄로 써주세요.",
      ].join("\n");

      const completion = await groqClient.chat.completions.create({
        model: "openai/gpt-oss-120b",
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

    return NextResponse.json({
      categoryId,
      startDate,
      endDate,
      timeUnit,
      keywords: uniqueKeywords,
      metrics,
      analysis,
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

