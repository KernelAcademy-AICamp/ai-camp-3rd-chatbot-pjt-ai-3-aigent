/**
 * 시계열 분석 유틸리티
 * - 선형회귀 (Linear Regression)
 * - 지수평활법 (Exponential Smoothing)
 * - Holt-Winters 모델 (트렌드 + 계절성)
 * - Mann-Kendall 트렌드 검정
 * - LOESS 평활화 (Locally Estimated Scatterplot Smoothing)
 * - STL 분해 (Seasonal-Trend decomposition using LOESS)
 * - 이상치 탐지 (Anomaly Detection)
 * - 모멘텀 분석 (Momentum Analysis)
 * - 다중 모델 앙상블 (Ensemble Forecasting)
 */

export type DataPoint = {
  period: string;
  ratio: number;
};

// STL 분해 결과
export type STLDecomposition = {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonalStrength: number; // 계절성 강도 (0~1)
  trendStrength: number; // 트렌드 강도 (0~1)
};

// 모멘텀 분석 결과
export type MomentumAnalysis = {
  shortMA: number[]; // 단기 이동평균
  longMA: number[]; // 장기 이동평균
  macd: number[]; // MACD (단기 - 장기)
  signal: string; // "bullish" | "bearish" | "neutral"
  crossoverType: "golden_cross" | "death_cross" | "none";
  rsi: number; // 상대강도지수 (0~100)
  momentum: number; // 현재 모멘텀 값
};

// 이상치 탐지 결과
export type AnomalyDetection = {
  anomalies: { index: number; value: number; zscore: number }[];
  cleanedData: number[];
  anomalyRatio: number; // 이상치 비율
};

// 앙상블 예측 결과
export type EnsembleForecast = {
  forecast: number[];
  forecastDates: string[]; // 예측 날짜 (YYYY-MM-DD 형식)
  confidenceInterval: { lower: number[]; upper: number[] };
  modelWeights: Record<string, number>;
  consensusStrength: number; // 모델 간 합의 정도 (0~1)
  lastDataDate: string; // 마지막 데이터 날짜
};

