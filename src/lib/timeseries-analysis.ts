/**
 * 시계열 분석 유틸리티
 * - 선형회귀 (Linear Regression)
 * - 지수평활법 (Exponential Smoothing)
 * - Holt-Winters 모델 (트렌드 + 계절성)
 * - Mann-Kendall 트렌드 검정
 */

export type DataPoint = {
  period: string;
  ratio: number;
};

export type TrendAnalysisResult = {
  // 선형회귀 결과
  linearRegression: {
    slope: number; // 기울기 (양수면 상승, 음수면 하락)
    intercept: number;
    rSquared: number; // 결정계수 (0~1, 1에 가까울수록 선형 트렌드가 강함)
    trendDirection: "strong_up" | "moderate_up" | "stable" | "moderate_down" | "strong_down";
    predictedNext: number; // 다음 기간 예측값
  };
  // 지수평활법 결과
  exponentialSmoothing: {
    smoothedValues: number[];
    lastSmoothed: number;
    trend: number; // 최근 트렌드 방향
  };
  // Holt-Winters 결과 (트렌드 + 계절성)
  holtWinters: {
    level: number;
    trend: number;
    seasonalFactors: number[];
    forecast: number[]; // 다음 3개 기간 예측
    seasonalStrength: number; // 계절성 강도 (0~1)
  };
  // Mann-Kendall 트렌드 검정
  mannKendall: {
    tau: number; // -1 ~ 1, 양수면 상승 트렌드
    pValue: number; // p-value (0.05 미만이면 통계적으로 유의)
    significant: boolean;
    trendDescription: string;
  };
  // 변동성 분석
  volatility: {
    standardDeviation: number;
    coefficientOfVariation: number; // 변동계수 (표준편차/평균)
    volatilityLevel: "low" | "medium" | "high";
  };
  // 종합 점수
  overallScore: {
    growthScore: number; // 0-100, 높을수록 성장성 좋음
    stabilityScore: number; // 0-100, 높을수록 안정적
    seasonalityScore: number; // 0-100, 높을수록 계절성 강함
    recommendation: "highly_recommended" | "recommended" | "neutral" | "caution" | "not_recommended";
  };
};

/**
 * 선형회귀 분석
 */
export function linearRegression(data: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  predicted: number[];
} {
  const n = data.length;
  if (n < 2) {
    return { slope: 0, intercept: data[0] || 0, rSquared: 0, predicted: data };
  }

  // x = 0, 1, 2, ..., n-1
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += (i - xMean) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // R-squared 계산
  let ssRes = 0;
  const predicted: number[] = [];
  for (let i = 0; i < n; i++) {
    const pred = slope * i + intercept;
    predicted.push(pred);
    ssRes += (data[i] - pred) ** 2;
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared, predicted };
}

/**
 * 지수평활법 (Simple Exponential Smoothing)
 */
export function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3
): { smoothed: number[]; trend: number } {
  if (data.length === 0) return { smoothed: [], trend: 0 };

  const smoothed: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }

  // 최근 트렌드 계산 (마지막 3개 평활값의 변화율)
  const recent = smoothed.slice(-3);
  const trend =
    recent.length >= 2
      ? (recent[recent.length - 1] - recent[0]) / recent.length
      : 0;

  return { smoothed, trend };
}

/**
 * Holt-Winters 이중 지수평활법 (트렌드 포함)
 */
