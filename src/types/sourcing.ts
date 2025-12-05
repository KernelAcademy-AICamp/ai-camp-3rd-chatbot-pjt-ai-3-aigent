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
