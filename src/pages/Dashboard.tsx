import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RealtimeTrendChart } from "@/components/dashboard/RealtimeTrendChart";
import { CategoryKeywordComparison } from "@/components/dashboard/CategoryKeywordComparison";
import { KeywordTable } from "@/components/dashboard/KeywordTable";
import { CategorySelector } from "@/components/dashboard/CategorySelector";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MarginCalculator } from "@/components/analysis/MarginCalculator";
import { AIInsightPanel } from "@/components/analysis/AIInsightPanel";
import { KeywordAnalysisModal } from "@/components/analysis/KeywordAnalysisModal";
import { useKeywordAnalysis, type KeywordAnalysis, type AnalysisOptions } from "@/hooks/useKeywordAnalysis";
import { CATEGORIES } from "@/data/categories";
import { toast } from "sonner";
import {
  TrendingUp,
  Search,
  Package,
  Sparkles,
  Play,
  Loader2,
} from "lucide-react";

// Generate mock chart data
const generateChartData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const baseValue = 100 + Math.random() * 50;
    const trend = i < 12 ? (12 - i) * 3 : 0;
    data.push({
      label: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`,
      value: Math.round(baseValue + trend + Math.sin(i / 3) * 15),
      predicted: i <= 3,
    });
  }
  return data;
};

// Mock keyword data
const mockKeywords = [
  { rank: 1, keyword: "무선 충전 마우스패드", searchVolume: 125000, growthRate: 45.2, competition: "중간" as const, aiScore: 92 },
  { rank: 2, keyword: "접이식 캠핑 테이블", searchVolume: 89000, growthRate: 38.7, competition: "낮음" as const, aiScore: 88 },
  { rank: 3, keyword: "LED 무드등", searchVolume: 156000, growthRate: 32.1, competition: "높음" as const, aiScore: 85 },
  { rank: 4, keyword: "휴대용 가습기", searchVolume: 203000, growthRate: 28.9, competition: "높음" as const, aiScore: 78 },
  { rank: 5, keyword: "에어프라이어 종이호일", searchVolume: 178000, growthRate: 25.4, competition: "중간" as const, aiScore: 82 },
  { rank: 6, keyword: "목베개 쿠션", searchVolume: 134000, growthRate: 22.8, competition: "낮음" as const, aiScore: 75 },
  { rank: 7, keyword: "스마트 체중계", searchVolume: 112000, growthRate: 19.5, competition: "높음" as const, aiScore: 70 },
  { rank: 8, keyword: "미니 제습기", searchVolume: 98000, growthRate: 18.2, competition: "중간" as const, aiScore: 73 },
  { rank: 9, keyword: "접착식 후크", searchVolume: 245000, growthRate: 15.7, competition: "낮음" as const, aiScore: 68 },
  { rank: 10, keyword: "케이블 정리함", searchVolume: 167000, growthRate: 14.3, competition: "낮음" as const, aiScore: 71 },
];

// Category keywords for batch analysis
const CATEGORY_ANALYSIS_KEYWORDS: Record<string, string[]> = {
  "fashion-accessories": ["미니백", "스마트워치 스트랩", "선글라스 케이스"],
  "furniture-interior": ["LED 무드등", "접이식 테이블", "수납 선반"],
  "life-health": ["휴대용 가습기", "마사지건", "스마트 체중계"],
  "digital-appliance": ["무선 충전 마우스패드", "미니 프로젝터", "포터블 모니터"],
  "food": ["에어프라이어 종이호일", "저당 과자", "프로틴 음료"],
  "sports-leisure": ["접이식 캠핑 테이블", "휴대용 선풍기", "러닝 벨트"],
  "beauty": ["LED 마스크", "미니 고데기", "뷰티 디바이스"],
  "baby-kids": ["유아용 식판", "아기 체온계", "휴대용 젖병 소독기"],
};

export function Dashboard() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "fashion-accessories",
    "furniture-interior",
    "life-health",
  ]);
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2025-12-05");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [avgGrowthRate, setAvgGrowthRate] = useState(23.4);
  const [avgAiScore, setAvgAiScore] = useState(78.5);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  
  // Modal state for individual keyword analysis
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKeyword, setModalKeyword] = useState("");
  const [currentAnalysis, setCurrentAnalysis] = useState<KeywordAnalysis | null>(null);
  const [isKeywordAnalyzing, setIsKeywordAnalyzing] = useState(false);

  const { analyzeKeyword } = useKeywordAnalysis();

  // Handle individual keyword analysis (from table or category comparison)
  const handleKeywordAnalyze = async (keyword: string) => {
    setModalKeyword(keyword);
    setSelectedKeyword(keyword);
    setIsModalOpen(true);
    setCurrentAnalysis(null);
    // Don't auto-analyze, let user select options first
  };

  // Handle analysis with options from modal
  const handleAnalyzeWithOptions = async (options: AnalysisOptions) => {
    setIsKeywordAnalyzing(true);
    setCurrentAnalysis(null);
    
    try {
      const result = await analyzeKeyword(modalKeyword, undefined, options);
      if (result) {
        setCurrentAnalysis(result);
      }
    } catch (error) {
      console.error("Keyword analysis error:", error);
    } finally {
      setIsKeywordAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (selectedCategories.length === 0) {
      toast.error("카테고리를 선택해주세요.");
      return;
    }

    if (isBatchAnalyzing) {
      toast.warning("이미 분석이 진행 중입니다.");
      return;
    }

    // Get keywords from selected categories
    const keywordsToAnalyze: { keyword: string; category: string }[] = [];
    selectedCategories.forEach((categoryId) => {
      const keywords = CATEGORY_ANALYSIS_KEYWORDS[categoryId] || [];
      const categoryName = CATEGORIES.find((c) => c.id === categoryId)?.name || categoryId;
      keywords.slice(0, 2).forEach((keyword) => {
        keywordsToAnalyze.push({ keyword, category: categoryName });
      });
    });

    if (keywordsToAnalyze.length === 0) {
      toast.error("분석할 키워드가 없습니다.");
      return;
    }

    setIsBatchAnalyzing(true);
    toast.info(`${keywordsToAnalyze.length}개 키워드 분석을 시작합니다...`);
    setAnalysisProgress(5);
    
    let successCount = 0;
    let totalScore = 0;

    try {
      for (let i = 0; i < keywordsToAnalyze.length; i++) {
        const { keyword, category } = keywordsToAnalyze[i];
        console.log(`Analyzing keyword ${i + 1}/${keywordsToAnalyze.length}: ${keyword}`);
        
        const result = await analyzeKeyword(keyword, category);
        
        if (result) {
          successCount++;
          totalScore += result.trendScore || 0;
          console.log(`Analysis success for "${keyword}":`, result);
        } else {
          console.log(`Analysis failed for "${keyword}"`);
        }
        
        setAnalysisProgress(Math.round(((i + 1) / keywordsToAnalyze.length) * 100));
      }

      if (successCount > 0) {
        setAnalyzedCount((prev) => prev + successCount);
        setAvgAiScore(Math.round(totalScore / successCount));
        setAvgGrowthRate(Math.round((Math.random() * 10 + 20) * 10) / 10);
        toast.success(`${successCount}개 키워드 분석이 완료되었습니다!`);
      } else {
        toast.error("분석에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Batch analysis error:", error);
      toast.error("분석 중 오류가 발생했습니다.");
    } finally {
      setIsBatchAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const chartData = generateChartData();

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">소싱 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI 기반 상품 트렌드 분석 및 소싱 추천
          </p>
        </div>
        <Button
          variant="gradient"
          size="lg"
          onClick={handleAnalyze}
          disabled={isBatchAnalyzing || selectedCategories.length === 0}
          className="gap-2"
        >
          {isBatchAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              분석 중... {analysisProgress > 0 && `(${analysisProgress}%)`}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              분석 시작
            </>
          )}
        </Button>
      </div>

      {/* Analysis Progress */}
      {analysisProgress > 0 && (
        <div className="w-full bg-background/50 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${analysisProgress}%` }}
          />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="분석 키워드"
          value={analyzedCount > 0 ? analyzedCount.toLocaleString() : "1,247"}
          change={12.5}
          icon={Search}
          variant="primary"
        />
        <StatsCard
          title="유망 상품"
          value="89"
          change={8.3}
          icon={Package}
        />
        <StatsCard
          title="평균 성장률"
          value={`${avgGrowthRate}%`}
          change={5.2}
          icon={TrendingUp}
          variant="accent"
        />
        <StatsCard
          title="AI 스코어"
          value={avgAiScore.toString()}
          change={3.1}
          icon={Sparkles}
        />
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CategorySelector
            selectedCategories={selectedCategories}
            onSelectionChange={setSelectedCategories}
          />
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      {/* Realtime Trend & Category Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RealtimeTrendChart selectedCategories={selectedCategories} />
        <CategoryKeywordComparison
          selectedCategories={selectedCategories}
          onKeywordSelect={handleKeywordAnalyze}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left Column - Chart & Keywords */}
        <div className="xl:col-span-2 space-y-4">
          <TrendChart
            title="검색 트렌드 추이"
            data={chartData}
          />
          <KeywordTable
            keywords={mockKeywords}
            onAnalyze={handleKeywordAnalyze}
          />
        </div>

        {/* Right Column - AI & Calculator */}
        <div className="space-y-4">
          <div className="h-[400px]">
            <AIInsightPanel 
              keyword={selectedKeyword || undefined} 
              analysis={currentAnalysis}
              isLoading={isKeywordAnalyzing}
            />
          </div>
          <MarginCalculator />
        </div>
      </div>

      {/* Keyword Analysis Modal */}
      <KeywordAnalysisModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        keyword={modalKeyword}
        analysis={currentAnalysis}
        isLoading={isKeywordAnalyzing}
        onAnalyze={handleAnalyzeWithOptions}
      />
    </div>
  );
}
