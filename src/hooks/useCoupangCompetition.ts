import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CoupangCompetitionResponse } from "@/types/sourcing";

export type CompetitionData = CoupangCompetitionResponse["data"];

// Generate demo competition data when Edge Function is not available
function generateDemoCompetitionData(keyword: string): CompetitionData {
  const competitionScore = Math.floor(Math.random() * 60) + 30; // 30-90
  const competitionLevels: ("상" | "중" | "하")[] = ["상", "중", "하"];
  const competitionLevel = competitionScore >= 70 ? "상" : competitionScore >= 40 ? "중" : "하";

  const avgPrice = Math.floor(Math.random() * 50000) + 10000; // 10000-60000
  const totalProducts = Math.floor(Math.random() * 5000) + 500;

  const top10Products = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    name: `${keyword} ${["프리미엄", "가성비", "인기", "베스트", "추천"][i % 5]} 상품 ${i + 1}`,
    price: Math.floor(avgPrice * (0.7 + Math.random() * 0.6)),
    reviewCount: Math.floor(Math.random() * 5000) + 100,
    rating: (4 + Math.random()).toFixed(1),
    isRocketDelivery: Math.random() > 0.3,
    seller: `판매자${i + 1}`
  }));

  return {
    keyword,
    competitionScore,
    competitionLevel,
    totalProducts,
    avgReviewCount: Math.floor(Math.random() * 2000) + 200,
    avgPrice,
    priceRange: {
      min: Math.floor(avgPrice * 0.3),
      max: Math.floor(avgPrice * 2.5)
    },
    rocketDeliveryRatio: Math.floor(Math.random() * 40) + 40, // 40-80%
    top10Products,
    insights: `"${keyword}" 키워드는 현재 ${competitionLevel === "상" ? "경쟁이 치열한" : competitionLevel === "중" ? "적절한 경쟁 수준의" : "진입하기 좋은"} 시장입니다. ${totalProducts.toLocaleString()}개의 상품이 등록되어 있으며, 평균 가격대는 ${avgPrice.toLocaleString()}원입니다. (데모 모드)`
  };
}

export function useCoupangCompetition() {
  const [isLoading, setIsLoading] = useState(false);
  const [competitionData, setCompetitionData] = useState<CompetitionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeCompetition = async (keyword: string) => {
    if (!keyword.trim()) {
      toast.error("키워드를 입력해주세요.");
      return null;
    }

    setIsLoading(true);
    setError(null);
    setCompetitionData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("coupang-competition", {
        body: { keyword },
      });

      if (fnError) {
        console.warn("Coupang competition Edge Function error, using demo data:", fnError.message);
        const demoData = generateDemoCompetitionData(keyword);
        setCompetitionData(demoData);
        toast.success(`"${keyword}" 경쟁강도 분석이 완료되었습니다. (데모 모드)`);
        return demoData;
      }

      if (!data.success) {
        console.warn("Coupang competition returned error, using demo data:", data.error);
        const demoData = generateDemoCompetitionData(keyword);
        setCompetitionData(demoData);
        toast.success(`"${keyword}" 경쟁강도 분석이 완료되었습니다. (데모 모드)`);
        return demoData;
      }

      setCompetitionData(data.data);
      toast.success(`"${keyword}" 경쟁강도 분석이 완료되었습니다.`);
      return data.data as CompetitionData;
    } catch (err) {
      console.warn("Coupang competition error, using demo data:", err);
      const demoData = generateDemoCompetitionData(keyword);
      setCompetitionData(demoData);
      toast.success(`"${keyword}" 경쟁강도 분석이 완료되었습니다. (데모 모드)`);
      return demoData;
    } finally {
      setIsLoading(false);
    }
  };

  const getCompetitionBadge = (level: "상" | "중" | "하") => {
    switch (level) {
      case "상":
        return { color: "text-red-500", bg: "bg-red-500/20", label: "치열함" };
      case "중":
        return { color: "text-yellow-500", bg: "bg-yellow-500/20", label: "보통" };
      case "하":
        return { color: "text-emerald-500", bg: "bg-emerald-500/20", label: "여유" };
      default:
        return { color: "text-muted-foreground", bg: "bg-secondary", label: level };
    }
  };

  return {
    analyzeCompetition,
    isLoading,
    competitionData,
    error,
    getCompetitionBadge,
    clearCompetitionData: () => setCompetitionData(null),
  };
}