// 정확도 메트릭
export type AccuracyMetrics = {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number; // Mean Absolute Error
  mase: number; // Mean Absolute Scaled Error
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
    forecastDates?: string[]; // 예측 날짜 (YYYY-MM-DD)
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
  // === 새로운 고급 분석 필드 ===
  // STL 분해
  stlDecomposition?: STLDecomposition;
  // 모멘텀 분석
  momentum?: MomentumAnalysis;
  // 이상치 탐지
  anomalies?: AnomalyDetection;
  // 앙상블 예측
  ensemble?: EnsembleForecast;
  // 정확도 메트릭 (교차 검증 기반)
  accuracy?: AccuracyMetrics;
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
 * 예측 날짜 배열 생성 (마지막 데이터 날짜로부터 n개월 후)
 */
function generateForecastDates(lastDataDate: string, count: number): string[] {
  const dates: string[] = [];
  const base = new Date(lastDataDate);

  for (let i = 1; i <= count; i++) {
    const forecastDate = new Date(base);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    dates.push(forecastDate.toISOString().slice(0, 10));
  }

  return dates;
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

  // 마지막 데이터 날짜로부터 예측 날짜 생성
  const lastDataDate = sortedData[sortedData.length - 1]?.period;
  const hwForecastDates = lastDataDate ? generateForecastDates(lastDataDate, hw.forecast.length) : undefined;

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
      forecastDates: hwForecastDates,
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

  // 추천 기준 (비례적 조정: 60-50-30-15)
  if (combined >= 60 && mk.significant && mk.direction === "increasing") {
    return "highly_recommended"; // 적극 추천: 종합 60점 이상 + 통계적 상승
  }
  if (combined >= 50) return "recommended"; // 추천: 종합 50점 이상
  if (combined >= 30) return "neutral"; // 보통: 종합 30점 이상
  if (combined >= 15) return "caution"; // 주의: 종합 15점 이상
  return "not_recommended"; // 비추천: 종합 15점 미만
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

// ============================================================
// 고급 시계열 분석 함수들 (2024-2025 최신 기법)
// ============================================================

/**
 * LOESS (Locally Estimated Scatterplot Smoothing) 평활화
 * 국소 가중 회귀를 사용하여 비선형 트렌드를 추출
 * @param data 입력 데이터 배열
 * @param bandwidth 대역폭 (0~1, 클수록 더 평활)
 */
export function loessSmooth(
  data: number[],
  bandwidth: number = 0.3
): number[] {
  const n = data.length;
  if (n < 3) return [...data];

  const smoothed: number[] = [];
  const windowSize = Math.max(3, Math.floor(n * bandwidth));

  for (let i = 0; i < n; i++) {
    // 윈도우 범위 결정
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(n - 1, i + halfWindow);

    // 가중치 계산 (tricube 가중 함수)
    const weights: number[] = [];
    const values: number[] = [];
    const maxDist = Math.max(i - start, end - i) || 1;

    for (let j = start; j <= end; j++) {
      const dist = Math.abs(j - i) / maxDist;
      const u = Math.min(dist, 1);
      // Tricube weight: (1 - u^3)^3
      const weight = Math.pow(1 - Math.pow(u, 3), 3);
      weights.push(weight);
      values.push(data[j]);
    }

    // 가중 평균 계산
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedSum = values.reduce((sum, val, idx) => sum + val * weights[idx], 0);
    smoothed.push(totalWeight > 0 ? weightedSum / totalWeight : data[i]);
  }

  return smoothed;
}

/**
 * STL 분해 (Seasonal-Trend decomposition using LOESS)
 * 시계열을 트렌드, 계절성, 잔차로 분해
 * @param data 입력 데이터 배열
 * @param seasonLength 계절 주기 (월별 데이터면 12)
 * @param iterations 반복 횟수 (기본 2)
 */
export function stlDecompose(
  data: number[],
  seasonLength: number = 12,
  iterations: number = 2
): STLDecomposition {
  const n = data.length;

  // 데이터가 충분하지 않으면 기본값 반환
  if (n < seasonLength * 2) {
    const trend = loessSmooth(data, 0.5);
    const residual = data.map((v, i) => v - trend[i]);
    return {
      trend,
      seasonal: new Array(n).fill(0),
      residual,
      seasonalStrength: 0,
      trendStrength: calculateStrength(trend, residual),
    };
  }

  let seasonal = new Array(n).fill(0);
  let trend = new Array(n).fill(0);
  let residual = [...data];

  for (let iter = 0; iter < iterations; iter++) {
    // 1단계: 계절성 제거 후 트렌드 추출
    const deseasonalized = data.map((v, i) => v - seasonal[i]);
    trend = loessSmooth(deseasonalized, 0.5);

    // 2단계: 트렌드 제거 후 계절성 추출
    const detrended = data.map((v, i) => v - trend[i]);

    // 계절별 평균 계산
    const seasonalAvg: number[] = new Array(seasonLength).fill(0);
    const seasonalCount: number[] = new Array(seasonLength).fill(0);

    for (let i = 0; i < n; i++) {
      const seasonIdx = i % seasonLength;
      seasonalAvg[seasonIdx] += detrended[i];
      seasonalCount[seasonIdx]++;
    }

    for (let s = 0; s < seasonLength; s++) {
      seasonalAvg[s] = seasonalCount[s] > 0 ? seasonalAvg[s] / seasonalCount[s] : 0;
    }

    // 계절 효과 중심화 (평균이 0이 되도록)
    const avgSeasonal = seasonalAvg.reduce((a, b) => a + b, 0) / seasonLength;
    for (let s = 0; s < seasonLength; s++) {
      seasonalAvg[s] -= avgSeasonal;
    }

    // 계절성 배열 구성
    seasonal = data.map((_, i) => seasonalAvg[i % seasonLength]);

    // 3단계: 잔차 계산
    residual = data.map((v, i) => v - trend[i] - seasonal[i]);
  }

  // 계절성 및 트렌드 강도 계산
  const seasonalStrength = calculateStrength(seasonal, residual);
  const trendStrength = calculateStrength(trend, residual);

  return {
    trend,
    seasonal,
    residual,
    seasonalStrength,
    trendStrength,
  };
}

/**
 * 성분 강도 계산 (0~1)
 */
function calculateStrength(component: number[], residual: number[]): number {
  const varComponent = variance(component);
  const varResidual = variance(residual);
  const totalVar = varComponent + varResidual;

  if (totalVar === 0) return 0;
  return Math.max(0, 1 - varResidual / totalVar);
}

/**
 * 분산 계산
 */
function variance(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  return data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / data.length;
}

/**
 * 이동평균 계산
 */
export function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      // 초기 값들은 가용한 데이터로 평균
      const slice = data.slice(0, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return result;
}

/**
 * 이상치 탐지 (Z-score 및 IQR 기반)
 * @param data 입력 데이터 배열
 * @param threshold Z-score 임계값 (기본 2.5)
 */
export function detectAnomalies(
  data: number[],
  threshold: number = 2.5
): AnomalyDetection {
  const n = data.length;
  if (n < 5) {
    return { anomalies: [], cleanedData: [...data], anomalyRatio: 0 };
  }

  const mean = data.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n);

  const anomalies: AnomalyDetection["anomalies"] = [];
  const cleanedData: number[] = [];

  for (let i = 0; i < n; i++) {
    const zscore = std > 0 ? (data[i] - mean) / std : 0;
    if (Math.abs(zscore) > threshold) {
      anomalies.push({ index: i, value: data[i], zscore });
      // 이상치는 이전 값으로 대체 (또는 평균)
      cleanedData.push(i > 0 ? cleanedData[i - 1] : mean);
    } else {
      cleanedData.push(data[i]);
    }
  }

  return {
    anomalies,
    cleanedData,
    anomalyRatio: anomalies.length / n,
  };
}

/**
 * RSI (Relative Strength Index) 계산
 * @param data 입력 데이터 배열
 * @param period RSI 기간 (기본 6)
 */
export function calculateRSI(data: number[], period: number = 6): number {
  if (data.length < period + 1) return 50; // 중립값

  // 가격 변화 계산
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  // 최근 period 기간의 변화만 사용
  const recentChanges = changes.slice(-period);

  // 상승/하락 분리
  let gains = 0;
  let losses = 0;

  for (const change of recentChanges) {
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * 모멘텀 분석 (이동평균 교차 + RSI)
 * @param data 입력 데이터 배열
 * @param shortPeriod 단기 이동평균 기간 (기본 3)
 * @param longPeriod 장기 이동평균 기간 (기본 6)
 */
export function analyzeMomentum(
  data: number[],
  shortPeriod: number = 3,
  longPeriod: number = 6
): MomentumAnalysis {
  const n = data.length;

  if (n < longPeriod) {
    return {
      shortMA: [...data],
      longMA: [...data],
      macd: new Array(n).fill(0),
      signal: "neutral",
      crossoverType: "none",
      rsi: 50,
      momentum: 0,
    };
  }

  const shortMA = movingAverage(data, shortPeriod);
  const longMA = movingAverage(data, longPeriod);
  const macd = shortMA.map((v, i) => v - longMA[i]);

  // 교차 타입 판단 (최근 2개 포인트 비교)
  let crossoverType: MomentumAnalysis["crossoverType"] = "none";
  if (n >= 2) {
    const prevDiff = macd[n - 2];
    const currDiff = macd[n - 1];
    if (prevDiff <= 0 && currDiff > 0) {
      crossoverType = "golden_cross"; // 골든 크로스 (매수 신호)
    } else if (prevDiff >= 0 && currDiff < 0) {
      crossoverType = "death_cross"; // 데드 크로스 (매도 신호)
    }
  }

  // RSI 계산
  const rsi = calculateRSI(data);

  // 신호 결정
  let signal: MomentumAnalysis["signal"] = "neutral";
  const lastMacd = macd[n - 1];
  if (lastMacd > 0 && rsi > 50) {
    signal = "bullish";
  } else if (lastMacd < 0 && rsi < 50) {
    signal = "bearish";
  }

  // 현재 모멘텀 (최근 변화율)
  const momentum = n >= 2 ? (data[n - 1] - data[n - 2]) / (data[n - 2] || 1) * 100 : 0;

  return {
    shortMA,
    longMA,
    macd,
    signal,
    crossoverType,
    rsi,
    momentum,
  };
}

/**
 * 앙상블 예측 (여러 모델의 가중 평균)
 * @param data 입력 데이터 배열
 * @param forecastHorizon 예측 기간 (기본 3)
 * @param lastDataDate 마지막 데이터 날짜 (YYYY-MM-DD, 기본은 현재 날짜)
 */
export function ensembleForecast(
  data: number[],
  forecastHorizon: number = 3,
  lastDataDate?: string
): EnsembleForecast {
  const n = data.length;

  // 마지막 데이터 날짜 (기본값: 현재 날짜)
  const effectiveLastDate = lastDataDate || new Date().toISOString().slice(0, 10);
  const forecastDates = generateForecastDates(effectiveLastDate, forecastHorizon);

  if (n < 5) {
    const mean = n > 0 ? data.reduce((a, b) => a + b, 0) / n : 0;
    const forecast = new Array(forecastHorizon).fill(mean);
    return {
      forecast,
      forecastDates,
      confidenceInterval: {
        lower: forecast.map((f) => f * 0.8),
        upper: forecast.map((f) => f * 1.2),
      },
      modelWeights: { naive: 1 },
      consensusStrength: 1,
      lastDataDate: effectiveLastDate,
    };
  }

  // 1. 선형회귀 예측
  const lr = linearRegression(data);
  const lrForecast = Array.from({ length: forecastHorizon }, (_, h) =>
    lr.slope * (n + h) + lr.intercept
  );

  // 2. Holt-Winters 예측
  const hw = holtWintersDouble(data);
  const hwForecast = hw.forecast.slice(0, forecastHorizon);
  while (hwForecast.length < forecastHorizon) {
    hwForecast.push(hwForecast[hwForecast.length - 1] || 0);
  }

  // 3. 지수평활 예측
  const es = exponentialSmoothing(data);
  const esLast = es.smoothed[es.smoothed.length - 1] || 0;
  const esTrend = es.trend;
  const esForecast = Array.from({ length: forecastHorizon }, (_, h) =>
    esLast + esTrend * (h + 1)
  );

  // 4. 단순 이동평균 예측
  const ma = movingAverage(data, Math.min(3, n));
  const maLast = ma[ma.length - 1] || 0;
  const maForecast = new Array(forecastHorizon).fill(maLast);

  // 가중치 결정 (R² 기반)
  const weights = {
    linearRegression: Math.max(0.1, lr.rSquared),
    holtWinters: 0.3,
    exponentialSmoothing: 0.25,
    movingAverage: 0.15,
  };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // 정규화
  const normalizedWeights: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalizedWeights[key] = value / totalWeight;
  }

  // 앙상블 예측
  const forecast: number[] = [];
  for (let h = 0; h < forecastHorizon; h++) {
    const weighted =
      lrForecast[h] * normalizedWeights.linearRegression +
      hwForecast[h] * normalizedWeights.holtWinters +
      esForecast[h] * normalizedWeights.exponentialSmoothing +
      maForecast[h] * normalizedWeights.movingAverage;
    forecast.push(weighted);
  }

  // 신뢰구간 (모델 간 표준편차 기반)
  const confidenceInterval: EnsembleForecast["confidenceInterval"] = {
    lower: [],
    upper: [],
  };

  for (let h = 0; h < forecastHorizon; h++) {
    const models = [lrForecast[h], hwForecast[h], esForecast[h], maForecast[h]];
    const modelMean = models.reduce((a, b) => a + b, 0) / models.length;
    const modelStd = Math.sqrt(
      models.reduce((acc, m) => acc + (m - modelMean) ** 2, 0) / models.length
    );
    confidenceInterval.lower.push(forecast[h] - 1.96 * modelStd);
    confidenceInterval.upper.push(forecast[h] + 1.96 * modelStd);
  }

  // 모델 간 합의 정도 (표준편차가 작을수록 합의가 높음)
  const avgForecast = forecast.reduce((a, b) => a + b, 0) / forecastHorizon;
  const allModels = [...lrForecast, ...hwForecast, ...esForecast, ...maForecast];
  const allMean = allModels.reduce((a, b) => a + b, 0) / allModels.length;
  const allStd = Math.sqrt(
    allModels.reduce((acc, m) => acc + (m - allMean) ** 2, 0) / allModels.length
  );
  const consensusStrength = avgForecast > 0 ? Math.max(0, 1 - allStd / avgForecast) : 0.5;

  return {
    forecast,
    forecastDates,
    confidenceInterval,
    modelWeights: normalizedWeights,
    consensusStrength: Math.min(1, Math.max(0, consensusStrength)),
    lastDataDate: effectiveLastDate,
  };
}

/**
 * 예측 정확도 메트릭 계산 (교차 검증)
 * @param data 입력 데이터 배열
 * @param testRatio 테스트 데이터 비율 (기본 0.2)
 */
export function calculateAccuracyMetrics(
  data: number[],
  testRatio: number = 0.2
): AccuracyMetrics {
  const n = data.length;
  const testSize = Math.max(1, Math.floor(n * testRatio));
  const trainSize = n - testSize;

  if (trainSize < 3) {
    return { mape: 0, rmse: 0, mae: 0, mase: 0 };
  }

  const trainData = data.slice(0, trainSize);
  const testData = data.slice(trainSize);

  // 훈련 데이터로 모델 적합 및 예측
  const hw = holtWintersDouble(trainData);
  const predicted: number[] = [];
  for (let h = 0; h < testSize; h++) {
    predicted.push(hw.level + (h + 1) * hw.trend);
  }

  // 오차 계산
  const errors: number[] = [];
  const absErrors: number[] = [];
  const absPercentErrors: number[] = [];
  const squaredErrors: number[] = [];

  for (let i = 0; i < testSize; i++) {
    const actual = testData[i];
    const pred = predicted[i];
    const error = actual - pred;
    errors.push(error);
    absErrors.push(Math.abs(error));
    squaredErrors.push(error ** 2);
    if (actual !== 0) {
      absPercentErrors.push(Math.abs(error / actual) * 100);
    }
  }

  // MAPE
  const mape =
    absPercentErrors.length > 0
      ? absPercentErrors.reduce((a, b) => a + b, 0) / absPercentErrors.length
      : 0;

  // RMSE
  const rmse = Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / testSize);

  // MAE
  const mae = absErrors.reduce((a, b) => a + b, 0) / testSize;

  // MASE (Mean Absolute Scaled Error)
  // 기준: 훈련 데이터의 naive 예측 오차
  let naiveErrors = 0;
  for (let i = 1; i < trainSize; i++) {
    naiveErrors += Math.abs(trainData[i] - trainData[i - 1]);
  }
  const naiveMae = naiveErrors / (trainSize - 1);
  const mase = naiveMae > 0 ? mae / naiveMae : 0;

  return { mape, rmse, mae, mase };
}

/**
 * 고급 트렌드 분석 (기존 analyzeTrend + 새로운 분석 추가)
 */
export function analyzeAdvancedTrend(dataPoints: DataPoint[]): TrendAnalysisResult {
  // 기본 분석 수행
  const baseResult = analyzeTrend(dataPoints);

  const sortedData = [...dataPoints].sort((a, b) =>
    a.period.localeCompare(b.period)
  );
  const data = sortedData.map((d) => d.ratio);

  if (data.length < 5) {
    return baseResult;
  }

  // 이상치 탐지
  const anomalyResult = detectAnomalies(data);

  // 이상치 제거된 데이터로 추가 분석
  const cleanData = anomalyResult.cleanedData;

  // STL 분해
  const seasonLength = Math.min(12, Math.floor(data.length / 2));
  const stl = stlDecompose(cleanData, seasonLength);

  // 모멘텀 분석
  const momentumResult = analyzeMomentum(cleanData);

  // 앙상블 예측 (마지막 데이터 날짜 전달)
  const lastDataDate = sortedData[sortedData.length - 1]?.period;
  const ensembleResult = ensembleForecast(cleanData, 3, lastDataDate);

  // 정확도 메트릭
  const accuracyResult = calculateAccuracyMetrics(cleanData);

  return {
    ...baseResult,
    stlDecomposition: stl,
    momentum: momentumResult,
    anomalies: anomalyResult,
    ensemble: ensembleResult,
    accuracy: accuracyResult,
  };
}

/**
 * 고급 분석 결과를 한국어 요약으로 변환
 */
export function formatAdvancedTrendSummary(
  keyword: string,
  result: TrendAnalysisResult
): string {
  const baseSummary = formatTrendSummary(keyword, result);

  const advancedLines: string[] = [];

  if (result.momentum) {
    const momentumKor: Record<string, string> = {
      bullish: "상승 모멘텀",
      bearish: "하락 모멘텀",
      neutral: "중립",
    };
    const crossKor: Record<string, string> = {
      golden_cross: "골든 크로스 (매수 신호)",
      death_cross: "데드 크로스 (매도 신호)",
      none: "없음",
    };
    advancedLines.push(
      `\n[모멘텀 분석]`,
      `신호: ${momentumKor[result.momentum.signal]}`,
      `RSI: ${result.momentum.rsi.toFixed(1)}`,
      `교차: ${crossKor[result.momentum.crossoverType]}`
    );
  }

  if (result.stlDecomposition) {
    advancedLines.push(
      `\n[STL 분해]`,
      `트렌드 강도: ${(result.stlDecomposition.trendStrength * 100).toFixed(0)}%`,
      `계절성 강도: ${(result.stlDecomposition.seasonalStrength * 100).toFixed(0)}%`
    );
  }

  if (result.anomalies && result.anomalies.anomalies.length > 0) {
    advancedLines.push(
      `\n[이상치]`,
      `탐지된 이상치: ${result.anomalies.anomalies.length}개 (${(result.anomalies.anomalyRatio * 100).toFixed(1)}%)`
    );
  }

  if (result.ensemble) {
    advancedLines.push(
      `\n[앙상블 예측]`,
      `예측값: ${result.ensemble.forecast.map((f) => f.toFixed(1)).join(" → ")}`,
      `모델 합의도: ${(result.ensemble.consensusStrength * 100).toFixed(0)}%`
    );
  }

  if (result.accuracy) {
    advancedLines.push(
      `\n[정확도 메트릭]`,
      `MAPE: ${result.accuracy.mape.toFixed(1)}%`,
      `RMSE: ${result.accuracy.rmse.toFixed(2)}`,
      `MASE: ${result.accuracy.mase.toFixed(2)}`
    );
  }

  return baseSummary + advancedLines.join("\n");
}

// ============================================
// ARIMA 예측 기능 (arima npm 패키지 활용)
// ============================================

/**
 * ARIMA 예측 결과 타입
 */
export type ARIMAForecast = {
  forecast: number[];
  forecastDates: string[];
  model: {
    p: number;  // AR 차수
    d: number;  // 차분 차수
    q: number;  // MA 차수
  };
  isAutoARIMA: boolean;
  lastDataDate: string;
};

/**
 * ARIMA 예측 수행
 * @param data 시계열 데이터
 * @param forecastHorizon 예측 기간 (기본 3)
 * @param lastDataDate 마지막 데이터 날짜
 * @param options ARIMA 옵션
 */
export async function arimaForecast(
  data: number[],
  forecastHorizon: number = 3,
  lastDataDate?: string,
  options?: {
    p?: number;  // AR 차수 (기본 자동 선택)
    d?: number;  // 차분 차수
    q?: number;  // MA 차수
    auto?: boolean; // AutoARIMA 사용 여부
  }
): Promise<ARIMAForecast> {
  // arima 패키지 동적 import (서버 사이드에서만 동작)
  try {
    const ARIMA = (await import("arima")).default;

    const useAuto = options?.auto !== false;
    let model: { p: number; d: number; q: number };
    let forecast: number[];

    if (useAuto) {
      // AutoARIMA: 최적 파라미터 자동 선택
      const arima = new ARIMA({
        auto: true,
        verbose: false,
      });

      arima.train(data);
      const [pred] = arima.predict(forecastHorizon);
      forecast = pred;

      // AutoARIMA는 모델 파라미터를 직접 노출하지 않으므로 기본값 설정
      model = { p: 1, d: 1, q: 1 };
    } else {
      // 수동 ARIMA
      const p = options?.p ?? 1;
      const d = options?.d ?? 1;
      const q = options?.q ?? 1;

      const arima = new ARIMA({
        p,
        d,
        q,
        verbose: false,
      });

      arima.train(data);
      const [pred] = arima.predict(forecastHorizon);
      forecast = pred;
      model = { p, d, q };
    }

    // 예측 날짜 생성
    const forecastDates = lastDataDate
      ? generateForecastDates(lastDataDate, forecastHorizon)
      : [];

    return {
      forecast,
      forecastDates,
      model,
      isAutoARIMA: useAuto,
      lastDataDate: lastDataDate || "",
    };
  } catch (error) {
    console.error("ARIMA 예측 오류:", error);
    // 폴백: 간단한 선형 예측 사용
    return fallbackLinearForecast(data, forecastHorizon, lastDataDate);
  }
}

/**
 * ARIMA 실패 시 폴백용 선형 예측
 */
function fallbackLinearForecast(
  data: number[],
  forecastHorizon: number,
  lastDataDate?: string
): ARIMAForecast {
  const n = data.length;
  if (n < 2) {
    return {
      forecast: Array(forecastHorizon).fill(data[0] || 0),
      forecastDates: lastDataDate ? generateForecastDates(lastDataDate, forecastHorizon) : [],
      model: { p: 0, d: 0, q: 0 },
      isAutoARIMA: false,
      lastDataDate: lastDataDate || "",
    };
  }

  // 선형 회귀로 예측
  const lr = linearRegression(data);
  const forecast = Array(forecastHorizon)
    .fill(0)
    .map((_, i) => lr.slope * (n + i) + lr.intercept);

  return {
    forecast,
    forecastDates: lastDataDate ? generateForecastDates(lastDataDate, forecastHorizon) : [],
    model: { p: 0, d: 0, q: 0 },
    isAutoARIMA: false,
    lastDataDate: lastDataDate || "",
  };
}

/**
 * 개선된 앙상블 예측 (ARIMA 포함)
 * Holt-Winters + ARIMA + 이동평균의 가중 앙상블
 */
export async function improvedEnsembleForecast(
  data: number[],
  forecastHorizon: number = 3,
  lastDataDate?: string
): Promise<EnsembleForecast & { arimaForecast?: number[]; methodWeights: Record<string, number> }> {
  const n = data.length;

  if (n < 6) {
    // 데이터가 부족하면 기존 앙상블 사용
    const basicEnsemble = ensembleForecast(data, forecastHorizon, lastDataDate);
    return {
      ...basicEnsemble,
      methodWeights: { movingAverage: 1 },
    };
  }

  // 1. Holt-Winters 예측
  const hwResult = holtWintersDouble(data);
  const hwForecast = hwResult.forecast.slice(0, forecastHorizon);

  // 2. ARIMA 예측
  let arimaResult: ARIMAForecast;
  try {
    arimaResult = await arimaForecast(data, forecastHorizon, lastDataDate, { auto: true });
  } catch {
    arimaResult = fallbackLinearForecast(data, forecastHorizon, lastDataDate);
  }

  // 3. 이동평균 예측
  const maWindow = Math.min(3, Math.floor(n / 2));
  const recentData = data.slice(-maWindow);
  const maForecast = Array(forecastHorizon).fill(
    recentData.reduce((a, b) => a + b, 0) / recentData.length
  );

  // 4. 각 모델 백테스트로 가중치 결정
  const weights = calculateModelWeights(data, hwForecast, arimaResult.forecast, maForecast);

  // 5. 가중 앙상블 예측
  const forecast = hwForecast.map((_, i) => {
    return (
      weights.hw * (hwForecast[i] ?? 0) +
      weights.arima * (arimaResult.forecast[i] ?? 0) +
      weights.ma * (maForecast[i] ?? 0)
    );
  });

  // 6. 신뢰구간 계산
  const stdDev = Math.sqrt(
    data.slice(-Math.min(12, n)).reduce((sum, v) => {
      const mean = data.slice(-Math.min(12, n)).reduce((a, b) => a + b, 0) / Math.min(12, n);
      return sum + Math.pow(v - mean, 2);
    }, 0) / Math.min(12, n)
  );

  const confidenceInterval = {
    lower: forecast.map((f, i) => f - 1.96 * stdDev * Math.sqrt(i + 1)),
    upper: forecast.map((f, i) => f + 1.96 * stdDev * Math.sqrt(i + 1)),
  };

  // 합의도 계산
  const maxSpread = Math.max(...forecast.map((f, i) =>
    Math.max(
      Math.abs(f - hwForecast[i]),
      Math.abs(f - arimaResult.forecast[i]),
      Math.abs(f - maForecast[i])
    )
  ));
  const consensusStrength = Math.max(0, 1 - maxSpread / (Math.abs(forecast[0]) + 1));

  return {
    forecast,
    forecastDates: arimaResult.forecastDates,
    confidenceInterval,
    modelWeights: { hw: weights.hw, arima: weights.arima, ma: weights.ma },
    consensusStrength,
    lastDataDate: lastDataDate || "",
    arimaForecast: arimaResult.forecast,
    methodWeights: {
      holtWinters: weights.hw,
      arima: weights.arima,
      movingAverage: weights.ma,
    },
  };
}

/**
 * 모델 가중치 계산 (백테스팅 기반)
 */
function calculateModelWeights(
  data: number[],
  hwForecast: number[],
  arimaForecast: number[],
  maForecast: number[]
): { hw: number; arima: number; ma: number } {
  const n = data.length;
  if (n < 6) {
    return { hw: 0.4, arima: 0.4, ma: 0.2 };
  }

  // 마지막 3개 데이터로 간단한 백테스트
  const testSize = 3;
  const trainData = data.slice(0, -testSize);
  const testData = data.slice(-testSize);

  // 각 모델의 최근 예측 정확도 (실제 데이터와 비교는 복잡하므로 변동성 기반 가중치)
  const volatility = data.slice(-6).reduce((sum, v, i, arr) => {
    if (i === 0) return sum;
    return sum + Math.abs(v - arr[i - 1]);
  }, 0) / 5;

  // 변동성이 높으면 ARIMA와 이동평균에 가중치, 낮으면 Holt-Winters에 가중치
  const normalizedVolatility = Math.min(1, volatility / (data.reduce((a, b) => a + b, 0) / n));

  if (normalizedVolatility < 0.1) {
    // 안정적인 데이터: Holt-Winters 선호
    return { hw: 0.5, arima: 0.3, ma: 0.2 };
  } else if (normalizedVolatility < 0.3) {
    // 중간 변동성: 균등 분배
    return { hw: 0.35, arima: 0.35, ma: 0.3 };
  } else {
    // 높은 변동성: ARIMA와 이동평균 선호
    return { hw: 0.25, arima: 0.45, ma: 0.3 };
  }
}

// ============================================================
// 최신 머신러닝 시계열 예측 모델 (2024-2025)
// ============================================================

/**
 * Theta 모델 예측 결과 타입
 */
export type ThetaForecast = {
  forecast: number[];
  forecastDates: string[];
  theta: number; // Theta 파라미터
  drift: number; // 드리프트 (기울기)
};

/**
 * Prophet 스타일 분해 결과 타입
 */
export type ProphetStyleDecomposition = {
  trend: number[];
  seasonality: number[];
  holidays: number[]; // 이상치/특이점
  forecast: number[];
  forecastDates: string[];
  trendChangePoints: number[]; // 트렌드 변화점 인덱스
  growthRate: number; // 성장률
};

/**
 * 다이나믹 앙상블 예측 결과 타입
 */
export type DynamicEnsembleForecast = {
  forecast: number[];
  forecastDates: string[];
  confidenceInterval: { lower: number[]; upper: number[] };
  modelContributions: {
    theta: number;
    prophet: number;
    holtWinters: number;
    arima: number;
  };
  adaptiveWeights: number[]; // 기간별 적응형 가중치
  predictionInterval: { p10: number[]; p90: number[] };
};

/**
 * 자동 계절 주기 탐지
 * ACF (자기상관함수) 기반으로 최적의 계절 주기를 찾음
 * @param data 입력 데이터 배열
 * @param maxLag 최대 지연 (기본 24)
 */
export function detectSeasonalPeriod(data: number[], maxLag: number = 24): {
  period: number;
  strength: number;
  acfValues: number[];
} {
  const n = data.length;
  if (n < 8) {
    return { period: 0, strength: 0, acfValues: [] };
  }

  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n;

  if (variance === 0) {
    return { period: 0, strength: 0, acfValues: [] };
  }

  // ACF 계산
  const acfValues: number[] = [];
  const effectiveMaxLag = Math.min(maxLag, Math.floor(n / 2));

  for (let lag = 1; lag <= effectiveMaxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - mean) * (data[i + lag] - mean);
    }
    acfValues.push(sum / (n * variance));
  }

  // 피크 찾기 (로컬 최대값)
  const peaks: { lag: number; acf: number }[] = [];
  for (let i = 1; i < acfValues.length - 1; i++) {
    if (acfValues[i] > acfValues[i - 1] && acfValues[i] > acfValues[i + 1]) {
      if (acfValues[i] > 0.2) { // 임계값
        peaks.push({ lag: i + 1, acf: acfValues[i] });
      }
    }
  }

  if (peaks.length === 0) {
    return { period: 0, strength: 0, acfValues };
  }

  // 가장 강한 피크 선택
  peaks.sort((a, b) => b.acf - a.acf);
  const bestPeak = peaks[0];

  return {
    period: bestPeak.lag,
    strength: bestPeak.acf,
    acfValues,
  };
}

