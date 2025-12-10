import {
  callShoppingCategoryKeywords,
  ShoppingCategoryKeywordsResponse,
} from "@/lib/naver";
import {
  fetchTopKeywords,
  normalizeNaverKeyword,
} from "@/lib/naver-top-keywords";
import { getSupabaseClient } from "@/lib/supabase";
import {
  analyzeAdvancedTrend,
  type DataPoint,
  type TrendAnalysisResult,
} from "@/lib/timeseries-analysis";

/**
 * Lab / 챗봇에서 공통으로 사용하는
 * 네이버 DataLab 카테고리 키워드 분석 트랜잭션 타입 정의.
 * 오른쪽 패널에서 넘어오는 분석 조건을 그대로 받는다.
 */
export type DatalabParams = {
  dateFrom: string;
  dateTo: string;
  devices: string[];
  gender: string;
  ageBuckets: string[];
  categories: string[];
};

type KeywordPoint = { period: string; ratio: number };

/**
 * 개별 키워드에 대한 집계 통계 값.
 * - periods: 시계열 데이터 포인트 수
 * - avgRatio: 전체 기간 평균 ratio (0~100 스케일)
 * - recentAvgRatio / prevAvgRatio: 최근 구간 vs 직전 구간 평균
 * - growthRatio: 최근 / 직전 비율 (1 이상이면 상승)
 * - peakMonths: 월별 평균 ratio 기준 상위 3개 월
 */
export type KeywordStats = {
  keyword: string;
  periods: number;
  avgRatio: number;
  recentAvgRatio: number;
  prevAvgRatio: number | null;
  growthRatio: number | null;
  peakMonths: number[];
  trendAnalysis?: TrendAnalysisResult;
};

/**
 * 단일 카테고리에 대한 분석 결과
 */
export type CategoryAnalysisResult = {
  categoryName: string;
  categoryId: string;
  keywords: string[];
  metrics: Record<string, KeywordStats>;
  series: Record<string, KeywordPoint[]>;
};

/**
 * 전체 분석 결과 (여러 카테고리 지원)
 */
export type KeywordAnalysisResult = {
  analysisRunId: number | null;
  categoryId: string; // 대표 카테고리 (첫 번째) - 하위 호환성 유지
  startDate: string;
  endDate: string;
  timeUnit: "month";
  keywords: string[]; // 모든 카테고리의 키워드 통합
  metrics: Record<string, KeywordStats>; // 모든 카테고리의 metrics 통합
  series: Record<string, KeywordPoint[]>; // 모든 카테고리의 series 통합
  // 새로운 필드: 카테고리별 상세 결과
  categoryResults?: CategoryAnalysisResult[];
};

const CATEGORY_TO_CID: Record<string, string> = {
  // Lab UI에서 사용하는 카테고리 라벨 -> 네이버 1분류 CID
  패션의류: "50000000",
  패션잡화: "50000001",
  "화장품/미용": "50000002",
  "디지털/가전": "50000003",
  "가구/인테리어": "50000004",
  "출산/육아": "50000005",
  식품: "50000006",
  "생활/건강": "50000007",
  "스포츠/레저": "50000008",
  자동차용품: "50000009",
  도서: "50005542",
  "완구/취미": "50000011",
  "문구/오피스": "50000012",
  반려동물용품: "50000013",
  "여가/생활편의": "50000014",
  면세점: "50000015",
  // 이전 라벨 호환용
  생활잡화: "50000007",
  생활용품: "50000007",
};

const mapDeviceToApi = (devices: string[]): "" | "pc" | "mo" => {
  const hasPc = devices.includes("PC");
  const hasMo = devices.includes("모바일");
  if (hasPc && hasMo) return "";
  if (hasPc) return "pc";
  if (hasMo) return "mo";
  return "";
};

const mapGenderToApi = (gender: string): "" | "m" | "f" => {
  if (gender === "여성") return "f";
  if (gender === "남성") return "m";
  return "";
};

const mapAgesToApi = (ageBuckets: string[]): string[] => {
  const buckets = ageBuckets.filter((v) => v !== "전체");
  if (buckets.length === 0) return [];
  const map: Record<string, string> = {
    "~12": "10",
    "13-18": "10",
    "19-24": "20",
    "25-29": "20",
    "30-34": "30",
    "35-39": "30",
    "40-44": "40",
    "45-49": "40",
    "50-54": "50",
    "55-59": "50",
    "60+": "60",
  };
  const codes = new Set<string>();
  for (const b of buckets) {
    const code = map[b];
    if (code) codes.add(code);
  }
  return Array.from(codes);
};

