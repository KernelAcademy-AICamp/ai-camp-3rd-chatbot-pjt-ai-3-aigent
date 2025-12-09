"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  ReferenceLine,
} from "recharts";

type TrendAnalysisResult = {
  linearRegression: {
    slope: number;
    intercept: number;
    rSquared: number;
    trendDirection: string;
    predictedNext: number;
  };
  exponentialSmoothing: {
    smoothedValues: number[];
    lastSmoothed: number;
    trend: number;
  };
  holtWinters: {
    level: number;
    trend: number;
    seasonalFactors: number[];
    forecast: number[];
    seasonalStrength: number;
  };
  mannKendall: {
    tau: number;
    pValue: number;
    significant: boolean;
    trendDescription: string;
  };
  volatility: {
    standardDeviation: number;
    coefficientOfVariation: number;
    volatilityLevel: string;
  };
  overallScore: {
    growthScore: number;
    stabilityScore: number;
    seasonalityScore: number;
    recommendation: string;
  };
};

type KeywordMetrics = {
  keyword: string;
  periods: number;
  avgRatio: number;
  recentAvgRatio: number;
  prevAvgRatio: number | null;
  growthRatio: number | null;
  peakMonths: number[];
  trendAnalysis?: TrendAnalysisResult;
};

type SeriesPoint = {
  period: string;
  ratio: number;
};

// 색상 팔레트
const COLORS = {
  primary: "#f97316",
  secondary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
  gray: "#6b7280",
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  highly_recommended: COLORS.success,
  recommended: "#22c55e",
  neutral: COLORS.warning,
  caution: "#f97316",
  not_recommended: COLORS.danger,
};

const RECOMMENDATION_KOR: Record<string, string> = {
  highly_recommended: "적극 추천",
  recommended: "추천",
  neutral: "보통",
  caution: "주의",
  not_recommended: "비추천",
};

/**
 * 1. 키워드별 성장점수 비교 차트
 */
export function GrowthScoreComparisonChart({
  metrics,
}: {
  metrics: Record<string, KeywordMetrics>;
}) {
  const data = Object.values(metrics)
    .filter((m) => m.trendAnalysis)
    .map((m) => ({
      keyword: m.keyword.length > 8 ? m.keyword.slice(0, 8) + "..." : m.keyword,
      fullKeyword: m.keyword,
      growthScore: m.trendAnalysis?.overallScore.growthScore ?? 0,
      stabilityScore: m.trendAnalysis?.overallScore.stabilityScore ?? 0,
      recommendation: m.trendAnalysis?.overallScore.recommendation ?? "neutral",
    }))
    .sort((a, b) => b.growthScore - a.growthScore);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        키워드별 성장점수 비교
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis
            dataKey="keyword"
            type="category"
            tick={{ fontSize: 11 }}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg text-xs">
                  <p className="font-semibold">{d.fullKeyword}</p>
                  <p>성장점수: {d.growthScore.toFixed(0)}/100</p>
                  <p>안정성: {d.stabilityScore.toFixed(0)}/100</p>
                  <p>
                    평가:{" "}
                    <span
                      style={{ color: RECOMMENDATION_COLORS[d.recommendation] }}
                    >
                      {RECOMMENDATION_KOR[d.recommendation]}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="growthScore" name="성장점수">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={RECOMMENDATION_COLORS[entry.recommendation]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-slate-500">
        성장점수가 높을수록 상승 트렌드가 강한 키워드입니다. (60점 이상: 상승추세)
      </p>
    </div>
  );
}

/**
 * 2. 시계열 + 예측 그래프 (실제 데이터 + Holt-Winters 예측)
 */