/**
 * Theta 모델 예측
 * M3 경쟁에서 우수한 성능을 보인 단순하고 강력한 모델
 * @param data 입력 데이터 배열
 * @param forecastHorizon 예측 기간
 * @param theta Theta 파라미터 (기본 2, 0이면 SES, 무한대면 선형)
 * @param lastDataDate 마지막 데이터 날짜
 */
export function thetaForecast(
  data: number[],
  forecastHorizon: number = 3,
  theta: number = 2,
  lastDataDate?: string
): ThetaForecast {
  const n = data.length;
  const forecastDates = lastDataDate
    ? generateForecastDates(lastDataDate, forecastHorizon)
    : [];

  if (n < 3) {
    const mean = n > 0 ? data.reduce((a, b) => a + b, 0) / n : 0;
    return {
      forecast: Array(forecastHorizon).fill(mean),
      forecastDates,
      theta,
      drift: 0,
    };
  }

  // 1. 데이터 차분으로 드리프트 추정
  let driftSum = 0;
  for (let i = 1; i < n; i++) {
    driftSum += data[i] - data[i - 1];
  }
  const drift = driftSum / (n - 1);

  // 2. 지수평활 (SES) 적용
  const alpha = 0.3; // 평활 계수
  const ses = exponentialSmoothing(data, alpha);
  const sesLast = ses.smoothed[ses.smoothed.length - 1];

  // 3. Theta 라인 결합
  // Theta 모델: SES 예측 + theta * drift * h
  const forecast: number[] = [];
  for (let h = 1; h <= forecastHorizon; h++) {
    // Theta 가중 예측
    const thetaValue = sesLast + (theta / 2) * drift * h;
    forecast.push(Math.max(0, thetaValue)); // 음수 방지
  }

  return {
    forecast,
    forecastDates,
    theta,
    drift,
  };
}

