import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface KeywordAnalysis {
  // Core analysis
  trendScore: number;
  growthPotential: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  seasonality: string;
  targetAudience: string;
  relatedKeywords: string[];
  pricingStrategy: string;
  riskFactors: string[];
  recommendation: string;
  marketInsight: string;
  // Extended analysis (deep mode)
  sourcingChannels?: string;
  estimatedSales?: string;
  marketingStrategy?: string;
  supplierTips?: string;
  profitMargin?: string;
  entryBarrier?: string;
  competitorAnalysis?: string;
  productDifferentiation?: string;
  inventoryStrategy?: string;
  contentStrategy?: string;
}

export interface AnalysisOptions {
  platform?: "coupang" | "naver" | "gmarket" | "amazon" | "general";
  analysisDepth?: "simple" | "standard" | "deep";
  tone?: "professional" | "friendly" | "actionable";
}

// Generate demo analysis data for local development when Edge Functions are not deployed
function generateDemoAnalysis(keyword: string, options?: AnalysisOptions): KeywordAnalysis {
  const trendScore = Math.floor(Math.random() * 40) + 50; // 50-90
  const growthOptions: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
  const competitionOptions: ("high" | "medium" | "low")[] = ["high", "medium", "low"];

  const relatedKeywords = [
    `${keyword} 추천`,
    `${keyword} 인기`,
    `${keyword} 가성비`,
    `${keyword} 브랜드`,
    `${keyword} 후기`,
  ];

  return {
    trendScore,
    growthPotential: growthOptions[Math.floor(Math.random() * 3)],
    competition: competitionOptions[Math.floor(Math.random() * 3)],
    seasonality: "연중 꾸준한 수요가 있으며, 특히 봄/가을 시즌에 검색량이 증가하는 패턴을 보입니다.",
    targetAudience: "연령: 25-44세 | 성별: 전체 | 관심사: 생활용품, 가성비, 품질",
    relatedKeywords,
    pricingStrategy: `${options?.platform === "coupang" ? "쿠팡" : "이커머스"} 평균 가격대 대비 10-15% 낮은 가격으로 진입 후, 리뷰 확보 시 점진적 가격 인상 전략 권장`,
    riskFactors: [
      "경쟁 셀러 수 증가 추세",
      "계절에 따른 수요 변동 가능성",
      "원자재 가격 변동 리스크"
    ],
    recommendation: `"${keyword}" 키워드는 현재 성장 잠재력이 있으며 진입을 권장합니다. 차별화된 상품 구성과 리뷰 마케팅에 집중하세요.`,
    marketInsight: `해당 키워드 시장은 최근 6개월간 ${trendScore > 70 ? "급격한 성장세" : trendScore > 50 ? "안정적인 성장세" : "완만한 성장세"}를 보이고 있습니다.`,
    ...(options?.analysisDepth === "deep" && {
      sourcingChannels: "국내: 도매꾹, 사입삼촌\n해외: 알리바바, 1688",
      estimatedSales: "신규 셀러: 월 50-100개 / 기존 셀러: 월 200-500개",
      marketingStrategy: "SNS 인플루언서 협업, 키워드 광고, 리뷰 이벤트",
      supplierTips: "최소 3개 이상 공급업체 비교 후 결정, 샘플 필수 확인",
      profitMargin: "20-35%",
      entryBarrier: "중: 초기 재고 투자와 리뷰 확보가 핵심",
      competitorAnalysis: "상위 3개 셀러가 시장의 40%를 점유, 중소 셀러도 틈새 공략 가능",
      productDifferentiation: "패키지 차별화, 사은품 구성, A/S 강화",
      inventoryStrategy: "초기 물량: 50-100개, 리오더 주기: 2-3주",
      contentStrategy: "상세페이지: 사용 후기 강조, 비교 이미지 활용"
    })
  };
}

export function useKeywordAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeKeyword = async (
    keyword: string,
    category?: string,
    options?: AnalysisOptions
  ) => {
    if (!keyword.trim()) {
      toast.error("키워드를 입력해주세요.");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      // Try Supabase Edge Function first
      const { data, error: fnError } = await supabase.functions.invoke("analyze-keyword", {
        body: {
          keyword,
          category,
          platform: options?.platform || "general",
          analysisDepth: options?.analysisDepth || "standard",
          tone: options?.tone || "professional",
        },
      });

      if (fnError) {
        console.warn("Edge Function error, using demo data:", fnError.message);
        // Fallback to demo data if Edge Function fails
        const demoAnalysis = generateDemoAnalysis(keyword, options);
        setAnalysis(demoAnalysis);
        toast.success(`"${keyword}" 분석이 완료되었습니다. (데모 모드)`);
        return demoAnalysis;
      }

      if (data.error) {
        console.warn("Edge Function returned error, using demo data:", data.error);
        const demoAnalysis = generateDemoAnalysis(keyword, options);
        setAnalysis(demoAnalysis);
        toast.success(`"${keyword}" 분석이 완료되었습니다. (데모 모드)`);
        return demoAnalysis;
      }

      setAnalysis(data.analysis);
      toast.success(`"${keyword}" 분석이 완료되었습니다.`);
      return data.analysis;
    } catch (err) {
      console.warn("Analysis error, using demo data:", err);
      // Fallback to demo data on any error
      const demoAnalysis = generateDemoAnalysis(keyword, options);
      setAnalysis(demoAnalysis);
      toast.success(`"${keyword}" 분석이 완료되었습니다. (데모 모드)`);
      return demoAnalysis;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeKeyword,
    isAnalyzing,
    analysis,
    error,
    clearAnalysis: () => setAnalysis(null),
  };
}