export function TimeSeriesForecastChart({
  keyword,
  series,
  metrics,
  timeUnit,
}: {
  keyword: string;
  series: SeriesPoint[];
  metrics: KeywordMetrics;
  timeUnit: string;
}) {
  const ta = metrics.trendAnalysis;
  if (!ta || !series || series.length === 0) return null;

  const formatDate = (period: string) => {
    if (timeUnit === "month") return period.slice(0, 7);
    return period.slice(5);
  };

  // 실제 데이터
  const actualData = series.map((p, idx) => ({
    period: formatDate(p.period),
    actual: p.ratio,
    smoothed: ta.exponentialSmoothing.smoothedValues[idx] ?? null,
    // 선형회귀 추세선
    trend: ta.linearRegression.slope * idx + ta.linearRegression.intercept,
  }));

  // 예측 데이터 추가
  const lastPeriod = series[series.length - 1]?.period ?? "";
  const forecastData = ta.holtWinters.forecast.map((f, idx) => {
    const nextPeriod = getNextPeriod(lastPeriod, idx + 1, timeUnit);
    return {
      period: formatDate(nextPeriod),
      actual: null,
      smoothed: null,
      trend: null,
      forecast: f,
    };
  });

  const chartData = [...actualData, ...forecastData];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {keyword} - 시계열 분석 & 예측
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{
              backgroundColor:
                RECOMMENDATION_COLORS[ta.overallScore.recommendation],
            }}
          >
            {RECOMMENDATION_KOR[ta.overallScore.recommendation]}
          </span>
          <span className="text-[10px] text-slate-500">
            R² = {ta.linearRegression.rSquared.toFixed(2)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg text-xs">
                  <p className="font-semibold mb-1">{label}</p>
                  {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }}>
                      {p.name}: {Number(p.value).toFixed(1)}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* 실제 데이터 영역 */}
          <Area
            type="monotone"
            dataKey="actual"
            name="실제값"
            fill={COLORS.primary}
            fillOpacity={0.1}
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />

          {/* 지수평활 */}
          <Line
            type="monotone"
            dataKey="smoothed"
            name="지수평활"
            stroke={COLORS.secondary}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            connectNulls={false}
          />

          {/* 선형회귀 추세선 */}
          <Line
            type="linear"
            dataKey="trend"
            name="선형추세"
            stroke={COLORS.gray}
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />

          {/* 예측값 */}
          <Line
            type="monotone"
            dataKey="forecast"
            name="Holt-Winters 예측"
            stroke={COLORS.success}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: COLORS.success }}
            connectNulls={false}
          />

          {/* 예측 구간 구분선 */}
          <ReferenceLine
            x={formatDate(lastPeriod)}
            stroke={COLORS.purple}
            strokeDasharray="3 3"
            label={{
              value: "예측",
              position: "top",
              fontSize: 10,
              fill: COLORS.purple,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-500">트렌드 방향</p>
          <p className="font-semibold text-slate-900">
            {getTrendDirectionKor(ta.linearRegression.trendDirection)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-500">Mann-Kendall</p>
          <p className="font-semibold text-slate-900">
            {ta.mannKendall.significant
              ? ta.mannKendall.tau > 0
                ? "통계적 상승"
                : "통계적 하락"
              : "트렌드 미검출"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-500">향후 예측</p>
          <p className="font-semibold text-slate-900">
            {ta.holtWinters.forecast.map((f) => f.toFixed(0)).join(" → ")}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-500">변동성</p>
          <p className="font-semibold text-slate-900">
            {getVolatilityKor(ta.volatility.volatilityLevel)} (CV:{" "}
            {(ta.volatility.coefficientOfVariation * 100).toFixed(0)}%)
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. 종합 점수 레이더 차트
 */
export function OverallScoreRadarChart({
  metrics,
}: {
  metrics: Record<string, KeywordMetrics>;
}) {
  const keywords = Object.values(metrics).filter((m) => m.trendAnalysis);
  if (keywords.length === 0) return null;

  // 상위 5개만 표시
  const topKeywords = keywords
    .sort(
      (a, b) =>
        (b.trendAnalysis?.overallScore.growthScore ?? 0) -
        (a.trendAnalysis?.overallScore.growthScore ?? 0)
    )
    .slice(0, 5);

  const radarData = [
    {
      metric: "성장성",
      ...Object.fromEntries(
        topKeywords.map((k) => [
          k.keyword,
          k.trendAnalysis?.overallScore.growthScore ?? 0,
        ])
      ),
    },
    {
      metric: "안정성",
      ...Object.fromEntries(
        topKeywords.map((k) => [
          k.keyword,
          k.trendAnalysis?.overallScore.stabilityScore ?? 0,
        ])
      ),
    },
    {
      metric: "계절성",
      ...Object.fromEntries(
        topKeywords.map((k) => [
          k.keyword,
          k.trendAnalysis?.overallScore.seasonalityScore ?? 0,
        ])
      ),
    },
    {
      metric: "R² 적합도",
      ...Object.fromEntries(
        topKeywords.map((k) => [
          k.keyword,
          (k.trendAnalysis?.linearRegression.rSquared ?? 0) * 100,
        ])
      ),
    },
    {
      metric: "트렌드 강도",
      ...Object.fromEntries(
        topKeywords.map((k) => [
          k.keyword,
          Math.abs(k.trendAnalysis?.mannKendall.tau ?? 0) * 100,
        ])
      ),
    },
  ];

  const radarColors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.purple,
    COLORS.pink,
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        상위 키워드 종합 비교 (레이더)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9 }}
          />
          {topKeywords.map((k, idx) => (
            <Radar
              key={k.keyword}
              name={k.keyword}
              dataKey={k.keyword}
              stroke={radarColors[idx]}
              fill={radarColors[idx]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 4. 상승추세 키워드 요약 카드
 */
export function RisingKeywordsSummary({
  metrics,
}: {
  metrics: Record<string, KeywordMetrics>;
}) {
  const risingKeywords = Object.values(metrics)
    .filter(
      (m) => (m.trendAnalysis?.overallScore.growthScore ?? 0) >= 60
    )
    .sort(
      (a, b) =>
        (b.trendAnalysis?.overallScore.growthScore ?? 0) -
        (a.trendAnalysis?.overallScore.growthScore ?? 0)
    );

  if (risingKeywords.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-amber-900">
          ML 분석 결과: 상승추세 키워드 없음
        </h3>
        <p className="mt-1 text-[11px] text-amber-700">
          현재 분석된 키워드 중 성장점수 60점 이상인 키워드가 없습니다. 다른
          카테고리나 기간을 선택해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-sm font-semibold text-emerald-900 mb-3">
        ML 분석 기반 상승추세 키워드 ({risingKeywords.length}개)
      </h3>
      <div className="grid gap-2 md:grid-cols-2">
        {risingKeywords.map((m) => {
          const ta = m.trendAnalysis!;
          return (
            <div
              key={m.keyword}
              className="rounded-lg bg-white border border-emerald-100 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm">
                  {m.keyword}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{
                    backgroundColor:
                      RECOMMENDATION_COLORS[ta.overallScore.recommendation],
                  }}
                >
                  {RECOMMENDATION_KOR[ta.overallScore.recommendation]}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <p className="text-slate-500">성장점수</p>
                  <p className="font-semibold text-emerald-600">
                    {ta.overallScore.growthScore.toFixed(0)}/100
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">안정성</p>
                  <p className="font-semibold text-slate-700">
                    {ta.overallScore.stabilityScore.toFixed(0)}/100
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Mann-Kendall</p>
                  <p className="font-semibold text-slate-700">
                    {ta.mannKendall.significant ? (
                      <span className="text-emerald-600">유의미</span>
                    ) : (
                      "미검출"
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-600">
                향후 예측: {ta.holtWinters.forecast.map((f) => f.toFixed(0)).join(" → ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 5. 계절성 분석 차트
 */
export function SeasonalityChart({
  metrics,
}: {
  metrics: Record<string, KeywordMetrics>;
}) {
  const keywordsWithSeasonality = Object.values(metrics).filter(
    (m) => (m.trendAnalysis?.holtWinters.seasonalStrength ?? 0) > 0.1
  );

  if (keywordsWithSeasonality.length === 0) return null;

  // 월별 계절 지수 데이터 생성
  const months = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const seasonalData = months.map((month, idx) => {
    const row: Record<string, string | number> = { month };
    keywordsWithSeasonality.slice(0, 5).forEach((m) => {
      const factors = m.trendAnalysis?.holtWinters.seasonalFactors ?? [];
      row[m.keyword] = factors[idx] ? (factors[idx] - 1) * 100 : 0;
    });
    return row;
  });

  const lineColors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.purple,
    COLORS.pink,
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        월별 계절성 패턴 (계절 지수 편차 %)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={seasonalData} margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
          />
          <Tooltip
            formatter={(value: number) =>
              `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          {keywordsWithSeasonality.slice(0, 5).map((m, idx) => (
            <Line
              key={m.keyword}
              type="monotone"
              dataKey={m.keyword}
              stroke={lineColors[idx]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-slate-500">
        0% 기준으로 양수면 해당 월에 평균보다 검색량이 높고, 음수면 낮습니다.
      </p>
    </div>
  );
}

// Helper functions
function getNextPeriod(
  currentPeriod: string,
  offset: number,
  timeUnit: string
): string {
  const date = new Date(currentPeriod);
  if (timeUnit === "month") {
    date.setMonth(date.getMonth() + offset);
  } else if (timeUnit === "week") {
    date.setDate(date.getDate() + offset * 7);
  } else {
    date.setDate(date.getDate() + offset);
  }
  return date.toISOString().slice(0, 10);
}

function getTrendDirectionKor(direction: string): string {
  const map: Record<string, string> = {
    strong_up: "강한 상승",
    moderate_up: "완만한 상승",
    stable: "보합",
    moderate_down: "완만한 하락",
    strong_down: "강한 하락",
  };
  return map[direction] ?? direction;
}

function getVolatilityKor(level: string): string {
  const map: Record<string, string> = {
    low: "낮음",
    medium: "보통",
    high: "높음",
  };
  return map[level] ?? level;
}