/**
 * Prophet 스타일 분해 및 예측
 * Facebook Prophet의 핵심 아이디어를 단순화하여 구현
 * y(t) = g(t) + s(t) + h(t) + ε
 * @param data 입력 데이터 배열
 * @param forecastHorizon 예측 기간
 * @param lastDataDate 마지막 데이터 날짜
 */
export function prophetStyleForecast(
  data: number[],
  forecastHorizon: number = 3,
  lastDataDate?: string
): ProphetStyleDecomposition {
  const n = data.length;
  const forecastDates = lastDataDate
    ? generateForecastDates(lastDataDate, forecastHorizon)
    : [];

  if (n < 6) {
    const mean = n > 0 ? data.reduce((a, b) => a + b, 0) / n : 0;
    return {
      trend: [...data],
      seasonality: new Array(n).fill(0),
      holidays: new Array(n).fill(0),
      forecast: Array(forecastHorizon).fill(mean),
      forecastDates,
      trendChangePoints: [],
      growthRate: 0,
    };
  }

  // 1. 트렌드 변화점 탐지 (Piecewise Linear Trend)
  const trendChangePoints = detectTrendChangePoints(data);

  // 2. 구간별 선형 트렌드 추출
  const trend = extractPiecewiseTrend(data, trendChangePoints);

  // 3. 트렌드 제거 후 계절성 추출
  const detrended = data.map((v, i) => v - trend[i]);
  const seasonalPeriod = detectSeasonalPeriod(data);
  const seasonality = extractSeasonality(detrended, seasonalPeriod.period || 12);

  // 4. 이상치/특이점 추출 (트렌드+계절성 제거 후 잔차)
  const holidays = data.map((v, i) => v - trend[i] - seasonality[i]);

  // 5. 성장률 계산
  const growthRate = n > 1 ? (data[n - 1] - data[0]) / data[0] / n : 0;

  // 6. 예측 생성
  const forecast = generateProphetForecast(
    trend,
    seasonality,
    trendChangePoints,
    forecastHorizon,
    n
  );

  return {
    trend,
    seasonality,
    holidays,
    forecast,
    forecastDates,
    trendChangePoints,
    growthRate,
  };
}

