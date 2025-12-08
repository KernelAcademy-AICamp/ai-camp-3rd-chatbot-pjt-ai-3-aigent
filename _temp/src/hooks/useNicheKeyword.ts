import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NicheKeywordResponse } from "@/types/sourcing";

export type NicheKeywordData = NicheKeywordResponse["data"];

export interface NicheKeyword {
  keyword: string;
  searchVolume: number;
  competition: "상" | "중" | "하";
  cpc: number;
  relevanceScore: number;
  recommendedTitle: string;
  reasoning: string;
}

// Generate demo niche keyword data when Edge Function is not available
function generateDemoNicheKeywordData(mainKeyword: string, maxResults: number): NicheKeywordData {
  const suffixes = ["추천", "가성비", "인기", "베스트", "후기", "비교", "순위", "할인", "신상", "브랜드"];
  const prefixes = ["프리미엄", "가성비", "인기", "최신", "고급"];
  const competitionOptions: ("상" | "중" | "하")[] = ["상", "중", "하"];

  const nicheKeywords: NicheKeyword[] = Array.from({ length: Math.min(maxResults, 10) }, (_, i) => {
    const suffix = suffixes[i % suffixes.length];
    const competition = competitionOptions[Math.floor(Math.random() * 3)];
    const searchVolume = Math.floor(Math.random() * 10000) + 500;

    return {
      keyword: `${mainKeyword} ${suffix}`,
      searchVolume,
      competition,
      cpc: Math.floor(Math.random() * 500) + 100,
      relevanceScore: Math.floor(Math.random() * 30) + 70,
      recommendedTitle: `${prefixes[i % prefixes.length]} ${mainKeyword} ${suffix} - 최저가 비교`,
      reasoning: `"${mainKeyword} ${suffix}"는 월간 ${searchVolume.toLocaleString()}회 검색되며, 경쟁 강도가 ${competition === "하" ? "낮아" : competition === "중" ? "보통이어서" : "높지만"} ${competition === "상" ? "차별화 전략이 필요합니다." : "진입하기 좋은 키워드입니다."}`
    };
  });

  const titleSuggestions = [{
    keyword: mainKeyword,
    titles: [
      `[베스트셀러] ${mainKeyword} 프리미엄 - 무료배송`,
      `가성비 최고 ${mainKeyword} - 당일발송`,
      `${mainKeyword} 인기순위 1위 - 리뷰 1000+`
    ]
  }];

  return {
    mainKeyword,
    nicheKeywords,
    titleSuggestions,
    insights: `"${mainKeyword}" 관련 ${nicheKeywords.length}개의 틈새 키워드를 분석했습니다. 경쟁이 낮은 롱테일 키워드로 초기 진입에 유리합니다. (데모 모드)`
  };
}

export function useNicheKeyword() {
  const [isLoading, setIsLoading] = useState(false);
  const [nicheData, setNicheData] = useState<NicheKeywordData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const findNicheKeywords = async (mainKeyword: string, maxResults: number = 10) => {
    if (!mainKeyword.trim()) {
      toast.error("키워드를 입력해주세요.");
      return null;
    }

    setIsLoading(true);
    setError(null);
    setNicheData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("niche-keyword", {
        body: { mainKeyword, maxResults },
      });

      if (fnError) {
        console.warn("Niche keyword Edge Function error, using demo data:", fnError.message);
        const demoData = generateDemoNicheKeywordData(mainKeyword, maxResults);
        setNicheData(demoData);
        toast.success(`"${mainKeyword}" 틈새 키워드 분석이 완료되었습니다. (데모 모드)`);
        return demoData;
      }

      if (!data.success) {
        console.warn("Niche keyword returned error, using demo data:", data.error);
        const demoData = generateDemoNicheKeywordData(mainKeyword, maxResults);
        setNicheData(demoData);
        toast.success(`"${mainKeyword}" 틈새 키워드 분석이 완료되었습니다. (데모 모드)`);
        return demoData;
      }

      setNicheData(data.data);
      toast.success(`"${mainKeyword}" 틈새 키워드 분석이 완료되었습니다.`);
      return data.data as NicheKeywordData;
    } catch (err) {
      console.warn("Niche keyword error, using demo data:", err);
      const demoData = generateDemoNicheKeywordData(mainKeyword, maxResults);
      setNicheData(demoData);
      toast.success(`"${mainKeyword}" 틈새 키워드 분석이 완료되었습니다. (데모 모드)`);
      return demoData;
    } finally {
      setIsLoading(false);
    }
  };

  const getCompetitionBadge = (competition: "상" | "중" | "하") => {
    switch (competition) {
      case "상":
        return { color: "text-red-500", bg: "bg-red-500/20" };
      case "중":
        return { color: "text-yellow-500", bg: "bg-yellow-500/20" };
      case "하":
        return { color: "text-emerald-500", bg: "bg-emerald-500/20" };
      default:
        return { color: "text-muted-foreground", bg: "bg-secondary" };
    }
  };

  return {
    findNicheKeywords,
    isLoading,
    nicheData,
    error,
    getCompetitionBadge,
    clearNicheData: () => setNicheData(null),
  };
}