export function holtWintersDouble(
  data: number[],
  alpha: number = 0.3,
  beta: number = 0.1
): {
  level: number;
  trend: number;
  forecast: number[];
} {
  const n = data.length;
  if (n < 2) {
    return { level: data[0] || 0, trend: 0, forecast: [data[0] || 0] };
  }

  // 초기값
  let level = data[0];
  let trend = data[1] - data[0];

  for (let i = 1; i < n; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // 향후 3개 기간 예측
  const forecast: number[] = [];
  for (let h = 1; h <= 3; h++) {
    forecast.push(level + h * trend);
  }

  return { level, trend, forecast };
}

/**
 * Holt-Winters 삼중 지수평활법 (트렌드 + 계절성)
 * seasonLength: 계절 주기 (월별 데이터면 12)
 */
export function holtWintersTriple(
  data: number[],
  seasonLength: number = 12,
  alpha: number = 0.3,
  beta: number = 0.1,
  gamma: number = 0.1
): {
  level: number;
  trend: number;
  seasonalFactors: number[];
  forecast: number[];
  seasonalStrength: number;
} {
  const n = data.length;

  // 데이터가 충분하지 않으면 이중 지수평활로 대체
  if (n < seasonLength * 2) {
    const hw = holtWintersDouble(data, alpha, beta);
    return {
      ...hw,
      seasonalFactors: Array(seasonLength).fill(1),
      seasonalStrength: 0,
    };
  }

  // 초기 계절 지수 계산
  const seasonalFactors: number[] = [];
  const firstCycleAvg =
    data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;

  for (let i = 0; i < seasonLength; i++) {
    seasonalFactors.push(
      firstCycleAvg > 0 ? data[i] / firstCycleAvg : 1
    );
  }

  // 초기 레벨과 트렌드
  let level =
    data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
  let trend =
    (data
      .slice(seasonLength, seasonLength * 2)
      .reduce((a, b) => a + b, 0) /
      seasonLength -
      level) /
    seasonLength;

  // 업데이트
  for (let i = seasonLength; i < n; i++) {
    const seasonIdx = i % seasonLength;
    const prevLevel = level;
    const prevSeason = seasonalFactors[seasonIdx];

    level =
      alpha * (data[i] / prevSeason) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonalFactors[seasonIdx] =
      gamma * (data[i] / level) + (1 - gamma) * prevSeason;
  }

  // 향후 3개 기간 예측
  const forecast: number[] = [];
  for (let h = 1; h <= 3; h++) {
    const seasonIdx = (n + h - 1) % seasonLength;
    forecast.push((level + h * trend) * seasonalFactors[seasonIdx]);
  }

  // 계절성 강도 계산
  const seasonalVariance =
    seasonalFactors.reduce((acc, s) => acc + (s - 1) ** 2, 0) /
    seasonLength;
  const seasonalStrength = Math.min(1, Math.sqrt(seasonalVariance) * 2);

  return { level, trend, seasonalFactors, forecast, seasonalStrength };
}

/**
 * Mann-Kendall 트렌드 검정
 * 비모수적 방법으로 시계열의 단조 트렌드 유무를 검정
 */
export function mannKendallTest(data: number[]): {
  tau: number;
  s: number;
  pValue: number;
  significant: boolean;
  direction: "increasing" | "decreasing" | "no_trend";
} {
  const n = data.length;
  if (n < 4) {
    return {
      tau: 0,
      s: 0,
      pValue: 1,
      significant: false,
      direction: "no_trend",
    };
  }

  // S 통계량 계산
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      if (data[j] > data[i]) s += 1;
      else if (data[j] < data[i]) s -= 1;
    }
  }

  // Kendall's tau
  const tau = (2 * s) / (n * (n - 1));

  // 분산 계산 (동률 무시 간소화 버전)
  const variance = (n * (n - 1) * (2 * n + 5)) / 18;
  const stdDev = Math.sqrt(variance);

  // Z-score
  let z = 0;
  if (s > 0) z = (s - 1) / stdDev;
  else if (s < 0) z = (s + 1) / stdDev;

  // 양측 p-value (정규 근사)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  const significant = pValue < 0.05;
  const direction =
    significant && tau > 0
      ? "increasing"
      : significant && tau < 0
        ? "decreasing"
        : "no_trend";

  return { tau, s, pValue, significant, direction };
}

/**
 * 표준정규분포 CDF 근사
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * 변동성 분석
 */
export function analyzeVolatility(data: number[]): {
  mean: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  volatilityLevel: "low" | "medium" | "high";
} {
  const n = data.length;
  if (n === 0) {
    return {
      mean: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      volatilityLevel: "low",
    };
  }

  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;

  const volatilityLevel =
    coefficientOfVariation < 0.15
      ? "low"
      : coefficientOfVariation < 0.35
        ? "medium"
        : "high";

  return { mean, standardDeviation, coefficientOfVariation, volatilityLevel };
}