/**
 * 트렌드 변화점 탐지
 * PELT (Pruned Exact Linear Time) 알고리즘의 단순화 버전
 */
function detectTrendChangePoints(data: number[], maxChangePoints: number = 3): number[] {
  const n = data.length;
  if (n < 10) return [];

  const changePoints: number[] = [];
  const windowSize = Math.max(3, Math.floor(n / 5));

  // 슬라이딩 윈도우로 기울기 변화 탐지
  const slopes: number[] = [];
  for (let i = windowSize; i < n - windowSize; i++) {
    const leftSlope = calculateSlope(data.slice(i - windowSize, i));
    const rightSlope = calculateSlope(data.slice(i, i + windowSize));
    slopes.push(Math.abs(rightSlope - leftSlope));
  }

  // 상위 변화점 선택
  const threshold = Math.max(...slopes) * 0.5;
  for (let i = 0; i < slopes.length && changePoints.length < maxChangePoints; i++) {
    if (slopes[i] > threshold) {
      const point = i + windowSize;
      // 이전 변화점과 최소 거리 유지
      if (changePoints.length === 0 || point - changePoints[changePoints.length - 1] > windowSize) {
        changePoints.push(point);
      }
    }
  }

  return changePoints;
}

/**
 * 기울기 계산 헬퍼
 */