/**
 * 시계열 데이터에서 집계 통계를 계산한다.
 * ratio 값 자체는 상대 지표(0~100)이므로, 절대값보다는
 * - 평균 수준
 * - 최근 vs 이전 구간의 변화율
 * - 월별 평균 수준
 * 을 기준으로 성장성과 계절성을 판단한다.
 */
function buildKeywordStats(
  series: Record<string, KeywordPoint[]>,
): Record<string, KeywordStats> {
  const metrics: Record<string, KeywordStats> = {};

  for (const [kw, data] of Object.entries(series)) {
    const sorted = [...data].sort((a, b) => a.period.localeCompare(b.period));
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

  return metrics;
}

/**
 * 단일 카테고리에 대한 Top 키워드 추출 및 분석을 수행한다.
 */
async function analyzeOneCategory({
  categoryName,
  categoryId,
  startDate,
  endDate,
  timeUnit,
  deviceCode,
  genderCode,
  ageCodes,
}: {
  categoryName: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  timeUnit: "month";
  deviceCode: "" | "pc" | "mo";
  genderCode: "" | "m" | "f";
  ageCodes: string[];
}): Promise<CategoryAnalysisResult | null> {
  // 1) 네이버 쇼핑인사이트 Top 키워드 상위 N개 추출
  const { ranks, meta } = await fetchTopKeywords({
    cid: categoryId,
    timeUnit,
    startDate,
    endDate,
    device: deviceCode,
    gender: genderCode,
    age: ageCodes.join(","),
  });

  if (!ranks || ranks.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Datalab][top-keywords] empty ranks", {
        categoryName,
        cid: categoryId,
        startDate,
        endDate,
        timeUnit,
        device: deviceCode,
        gender: genderCode,
        age: ageCodes.join(","),
        meta,
      });
    }
    return null;
  }

  let keywords = ranks
    .slice(0, 10)
    .map((r) => normalizeNaverKeyword(r.keyword))
    .filter((kw, idx, arr) => kw && arr.indexOf(kw) === idx);

  if (process.env.NODE_ENV !== "production" && ranks.length > 0) {
    console.log("[Datalab][top-keywords] normalized sample", {
      categoryName,
      cid: categoryId,
      startDate,
      endDate,
      timeUnit,
      device: deviceCode,
      gender: genderCode,
      age: ageCodes.join(","),
      rawSample: ranks.slice(0, 10).map((r) => r.keyword),
      normalizedKeywords: keywords,
    });
  }

  // normalize 과정에서 모두 빈 문자열이 되어버린 경우, 원본 키워드 사용
  if ((!keywords || keywords.length === 0) && ranks.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[Datalab][top-keywords] normalized keywords empty, falling back to raw keywords",
        {
          categoryName,
          sampleRaw: ranks.slice(0, 10).map((r) => r.keyword),
        },
      );
    }

    keywords = ranks
      .slice(0, 10)
      .map((r) => r.keyword.trim())
      .filter((kw, idx, arr) => kw && arr.indexOf(kw) === idx);
  }

  if (!keywords.length) {
    return null;
  }

  // 2) 카테고리/키워드 트렌드 API 호출로 시계열 + 통계 계산
  const { metrics, series } = await runCategoryKeywordTrendAnalysis({
    categoryId,
    startDate,
    endDate,
    timeUnit,
    deviceCode,
    genderCode,
    ageCodes,
    keywords,
  });

  return {
    categoryName,
    categoryId,
    keywords,
    metrics,
    series,
  };
}

/**
 * 하나의 DataLab 분석 트랜잭션을 수행한다.
 * 여러 카테고리가 선택된 경우, 각 카테고리별로 Top 키워드 추출 및 트렌드 분석을 수행한다.
 *
 * 1) 각 카테고리별로 쇼핑인사이트 Top 키워드 상위 N개를 크롤링한다.
 * 2) 정제된 키워드를 Naver DataLab 카테고리/키워드 API에 넣어
 *    시계열 데이터를 가져온 뒤 성장성·계절성 지표를 계산한다.
 * 3) analysis_runs 테이블에 실행 로그를 남기고,
 *    챗봇이 사용할 수 있도록 요약 결과를 반환한다.
 */
