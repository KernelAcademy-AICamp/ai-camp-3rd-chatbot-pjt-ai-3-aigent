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
  analyzeTrend,
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

export type KeywordAnalysisResult = {
  analysisRunId: number | null;
  categoryId: string;
  startDate: string;
  endDate: string;
  timeUnit: "month";
  keywords: string[];
  metrics: Record<string, KeywordStats>;
  series: Record<string, KeywordPoint[]>;
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
 * 하나의 DataLab 분석 트랜잭션을 수행한다.
 *
 * 1) 카테고리/기간/타깃 조건을 바탕으로
 *    쇼핑인사이트 Top 키워드 상위 N개를 크롤링한다.
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

  const firstCategory = categories[0] ?? "생활잡화";
  const categoryId = CATEGORY_TO_CID[firstCategory] ?? "50000007";

  const deviceCode = mapDeviceToApi(devices);
  const genderCode = mapGenderToApi(gender);
  const ageCodes = mapAgesToApi(ageBuckets);

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
      // 테스트 페이지에서는 잘 동작하지만, 특정 환경/기간 조합에서
      // Top 키워드가 비어 있는 경우가 있어 디버깅을 쉽게 하기 위해 남겨둡니다.
      console.error("[Datalab][top-keywords] empty ranks", {
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
  }

  let keywords = ranks
    .slice(0, 10)
    .map((r) => normalizeNaverKeyword(r.keyword))
    .filter((kw, idx, arr) => kw && arr.indexOf(kw) === idx);

  if (process.env.NODE_ENV !== "production" && ranks && ranks.length > 0) {
    console.log("[Datalab][top-keywords] normalized sample", {
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

  // 혹시 normalize 과정에서 모두 빈 문자열이 되어버린 경우,
  // 원본 키워드를 한 번 더 사용해본다.
  if ((!keywords || keywords.length === 0) && ranks && ranks.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[Datalab][top-keywords] normalized keywords empty, falling back to raw keywords",
        {
          sampleRaw: ranks.slice(0, 10).map((r) => r.keyword),
        },
      );
    }

    keywords = ranks
      .slice(0, 10)
      .map((r) => r.keyword.trim())
      .filter((kw, idx, arr) => kw && arr.indexOf(kw) === idx);
  }

  // Top 키워드를 하나도 가져오지 못했다면 트랜잭션을 실패로 처리.
  // 프론트/챗봇에서는 이 에러 메시지를 보고 기간/카테고리 조정을 유도한다.
  if (!keywords.length) {
    throw new Error("네이버 Top 키워드에서 분석 대상 키워드를 찾지 못했습니다.");
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
        top_keywords: keywords,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      analysisRunId = data.id as number;
    }
  }

  return {
    analysisRunId,
    categoryId,
    startDate,
    endDate,
    timeUnit,
    keywords,
    metrics,
    series,
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
    metrics[kw].trendAnalysis = analyzeTrend(dataPoints);
  }

  return {
    metrics,
    series,
  };
}

/**
 * 사용자가 지정한 키워드 배열을 기준으로 DataLab 분석 트랜잭션을 수행한다.
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

  const firstCategory = categories[0] ?? "생활잡화";
  const categoryId = CATEGORY_TO_CID[firstCategory] ?? "50000007";

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
        top_keywords: keywords,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      analysisRunId = data.id as number;
    }
  }

  return {
    analysisRunId,
    categoryId,
    startDate,
    endDate,
    timeUnit,
    keywords,
    metrics,
    series,
  };
}