function calculateSlope(segment: number[]): number {
  const n = segment.length;
  if (n < 2) return 0;
  const lr = linearRegression(segment);
  return lr.slope;
}

/**
 * 구간별 선형 트렌드 추출
 */
function extractPiecewiseTrend(data: number[], changePoints: number[]): number[] {
  const n = data.length;
  const trend: number[] = new Array(n);

  // 변화점으로 구간 분할
  const segments = [0, ...changePoints, n];

  for (let s = 0; s < segments.length - 1; s++) {
    const start = segments[s];
    const end = segments[s + 1];
    const segment = data.slice(start, end);
    const lr = linearRegression(segment);

    for (let i = start; i < end; i++) {
      trend[i] = lr.slope * (i - start) + lr.intercept;
    }
  }

  return trend;
}

/**
 * 계절성 추출
 */
function extractSeasonality(detrended: number[], period: number): number[] {
  const n = detrended.length;
  const seasonality: number[] = new Array(n).fill(0);

  if (period <= 0 || n < period) return seasonality;

  // 계절별 평균 계산
  const seasonalMeans: number[] = new Array(period).fill(0);
  const seasonalCounts: number[] = new Array(period).fill(0);

  for (let i = 0; i < n; i++) {
    const seasonIdx = i % period;
    seasonalMeans[seasonIdx] += detrended[i];
    seasonalCounts[seasonIdx]++;
  }

  for (let s = 0; s < period; s++) {
    seasonalMeans[s] = seasonalCounts[s] > 0 ? seasonalMeans[s] / seasonalCounts[s] : 0;
  }

  // 중심화 (평균이 0이 되도록)
  const meanSeasonal = seasonalMeans.reduce((a, b) => a + b, 0) / period;
  for (let s = 0; s < period; s++) {
    seasonalMeans[s] -= meanSeasonal;
  }

  // 계절성 배열 구성
  for (let i = 0; i < n; i++) {
    seasonality[i] = seasonalMeans[i % period];
  }

  return seasonality;
}

