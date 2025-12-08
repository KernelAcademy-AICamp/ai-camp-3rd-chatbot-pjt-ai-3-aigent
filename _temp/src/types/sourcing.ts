export interface Category {
  id: string;
  name: string;
  naverId: string;
  icon: string;
}

export interface Keyword {
  id: string;
  keyword: string;
  rank: number;
  searchVolume: number;
  growthRate: number;
  competitionScore: number;
  categoryId: string;
  trendData: TrendDataPoint[];
  aiAnalysis?: string;
  seasonality?: SeasonalityInfo;
}

export interface TrendDataPoint {
  date: string;
  ratio: number;
  predicted?: boolean;
}

export interface SeasonalityInfo {
  pattern: string;
  peakMonths: number[];
  description: string;
}

export interface CompetitionData {
  keywordId: string;
  totalProducts: number;
  avgReviews: number;
  avgRating: number;
  avgPrice: number;
  topSellers: TopSeller[];
}

export interface TopSeller {
  name: string;
  price: number;
  reviews: number;
  rating: number;
}

export interface MarginCalculation {
  sellingPrice: number;
  costPrice: number;
  shippingCost: number;
  platformFee: number;
  netProfit: number;
  marginRate: number;
}

export interface AnalysisHistory {
  id: string;
  createdAt: string;
  categories: string[];
  startDate: string;
  endDate: string;
  topKeywords: Keyword[];
  aiInsights: string;
}

export interface AnalysisRequest {
  categories: string[];
  startDate: string;
  endDate: string;
}

// 네이버 데이터랩 API 관련 타입
export interface NaverTrendRequest {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  category: string[];
  device?: "pc" | "mo" | "";
  gender?: "m" | "f" | "";
  ages?: string[];
}

export interface NaverTrendResponse {
  success: boolean;
  data: {
    title: string;
    keywords: string[];
    data: {
      period: string;
      ratio: number;
    }[];
  }[];
  error?: string;
}

// LSTM 예측 관련 타입
export interface LSTMPredictRequest {
  historicalData: {
    date: string;
    value: number;
  }[];
  predictionMonths: number;
  keyword: string;
}

export interface LSTMPredictResponse {
  success: boolean;
  data: {
    keyword: string;
    predictions: {
      date: string;
      predicted_value: number;
      confidence_lower: number;
      confidence_upper: number;
    }[];
    growth_rate: number;
    seasonality: {
      pattern: string;
      peak_months: number[];
      low_months: number[];
    };
    model_confidence: number;
  };
}

// Claude AI 분석 관련 타입
export interface ClaudeAnalyzeRequest {
  trendData: {
    keyword: string;
    historicalTrend: { date: string; value: number }[];
    lstmPrediction: { date: string; value: number }[];
    growthRate: number;
  }[];
  userCriteria: {
    excludeClothing: boolean;
    maxVolume: string;
    targetPlatform: string;
  };
  analysisType: "ranking" | "niche_keyword" | "product_name";
}

export interface ClaudeAnalyzeResponse {
  success: boolean;
  data: {
    top10Keywords: {
      rank: number;
      keyword: string;
      growthPotential: "상" | "중" | "하";
      competitionLevel: "상" | "중" | "하";
      reason: string;
      recommendedTiming: string;
      seasonalPattern: string;
      nicheKeywords: string[];
    }[];
    analysisInsights: string;
  };
}

// 쿠팡 경쟁강도 분석 타입
export interface CoupangCompetitionRequest {
  keyword: string;
}

export interface CoupangCompetitionResponse {
  success: boolean;
  data: {
    keyword: string;
    totalProducts: number;
    avgReviewCount: number;
    avgPrice: number;
    priceRange: {
      min: number;
      max: number;
    };
    top10Products: {
      name: string;
      price: number;
      reviewCount: number;
      rating: number;
      isRocketDelivery: boolean;
    }[];
    rocketDeliveryRatio: number;
    competitionScore: number;
    competitionLevel: "상" | "중" | "하";
    insights: string;
  };
}

// 틈새 키워드 추천 타입
export interface NicheKeywordRequest {
  mainKeyword: string;
  maxResults?: number;
}

export interface NicheKeywordResponse {
  success: boolean;
  data: {
    mainKeyword: string;
    nicheKeywords: {
      keyword: string;
      searchVolume: number;
      competition: "상" | "중" | "하";
      cpc: number;
      relevanceScore: number;
      recommendedTitle: string;
      reasoning: string;
    }[];
    titleSuggestions: {
      keyword: string;
      titles: string[];
    }[];
  };
}

// 마진 계산기 확장 타입
export interface MarginCalculatorRequest {
  purchasePrice: number;
  sellingPrice: number;
  shippingCost: number;
  coupangFeeRate: number;
  adCostPerUnit?: number;
  returnRate?: number;
  quantity?: number;
}

export interface MarginCalculatorResponse {
  success: boolean;
  data: {
    perUnit: {
      revenue: number;
      coupangFee: number;
      shippingCost: number;
      adCost: number;
      returnCost: number;
      totalCost: number;
      grossProfit: number;
      netProfit: number;
      marginRate: number;
    };
    total: {
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
    };
    breakEven: {
      quantity: number;
      revenue: number;
    };
    recommendedPrices: {
      margin20: number;
      margin30: number;
      margin40: number;
    };
  };
}

// 소싱처 검색 타입
export interface SourcingSearchRequest {
  keyword: string;
  platform: "1688" | "taobao" | "aliexpress";
  maxResults?: number;
  sortBy?: "price" | "sales" | "rating";
}

export interface SourcingSearchResponse {
  success: boolean;
  data: {
    platform: string;
    keyword: string;
    totalResults: number;
    products: {
      id: string;
      title: string;
      titleKo: string;
      price: number;
      originalPrice: number;
      currency: string;
      moq: number;
      salesCount: number;
      rating: number;
      supplierRating: string;
      shippingEstimate: string;
      imageUrl: string;
      productUrl: string;
      specifications: {
        weight: string;
        size: string;
        material: string;
      };
    }[];
    exchangeRate: number;
  };
}

// 네이버 카테고리 코드
export const NAVER_CATEGORY_CODES: Record<string, string> = {
  "패션잡화": "50000000",
  "화장품/미용": "50000002",
  "디지털/가전": "50000003",
  "가구/인테리어": "50000004",
  "출산/육아": "50000005",
  "식품": "50000006",
  "스포츠/레저": "50000007",
  "생활/건강": "50000008",
  "여가/생활편의": "50000009",
  "면세점": "50000010"
};
