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
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      toast.success(`"${keyword}" 분석이 완료되었습니다.`);
      return data.analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.";
      setError(message);
      toast.error(message);
      return null;
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