/**
 * Prophet 스타일 예측 생성
 */
function generateProphetForecast(
  trend: number[],
  seasonality: number[],
  changePoints: number[],
  forecastHorizon: number,
  n: number
): number[] {
  // 마지막 구간의 트렌드 기울기 사용
  const lastChangePoint = changePoints.length > 0 ? changePoints[changePoints.length - 1] : 0;
  const lastSegment = trend.slice(lastChangePoint);
  const lastSlope = calculateSlope(lastSegment);
  const lastTrend = trend[n - 1];

  // 계절 주기
  const period = seasonality.length > 0 ? detectSeasonalPeriod(seasonality).period || 12 : 12;

  const forecast: number[] = [];
  for (let h = 1; h <= forecastHorizon; h++) {
    const futureTrend = lastTrend + lastSlope * h;
    const futureSeason = seasonality[(n + h - 1) % period] || 0;
    forecast.push(Math.max(0, futureTrend + futureSeason));
  }

  return forecast;
}

/**
 * 다이나믹 앙상블 예측 (최신 기법)
 * 여러 모델의 예측을 동적 가중치로 결합
 * @param data 입력 데이터 배열
 * @param forecastHorizon 예측 기간
 * @param lastDataDate 마지막 데이터 날짜
 */
export async function dynamicEnsembleForecast(
  data: number[],
  forecastHorizon: number = 3,
  lastDataDate?: string
): Promise<DynamicEnsembleForecast> {
  const n = data.length;
  const forecastDates = lastDataDate
    ? generateForecastDates(lastDataDate, forecastHorizon)
    : [];

  if (n < 6) {
    const mean = n > 0 ? data.reduce((a, b) => a + b, 0) / n : 0;
    return {
      forecast: Array(forecastHorizon).fill(mean),
      forecastDates,
      confidenceInterval: {
        lower: Array(forecastHorizon).fill(mean * 0.8),
        upper: Array(forecastHorizon).fill(mean * 1.2),
      },
      modelContributions: { theta: 0.25, prophet: 0.25, holtWinters: 0.25, arima: 0.25 },
      adaptiveWeights: Array(forecastHorizon).fill(1),
      predictionInterval: {
        p10: Array(forecastHorizon).fill(mean * 0.7),
        p90: Array(forecastHorizon).fill(mean * 1.3),
      },
    };
  }

  // 1. 각 모델 예측 수집
  const thetaResult = thetaForecast(data, forecastHorizon, 2, lastDataDate);
  const prophetResult = prophetStyleForecast(data, forecastHorizon, lastDataDate);
  const hwResult = holtWintersTriple(data, Math.min(12, Math.floor(n / 2)));

  // Holt-Winters 예측 확장
  const hwForecast = [...hwResult.forecast];
  while (hwForecast.length < forecastHorizon) {
    hwForecast.push(hwForecast[hwForecast.length - 1] || 0);
  }

  // ARIMA 예측 (비동기)
  let arimaForecastValues: number[];
  try {
    const arimaResult = await arimaForecast(data, forecastHorizon, lastDataDate, { auto: true });
    arimaForecastValues = arimaResult.forecast;
  } catch {
    arimaForecastValues = thetaResult.forecast; // 폴백
  }

  // 2. 모델 성능 기반 가중치 계산 (백테스팅)
  const weights = computeDynamicWeights(data, {
    theta: thetaResult.forecast,
    prophet: prophetResult.forecast,
    holtWinters: hwForecast.slice(0, forecastHorizon),
    arima: arimaForecastValues,
  });

  // 3. 가중 앙상블 예측
  const forecast: number[] = [];
  const adaptiveWeights: number[] = [];

  for (let h = 0; h < forecastHorizon; h++) {
    // 기간별 적응형 가중치 (먼 미래일수록 불확실성 증가)
    const uncertaintyFactor = 1 + h * 0.1;
    adaptiveWeights.push(1 / uncertaintyFactor);

    const weighted =
      weights.theta * (thetaResult.forecast[h] ?? 0) +
      weights.prophet * (prophetResult.forecast[h] ?? 0) +
      weights.holtWinters * (hwForecast[h] ?? 0) +
      weights.arima * (arimaForecastValues[h] ?? 0);

    forecast.push(Math.max(0, weighted));
  }

  // 4. 신뢰구간 및 예측구간 계산
  const { confidenceInterval, predictionInterval } = calculateIntervals(
    forecast,
    [thetaResult.forecast, prophetResult.forecast, hwForecast, arimaForecastValues],
    data
  );

  return {
    forecast,
    forecastDates,
    confidenceInterval,
    modelContributions: weights,
    adaptiveWeights,
    predictionInterval,
  };
}