/**
 * 트렌드 방향 결정
 */
function determineTrendDirection(
  slope: number,
  rSquared: number,
  mean: number
): "strong_up" | "moderate_up" | "stable" | "moderate_down" | "strong_down" {
  // 정규화된 기울기 (평균 대비)
  const normalizedSlope = mean > 0 ? slope / mean : slope;

  if (rSquared < 0.1) return "stable"; // 선형성이 낮으면 안정

  if (normalizedSlope > 0.05) return "strong_up";
  if (normalizedSlope > 0.02) return "moderate_up";
  if (normalizedSlope < -0.05) return "strong_down";
  if (normalizedSlope < -0.02) return "moderate_down";
  return "stable";
}

/**
 * 종합 트렌드 분석
 */
export function analyzeTrend(dataPoints: DataPoint[]): TrendAnalysisResult {
  const sortedData = [...dataPoints].sort((a, b) =>
    a.period.localeCompare(b.period)
  );
  const data = sortedData.map((d) => d.ratio);

  // 데이터가 부족한 경우
  if (data.length < 3) {
    return createEmptyResult(data);
  }

  // 1. 선형회귀
  const lr = linearRegression(data);
  const volatility = analyzeVolatility(data);
  const trendDirection = determineTrendDirection(
    lr.slope,
    lr.rSquared,
    volatility.mean
  );

  // 2. 지수평활법
  const es = exponentialSmoothing(data);

  // 3. Holt-Winters (계절성 고려)
  const seasonLength = Math.min(12, Math.floor(data.length / 2));
  const hw =
    data.length >= 6
      ? holtWintersTriple(data, seasonLength)
      : {
          ...holtWintersDouble(data),
          seasonalFactors: Array(seasonLength).fill(1),
          seasonalStrength: 0,
        };

  // 4. Mann-Kendall 검정
  const mk = mannKendallTest(data);
  const mkDescription = mk.significant
    ? mk.direction === "increasing"
      ? "통계적으로 유의한 상승 트렌드"
      : mk.direction === "decreasing"
        ? "통계적으로 유의한 하락 트렌드"
        : "명확한 트렌드 없음"
    : "명확한 트렌드 없음 (p > 0.05)";

  // 5. 종합 점수 계산
  const growthScore = calculateGrowthScore(lr, mk, hw);
  const stabilityScore = calculateStabilityScore(volatility, lr.rSquared);
  const seasonalityScore = hw.seasonalStrength * 100;
  const recommendation = determineRecommendation(
    growthScore,
    stabilityScore,
    mk
  );

  return {
    linearRegression: {
      slope: lr.slope,
      intercept: lr.intercept,
      rSquared: lr.rSquared,
      trendDirection,
      predictedNext: lr.slope * data.length + lr.intercept,
    },
    exponentialSmoothing: {
      smoothedValues: es.smoothed,
      lastSmoothed: es.smoothed[es.smoothed.length - 1] || 0,
      trend: es.trend,
    },
    holtWinters: {
      level: hw.level,
      trend: hw.trend,
      seasonalFactors: hw.seasonalFactors,
      forecast: hw.forecast,
      seasonalStrength: hw.seasonalStrength,
    },
    mannKendall: {
      tau: mk.tau,
      pValue: mk.pValue,
      significant: mk.significant,
      trendDescription: mkDescription,
    },
    volatility: {
      standardDeviation: volatility.standardDeviation,
      coefficientOfVariation: volatility.coefficientOfVariation,
      volatilityLevel: volatility.volatilityLevel,
    },
    overallScore: {
      growthScore,
      stabilityScore,
      seasonalityScore,
      recommendation,
    },
  };
}

