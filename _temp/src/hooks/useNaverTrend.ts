import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NaverTrendRequest } from "@/types/sourcing";
import { NAVER_CATEGORIES } from "@/store";

export interface TrendDataPoint {
  period: string;
  ratio: number;
}

export interface NaverTrendResult {
  title: string;
  keywords: string[];
  data: TrendDataPoint[];
}

// Generate demo trend data when Edge Function is not available
function generateDemoTrendData(params: NaverTrendRequest): NaverTrendResult[] {
  const categories = params.category || [];
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  return categories.map((catId) => {
    const category = NAVER_CATEGORIES.find(c => c.id === catId);
    const categoryName = category?.name || catId;

    // Generate monthly data points
    const data: TrendDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const baseRatio = 50 + Math.random() * 30; // 50-80 base
      const seasonalVariation = Math.sin(currentDate.getMonth() * Math.PI / 6) * 15; // Seasonal pattern
      const ratio = Math.max(10, Math.min(100, baseRatio + seasonalVariation + (Math.random() - 0.5) * 10));

      data.push({
        period: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`,
        ratio: Math.round(ratio)
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      title: categoryName,
      keywords: [categoryName],
      data
    };
  });
}

export function useNaverTrend() {
  const [isLoading, setIsLoading] = useState(false);
  const [trendData, setTrendData] = useState<NaverTrendResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrend = async (params: NaverTrendRequest) => {
    if (!params.startDate || !params.endDate || !params.category?.length) {
      toast.error("조사 기간과 카테고리를 선택해주세요.");
      return null;
    }

    setIsLoading(true);
    setError(null);
    setTrendData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("naver-trend", {
        body: params,
      });

      if (fnError) {
        console.warn("Naver trend Edge Function error, using demo data:", fnError.message);
        const demoData = generateDemoTrendData(params);
        setTrendData(demoData);
        toast.success("트렌드 데이터를 불러왔습니다. (데모 모드)");
        return demoData;
      }

      if (!data.success) {
        console.warn("Naver trend returned error, using demo data:", data.error);
        const demoData = generateDemoTrendData(params);
        setTrendData(demoData);
        toast.success("트렌드 데이터를 불러왔습니다. (데모 모드)");
        return demoData;
      }

      setTrendData(data.data);
      toast.success("트렌드 데이터를 불러왔습니다.");
      return data.data as NaverTrendResult[];
    } catch (err) {
      console.warn("Naver trend error, using demo data:", err);
      const demoData = generateDemoTrendData(params);
      setTrendData(demoData);
      toast.success("트렌드 데이터를 불러왔습니다. (데모 모드)");
      return demoData;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchTrend,
    isLoading,
    trendData,
    error,
    clearTrendData: () => setTrendData(null),
  };
}
