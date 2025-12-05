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

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "히스토리를 불러오는 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleFavorite = useCallback(async (id: string, currentValue: boolean) => {
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
  }, []);

  const deleteAnalysis = useCallback(async (id: string) => {
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
  }, []);

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory,
    toggleFavorite,
    deleteAnalysis,
  };
}