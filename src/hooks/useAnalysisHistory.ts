import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalysisRecord {
  id: string;
  keyword: string;
  category: string | null;
  trend_score: number;
  growth_potential: string;
  competition: string;
  seasonality: string;
  target_audience: string;
  related_keywords: string[];
  pricing_strategy: string;
  risk_factors: string[];
  recommendation: string;
  market_insight: string;
  is_favorite: boolean;
  created_at: string;
  // Extended analysis fields
  sourcing_channels: string | null;
  estimated_sales: string | null;
  marketing_strategy: string | null;
  supplier_tips: string | null;
  profit_margin: string | null;
  entry_barrier: string | null;
  competitor_analysis: string | null;
  product_differentiation: string | null;
  inventory_strategy: string | null;
  content_strategy: string | null;
  platform: string | null;
  analysis_depth: string | null;
}

// Demo history data for when Supabase is not available
const DEMO_HISTORY: AnalysisRecord[] = [
  {
    id: "demo-1",
    keyword: "무선 이어폰",
    category: "디지털/가전",
    trend_score: 85,
    growth_potential: "high",
    competition: "medium",
    seasonality: "연중 꾸준한 수요, 연말/연초 선물 시즌 피크",
    target_audience: "20-40대 직장인, 학생, 운동을 즐기는 사람들",
    related_keywords: ["블루투스 이어폰", "노이즈캔슬링", "에어팟 대체", "운동용 이어폰"],
    pricing_strategy: "3만원-8만원대 가성비 제품으로 진입",
    risk_factors: ["대기업 브랜드와의 경쟁", "품질 관리 필수"],
    recommendation: "가성비 포지셔닝으로 진입 권장. 리뷰 마케팅 중요.",
    market_insight: "TWS 시장은 지속 성장 중이며 중저가 시장 기회 존재",
    is_favorite: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    sourcing_channels: null,
    estimated_sales: null,
    marketing_strategy: null,
    supplier_tips: null,
    profit_margin: null,
    entry_barrier: null,
    competitor_analysis: null,
    product_differentiation: null,
    inventory_strategy: null,
    content_strategy: null,
    platform: "general",
    analysis_depth: "standard"
  },
  {
    id: "demo-2",
    keyword: "캠핑 의자",
    category: "스포츠/레저",
    trend_score: 72,
    growth_potential: "medium",
    competition: "low",
    seasonality: "봄/가을 피크, 겨울 비수기",
    target_audience: "30-50대 가족 캠핑족, 차박 애호가",
    related_keywords: ["접이식 의자", "경량 캠핑의자", "릴렉스 체어", "백패킹 의자"],
    pricing_strategy: "2만원-5만원대 중저가 제품",
    risk_factors: ["계절성 높음", "재고 관리 중요"],
    recommendation: "봄 시즌 전 재고 확보 권장. 차별화된 디자인 필요.",
    market_insight: "캠핑 시장 성장세 지속, 초경량/컴팩트 제품 인기",
    is_favorite: false,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    sourcing_channels: null,
    estimated_sales: null,
    marketing_strategy: null,
    supplier_tips: null,
    profit_margin: null,
    entry_barrier: null,
    competitor_analysis: null,
    product_differentiation: null,
    inventory_strategy: null,
    content_strategy: null,
    platform: "coupang",
    analysis_depth: "standard"
  },
  {
    id: "demo-3",
    keyword: "에어프라이어",
    category: "디지털/가전",
    trend_score: 68,
    growth_potential: "medium",
    competition: "high",
    seasonality: "연중 꾸준, 이사철/명절 피크",
    target_audience: "1인 가구, 신혼부부, 건강한 식생활 추구자",
    related_keywords: ["오븐형 에어프라이어", "대용량 에어프라이어", "에어프라이어 종이호일"],
    pricing_strategy: "10만원 이하 가성비 제품으로 진입",
    risk_factors: ["이미 포화된 시장", "A/S 이슈 가능성"],
    recommendation: "레드오션 시장이므로 신중한 진입 필요. 차별화 포인트 필수.",
    market_insight: "시장 성숙기, 대용량/멀티기능 제품으로 차별화 가능",
    is_favorite: false,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    sourcing_channels: null,
    estimated_sales: null,
    marketing_strategy: null,
    supplier_tips: null,
    profit_margin: null,
    entry_barrier: null,
    competitor_analysis: null,
    product_differentiation: null,
    inventory_strategy: null,
    content_strategy: null,
    platform: "general",
    analysis_depth: "standard"
  }
];

// Local storage key for demo history
const DEMO_HISTORY_KEY = "sourcing_master_demo_history";

// Get demo history from local storage or use default
function getDemoHistory(): AnalysisRecord[] {
  try {
    const stored = localStorage.getItem(DEMO_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load demo history from localStorage");
  }
  return DEMO_HISTORY;
}

// Save demo history to local storage
function saveDemoHistory(history: AnalysisRecord[]) {
  try {
    localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn("Failed to save demo history to localStorage");
  }
}

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('keyword_analyses')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setHistory(data || []);
      setIsDemoMode(false);
    } catch (err) {
      console.warn("Using demo history mode:", err);
      // Fallback to demo mode
      const demoHistory = getDemoHistory();
      setHistory(demoHistory);
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleFavorite = useCallback(async (id: string, currentValue: boolean) => {
    if (isDemoMode) {
      // Demo mode: update locally
      setHistory(prev => {
        const updated = prev.map(item =>
          item.id === id ? { ...item, is_favorite: !currentValue } : item
        ).sort((a, b) => {
          if (a.is_favorite !== b.is_favorite) {
            return a.is_favorite ? -1 : 1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        saveDemoHistory(updated);
        return updated;
      });
      toast.success(currentValue ? "즐겨찾기에서 제거했습니다." : "즐겨찾기에 추가했습니다.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('keyword_analyses')
        .update({ is_favorite: !currentValue })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setHistory(prev =>
        prev.map(item =>
          item.id === id ? { ...item, is_favorite: !currentValue } : item
        ).sort((a, b) => {
          if (a.is_favorite !== b.is_favorite) {
            return a.is_favorite ? -1 : 1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      );

      toast.success(currentValue ? "즐겨찾기에서 제거했습니다." : "즐겨찾기에 추가했습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "즐겨찾기 변경 중 오류가 발생했습니다.";
      toast.error(message);
    }
  }, [isDemoMode]);

  const deleteAnalysis = useCallback(async (id: string) => {
    if (isDemoMode) {
      // Demo mode: update locally
      setHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        saveDemoHistory(updated);
        return updated;
      });
      toast.success("분석 기록이 삭제되었습니다.");
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('keyword_analyses')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success("분석 기록이 삭제되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.";
      toast.error(message);
    }
  }, [isDemoMode]);

  // Add new analysis to history (for demo mode)
  const addToHistory = useCallback((record: Omit<AnalysisRecord, 'id' | 'created_at' | 'is_favorite'>) => {
    const newRecord: AnalysisRecord = {
      ...record,
      id: `demo-${Date.now()}`,
      created_at: new Date().toISOString(),
      is_favorite: false,
    };

    setHistory(prev => {
      const updated = [newRecord, ...prev];
      if (isDemoMode) {
        saveDemoHistory(updated);
      }
      return updated;
    });

    return newRecord;
  }, [isDemoMode]);

  return {
    history,
    isLoading,
    error,
    isDemoMode,
    refetch: fetchHistory,
    toggleFavorite,
    deleteAnalysis,
    addToHistory,
  };
}