export async function runKeywordAnalysisTransaction(
  params: DatalabParams,
): Promise<KeywordAnalysisResult> {
  const { dateFrom, dateTo, devices, gender, ageBuckets, categories } = params;

  const startDate = dateFrom;
  const endDate = dateTo;
  const timeUnit = "month" as const;

  const deviceCode = mapDeviceToApi(devices);
  const genderCode = mapGenderToApi(gender);
  const ageCodes = mapAgesToApi(ageBuckets);

  // 선택된 카테고리들 처리 (최소 1개 보장)
  const selectedCategories = categories.length > 0 ? categories : ["생활/건강"];

  // 각 카테고리별로 분석 수행
  const categoryResults: CategoryAnalysisResult[] = [];

  for (const categoryName of selectedCategories) {
    const categoryId = CATEGORY_TO_CID[categoryName] ?? "50000007";

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Datalab] Analyzing category: ${categoryName} (${categoryId})`);
    }

    const result = await analyzeOneCategory({
      categoryName,
      categoryId,
      startDate,
      endDate,
      timeUnit,
      deviceCode,
      genderCode,
      ageCodes,
    });

    if (result) {
      categoryResults.push(result);
    }
  }

  // 모든 카테고리에서 키워드를 가져오지 못한 경우
  if (categoryResults.length === 0) {
    throw new Error(
      "선택된 카테고리에서 분석 대상 키워드를 찾지 못했습니다. 기간이나 카테고리를 조정해주세요."
    );
  }

  // 모든 카테고리의 결과를 통합
  const allKeywords: string[] = [];
  const allMetrics: Record<string, KeywordStats> = {};
  const allSeries: Record<string, KeywordPoint[]> = {};

  for (const catResult of categoryResults) {
    // 키워드에 카테고리 표시 추가 (중복 방지)
    for (const kw of catResult.keywords) {
      const keyWithCategory = categoryResults.length > 1
        ? `[${catResult.categoryName}] ${kw}`
        : kw;

      if (!allKeywords.includes(keyWithCategory)) {
        allKeywords.push(keyWithCategory);
      }

      // metrics와 series도 카테고리 표시와 함께 저장
      if (catResult.metrics[kw]) {
        const metricKey = categoryResults.length > 1 ? keyWithCategory : kw;
        allMetrics[metricKey] = {
          ...catResult.metrics[kw],
          keyword: metricKey,
        };
      }

      if (catResult.series[kw]) {
        const seriesKey = categoryResults.length > 1 ? keyWithCategory : kw;
        allSeries[seriesKey] = catResult.series[kw];
      }
    }
  }

  // 대표 카테고리 (첫 번째 성공한 카테고리)
  const primaryCategoryId = categoryResults[0].categoryId;

  // 3) analysis_runs 테이블에 요약 파라미터 + Top 키워드 저장
  let analysisRunId: number | null = null;
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("analysis_runs")
      .insert({
        status: "success",
        date_from: startDate,
        date_to: endDate,
        period_type: "direct",
        device_scope: devices,
        gender_scope: [gender],
        age_buckets: ageBuckets,
        categories,
        top_keywords: allKeywords,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      analysisRunId = data.id as number;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Datalab] Analysis complete:`, {
      categoriesAnalyzed: categoryResults.map(c => c.categoryName),
      totalKeywords: allKeywords.length,
      keywordsByCategory: categoryResults.map(c => ({
        category: c.categoryName,
        count: c.keywords.length,
      })),
    });
  }

  return {
    analysisRunId,
    categoryId: primaryCategoryId,
    startDate,
    endDate,
    timeUnit,
    keywords: allKeywords,
    metrics: allMetrics,
    series: allSeries,
    categoryResults,
  };
}

/**
 * 지정된 키워드 배열을 사용해 카테고리/키워드 트렌드 API를 호출하고,
 * 시계열 데이터와 요약 통계를 계산한다.
 * - Top 키워드 및 사용자 지정 키워드 모두 공통으로 사용하는 내부 헬퍼.
 */
async function runCategoryKeywordTrendAnalysis({
  categoryId,
  startDate,
  endDate,
  timeUnit,
  deviceCode,
  genderCode,
  ageCodes,
  keywords,
}: {
  categoryId: string;
  startDate: string;
  endDate: string;
  timeUnit: "month";
  deviceCode: "" | "pc" | "mo";
  genderCode: "" | "m" | "f";
  ageCodes: string[];
  keywords: string[];
}): Promise<{
  metrics: Record<string, KeywordStats>;
  series: Record<string, KeywordPoint[]>;
}> {
  const chunkSize = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < keywords.length; i += chunkSize) {
    chunks.push(keywords.slice(i, i + chunkSize));
  }

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
      device: deviceCode,
      gender: genderCode,
      ages: ageCodes,
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

  const metrics = buildKeywordStats(series);

  // ML 시계열 분석(선형회귀, Holt-Winters, Mann-Kendall 등)을 각 키워드에 적용해
  // trendAnalysis 필드에 저장한다. 키워드 툴과 Lab 챗봇 양쪽에서 동일한 구조를 사용한다.
  for (const [kw, points] of Object.entries(series)) {
    const dataPoints: DataPoint[] = points.map((p) => ({
      period: p.period,
      ratio: p.ratio,
    }));
    metrics[kw].trendAnalysis = analyzeAdvancedTrend(dataPoints);
  }

  return {
    metrics,
    series,
  };
}