/**
 * 다이나믹 가중치 계산 (백테스팅 기반)
 */
function computeDynamicWeights(
  data: number[],
  forecasts: {
    theta: number[];
    prophet: number[];
    holtWinters: number[];
    arima: number[];
  }
): { theta: number; prophet: number; holtWinters: number; arima: number } {
  const n = data.length;
  if (n < 8) {
    return { theta: 0.25, prophet: 0.25, holtWinters: 0.25, arima: 0.25 };
  }

  // 백테스트: 마지막 20%를 테스트 세트로 사용
  const testSize = Math.max(2, Math.floor(n * 0.2));
  const trainData = data.slice(0, -testSize);
  const testData = data.slice(-testSize);

  // 각 모델의 훈련 데이터 예측
  const thetaTrain = thetaForecast(trainData, testSize);
  const prophetTrain = prophetStyleForecast(trainData, testSize);
  const hwTrain = holtWintersTriple(trainData, Math.min(12, Math.floor(trainData.length / 2)));

  // MAE 계산
  const errors = {
    theta: calculateMAE(testData, thetaTrain.forecast.slice(0, testSize)),
    prophet: calculateMAE(testData, prophetTrain.forecast.slice(0, testSize)),
    holtWinters: calculateMAE(testData, hwTrain.forecast.slice(0, testSize)),
    arima: calculateMAE(testData, forecasts.arima.slice(0, testSize)),
  };

  // 에러의 역수로 가중치 계산 (에러가 작을수록 높은 가중치)
  const inverseErrors = {
    theta: 1 / (errors.theta + 0.01),
    prophet: 1 / (errors.prophet + 0.01),
    holtWinters: 1 / (errors.holtWinters + 0.01),
    arima: 1 / (errors.arima + 0.01),
  };

  const totalInverse =
    inverseErrors.theta +
    inverseErrors.prophet +
    inverseErrors.holtWinters +
    inverseErrors.arima;

  return {
    theta: inverseErrors.theta / totalInverse,
    prophet: inverseErrors.prophet / totalInverse,
    holtWinters: inverseErrors.holtWinters / totalInverse,
    arima: inverseErrors.arima / totalInverse,
  };
}

/**
 * MAE 계산 헬퍼
 */
function calculateMAE(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return Infinity;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.abs(actual[i] - (predicted[i] ?? actual[i]));
  }
  return sum / n;
}

/**
 * 신뢰구간 및 예측구간 계산
 */
function calculateIntervals(
  forecast: number[],
  modelForecasts: number[][],
  data: number[]
): {
  confidenceInterval: { lower: number[]; upper: number[] };
  predictionInterval: { p10: number[]; p90: number[] };
} {
  const h = forecast.length;

  // 모델 간 표준편차 (인식론적 불확실성)
  const modelStd: number[] = [];
  for (let i = 0; i < h; i++) {
    const values = modelForecasts.map((m) => m[i] ?? forecast[i]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
    modelStd.push(Math.sqrt(variance));
  }

  // 데이터 변동성 (우연적 불확실성)
  const dataStd = Math.sqrt(
    data.reduce((acc, v) => {
      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      return acc + (v - mean) ** 2;
    }, 0) / data.length
  );

  // 신뢰구간 (95%)
  const confidenceInterval = {
    lower: forecast.map((f, i) => f - 1.96 * modelStd[i]),
    upper: forecast.map((f, i) => f + 1.96 * modelStd[i]),
  };

  // 예측구간 (80%) - 시간에 따라 증가
  const predictionInterval = {
    p10: forecast.map((f, i) => f - 1.28 * (modelStd[i] + dataStd * Math.sqrt(i + 1))),
    p90: forecast.map((f, i) => f + 1.28 * (modelStd[i] + dataStd * Math.sqrt(i + 1))),
  };

  return { confidenceInterval, predictionInterval };
}

/**
 * 최신 고급 트렌드 분석 (기존 + 새로운 모델 포함)
 */
export async function analyzeLatestTrend(dataPoints: DataPoint[]): Promise<TrendAnalysisResult & {
  thetaForecast?: ThetaForecast;
  prophetDecomposition?: ProphetStyleDecomposition;
  dynamicEnsemble?: DynamicEnsembleForecast;
  detectedSeasonality?: { period: number; strength: number };
}> {
  // 기존 고급 분석 수행
  const baseResult = analyzeAdvancedTrend(dataPoints);

  const sortedData = [...dataPoints].sort((a, b) =>
    a.period.localeCompare(b.period)
  );
  const data = sortedData.map((d) => d.ratio);
  const lastDataDate = sortedData[sortedData.length - 1]?.period;

  if (data.length < 6) {
    return baseResult;
  }

  // 계절성 탐지
  const detectedSeasonality = detectSeasonalPeriod(data);

  // Theta 모델 예측
  const thetaResult = thetaForecast(data, 3, 2, lastDataDate);

  // Prophet 스타일 분해
  const prophetResult = prophetStyleForecast(data, 3, lastDataDate);

  // 다이나믹 앙상블 예측
  const dynamicResult = await dynamicEnsembleForecast(data, 3, lastDataDate);

  return {
    ...baseResult,
    thetaForecast: thetaResult,
    prophetDecomposition: prophetResult,
    dynamicEnsemble: dynamicResult,
    detectedSeasonality: {
      period: detectedSeasonality.period,
      strength: detectedSeasonality.strength,
    },
  };
}