function calculateGrowthScore(
  lr: ReturnType<typeof linearRegression>,
  mk: ReturnType<typeof mannKendallTest>,
  hw: ReturnType<typeof holtWintersTriple>
): number {
  let score = 50; // 기본 점수

  // 선형회귀 기울기 반영 (최대 ±30점)
  if (lr.rSquared > 0.1) {
    score += Math.min(30, Math.max(-30, lr.slope * 3));
  }

  // Mann-Kendall 반영 (최대 ±20점)
  if (mk.significant) {
    score += mk.tau > 0 ? 20 : -20;
  }

  // Holt-Winters 트렌드 반영 (최대 ±10점)
  score += Math.min(10, Math.max(-10, hw.trend * 10));

  return Math.max(0, Math.min(100, score));
}

function calculateStabilityScore(
  volatility: ReturnType<typeof analyzeVolatility>,
  rSquared: number
): number {
  // 변동성이 낮을수록, R-squared가 높을수록 안정적
  const cvScore = Math.max(0, 100 - volatility.coefficientOfVariation * 200);
  const rScore = rSquared * 50;

  return Math.min(100, (cvScore + rScore) / 1.5);
}

function determineRecommendation(
  growthScore: number,
  stabilityScore: number,
  mk: ReturnType<typeof mannKendallTest>
): "highly_recommended" | "recommended" | "neutral" | "caution" | "not_recommended" {
  const combined = growthScore * 0.6 + stabilityScore * 0.4;

  if (combined >= 70 && mk.significant && mk.direction === "increasing") {
    return "highly_recommended";
  }
  if (combined >= 60) return "recommended";
  if (combined >= 40) return "neutral";
  if (combined >= 25) return "caution";
  return "not_recommended";
}

function createEmptyResult(data: number[]): TrendAnalysisResult {
  const mean = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;

  return {
    linearRegression: {
      slope: 0,
      intercept: mean,
      rSquared: 0,
      trendDirection: "stable",
      predictedNext: mean,
    },
    exponentialSmoothing: {
      smoothedValues: data,
      lastSmoothed: data[data.length - 1] || 0,
      trend: 0,
    },
    holtWinters: {
      level: mean,
      trend: 0,
      seasonalFactors: [],
      forecast: [mean, mean, mean],
      seasonalStrength: 0,
    },
    mannKendall: {
      tau: 0,
      pValue: 1,
      significant: false,
      trendDescription: "데이터 부족",
    },
    volatility: {
      standardDeviation: 0,
      coefficientOfVariation: 0,
      volatilityLevel: "low",
    },
    overallScore: {
      growthScore: 50,
      stabilityScore: 50,
      seasonalityScore: 0,
      recommendation: "neutral",
    },
  };
}

/**
 * 트렌드 분석 결과를 한국어 요약으로 변환
 */
export function formatTrendSummary(
  keyword: string,
  result: TrendAnalysisResult
): string {
  const { linearRegression: lr, mannKendall: mk, holtWinters: hw, volatility, overallScore } = result;

  const trendKor: Record<string, string> = {
    strong_up: "강한 상승세",
    moderate_up: "완만한 상승세",
    stable: "보합세",
    moderate_down: "완만한 하락세",
    strong_down: "강한 하락세",
  };

  const recKor: Record<string, string> = {
    highly_recommended: "적극 추천",
    recommended: "추천",
    neutral: "보통",
    caution: "주의",
    not_recommended: "비추천",
  };

  const volKor: Record<string, string> = {
    low: "낮음",
    medium: "보통",
    high: "높음",
  };

  const lines = [
    `키워드: ${keyword}`,
    `트렌드: ${trendKor[lr.trendDirection]} (R²=${lr.rSquared.toFixed(2)})`,
    `Mann-Kendall: ${mk.trendDescription}`,
    `향후 예측: ${hw.forecast.map((f) => f.toFixed(1)).join(" → ")}`,
    `변동성: ${volKor[volatility.volatilityLevel]} (CV=${(volatility.coefficientOfVariation * 100).toFixed(1)}%)`,
    `계절성 강도: ${(hw.seasonalStrength * 100).toFixed(0)}%`,
    `성장점수: ${overallScore.growthScore.toFixed(0)}/100, 안정성: ${overallScore.stabilityScore.toFixed(0)}/100`,
    `종합 평가: ${recKor[overallScore.recommendation]}`,
  ];

  return lines.join("\n");
}