/**
 * 사용자가 지정한 키워드 배열을 기준으로 DataLab 분석 트랜잭션을 수행한다.
 * 여러 카테고리가 선택된 경우, 각 카테고리별로 동일한 키워드에 대한 트렌드 분석을 수행한다.
 * - Top 키워드를 전혀 사용하지 않고, 전달된 키워드만 카테고리/키워드 API에 넣어 분석한다.
 */
export async function runKeywordAnalysisForExplicitKeywords(
  params: DatalabParams,
  explicitKeywords: string[],
): Promise<KeywordAnalysisResult> {
  const { dateFrom, dateTo, devices, gender, ageBuckets, categories } = params;

  const startDate = dateFrom;
  const endDate = dateTo;
  const timeUnit = "month" as const;

  const deviceCode = mapDeviceToApi(devices);
  const genderCode = mapGenderToApi(gender);
  const ageCodes = mapAgesToApi(ageBuckets);

  let keywords = explicitKeywords
    .map((k) => k.trim())
    .filter((k, idx, arr) => k.length > 0 && arr.indexOf(k) === idx);

  // DataLab 카테고리/키워드 API 특성상 한 번에 너무 많은 키워드를 넣으면 응답이 불안정할 수 있어,
  // 최대 10개까지만 사용한다.
  keywords = keywords.slice(0, 10);

  if (!keywords.length) {
    throw new Error("분석할 키워드를 찾지 못했습니다. 최소 1개 이상의 키워드를 선택해주세요.");
  }

  // 선택된 카테고리들 처리 (최소 1개 보장)
  const selectedCategories = categories.length > 0 ? categories : ["생활/건강"];

  // 각 카테고리별로 분석 수행
  const categoryResults: CategoryAnalysisResult[] = [];

  for (const categoryName of selectedCategories) {
    const categoryId = CATEGORY_TO_CID[categoryName] ?? "50000007";

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Datalab][explicit] Analyzing category: ${categoryName} (${categoryId}) with keywords:`, keywords);
    }

    try {
      const { metrics, series } = await runCategoryKeywordTrendAnalysis({
        categoryId,
        startDate,
        endDate,
        timeUnit,
        deviceCode,
        genderCode,
        ageCodes,
        keywords,
      });

      categoryResults.push({
        categoryName,
        categoryId,
        keywords,
        metrics,
        series,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[Datalab][explicit] Error analyzing category ${categoryName}:`, err);
      }
      // 개별 카테고리 실패는 무시하고 계속 진행
    }
  }

  // 모든 카테고리에서 분석 실패한 경우
  if (categoryResults.length === 0) {
    throw new Error(
      "선택된 카테고리에서 키워드 분석에 실패했습니다. 키워드나 카테고리를 조정해주세요."
    );
  }

  // 모든 카테고리의 결과를 통합
  const allKeywords: string[] = [];
  const allMetrics: Record<string, KeywordStats> = {};
  const allSeries: Record<string, KeywordPoint[]> = {};

  for (const catResult of categoryResults) {
    for (const kw of Object.keys(catResult.metrics)) {
      const keyWithCategory = categoryResults.length > 1
        ? `[${catResult.categoryName}] ${kw}`
        : kw;

      if (!allKeywords.includes(keyWithCategory)) {
        allKeywords.push(keyWithCategory);
      }

      if (catResult.metrics[kw]) {
        const metricKey = categoryResults.length > 1 ? keyWithCategory : kw;
        allMetrics[metricKey] = {
          ...catResult.metrics[kw],
          keyword: metricKey,
        };
      }

      if (catResult.series[kw]) {
        const seriesKey = categoryResults.length > 1 ? keyWithCategory : kw;
        allSeries[seriesKey] = catResult.series[kw];
      }
    }
  }

  // 대표 카테고리 (첫 번째 성공한 카테고리)
  const primaryCategoryId = categoryResults[0].categoryId;

  let analysisRunId: number | null = null;
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("analysis_runs")
      .insert({
        status: "success",
        date_from: startDate,
        date_to: endDate,
        period_type: "direct",
        device_scope: devices,
        gender_scope: [gender],
        age_buckets: ageBuckets,
        categories,
        top_keywords: allKeywords,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      analysisRunId = data.id as number;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Datalab][explicit] Analysis complete:`, {
      categoriesAnalyzed: categoryResults.map(c => c.categoryName),
      totalKeywords: allKeywords.length,
      keywordsByCategory: categoryResults.map(c => ({
        category: c.categoryName,
        count: Object.keys(c.metrics).length,
      })),
    });
  }

  return {
    analysisRunId,
    categoryId: primaryCategoryId,
    startDate,
    endDate,
    timeUnit,
    keywords: allKeywords,
    metrics: allMetrics,
    series: allSeries,
    categoryResults,
  };
}
