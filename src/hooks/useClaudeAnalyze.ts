import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClaudeAnalyzeRequest, ClaudeAnalyzeResponse } from "@/types/sourcing";

export type ClaudeAnalysisData = ClaudeAnalyzeResponse["data"];

export interface Top10Keyword {
  rank: number;
  keyword: string;
  growthPotential: "상" | "중" | "하";
  competitionLevel: "상" | "중" | "하";
  reason: string;
  recommendedTiming: string;
  seasonalPattern: string;
  nicheKeywords: string[];
}

// Generate demo analysis data when Edge Functions are not available
function generateDemoClaudeAnalysis(request: ClaudeAnalyzeRequest): ClaudeAnalysisData {
  const keywords = request.trendData.map((t, idx) => t.keyword);
  const potentialOptions: ("상" | "중" | "하")[] = ["상", "중", "하"];
  const competitionOptions: ("상" | "중" | "하")[] = ["상", "중", "하"];

  const top10Keywords: Top10Keyword[] = keywords.slice(0, 10).map((keyword, idx) => ({
    rank: idx + 1,
    keyword,
    growthPotential: potentialOptions[Math.floor(Math.random() * 3)],
    competitionLevel: competitionOptions[Math.floor(Math.random() * 3)],
    reason: `${keyword}은(는) 최근 검색량이 증가하고 있으며, 계절적 요인과 트렌드 변화에 따른 성장 가능성이 높습니다.`,
    recommendedTiming: "즉시 진입 권장 - 현재가 최적의 진입 시점입니다.",
    seasonalPattern: "연중 꾸준하며 봄/가을 시즌 상승",
    nicheKeywords: [
      `${keyword} 추천`,
      `${keyword} 가성비`,
      `${keyword} 인기`
    ]
  }));

  return {
    top10Keywords,
    analysisInsights: `분석된 ${keywords.length}개 카테고리 중 성장 잠재력이 높은 TOP 10 키워드를 선정했습니다. 특히 상위 3개 키워드는 현재 시장 진입에 유리한 조건을 갖추고 있습니다. (데모 모드)`
  };
}

export function useClaudeAnalyze() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<ClaudeAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeWithClaude = async (request: ClaudeAnalyzeRequest) => {
    if (!request.trendData || request.trendData.length === 0) {
      toast.error("분석할 트렌드 데이터가 없습니다.");
      return null;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("claude-analyze", {
        body: request,
      });

      if (fnError) {
        console.warn("Claude analyze Edge Function error, using demo data:", fnError.message);
        const demoData = generateDemoClaudeAnalysis(request);
        setAnalysisData(demoData);
        toast.success("AI 분석이 완료되었습니다. (데모 모드)");
        return demoData;
      }

      if (!data.success) {
        console.warn("Claude analyze returned error, using demo data:", data.error);
        const demoData = generateDemoClaudeAnalysis(request);
        setAnalysisData(demoData);
        toast.success("AI 분석이 완료되었습니다. (데모 모드)");
        return demoData;
      }

      setAnalysisData(data.data);
      toast.success("AI 분석이 완료되었습니다.");
      return data.data as ClaudeAnalysisData;
    } catch (err) {
      console.warn("Claude analyze error, using demo data:", err);
      const demoData = generateDemoClaudeAnalysis(request);
      setAnalysisData(demoData);
      toast.success("AI 분석이 완료되었습니다. (데모 모드)");
      return demoData;
    } finally {
      setIsLoading(false);
    }
  };

  const getPotentialBadge = (potential: "상" | "중" | "하") => {
    switch (potential) {
      case "상":
        return { color: "text-emerald-500", bg: "bg-emerald-500/20", label: "높음" };
      case "중":
        return { color: "text-yellow-500", bg: "bg-yellow-500/20", label: "보통" };
      case "하":
        return { color: "text-red-500", bg: "bg-red-500/20", label: "낮음" };
      default:
        return { color: "text-muted-foreground", bg: "bg-secondary", label: potential };
    }
  };

  return {
    analyzeWithClaude,
    isLoading,
    analysisData,
    error,
    getPotentialBadge,
    clearAnalysisData: () => setAnalysisData(null),
  };
}
