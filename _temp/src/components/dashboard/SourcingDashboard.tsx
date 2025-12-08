import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon,
  Play,
  Loader2,
  TrendingUp,
  Search,
  Target,
  Sparkles,
  Filter,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSourcingStore, NAVER_CATEGORIES, AGE_OPTIONS } from "@/store";
import { useNaverTrend } from "@/hooks/useNaverTrend";
import { useClaudeAnalyze } from "@/hooks/useClaudeAnalyze";
import { toast } from "sonner";

interface SourcingDashboardProps {
  onAnalysisComplete?: (data: any) => void;
}

export function SourcingDashboard({ onAnalysisComplete }: SourcingDashboardProps) {
  const {
    selectedCategories,
    startDate,
    endDate,
    device,
    gender,
    ages,
    settings,
    toggleCategory,
    setDateRange,
    setDevice,
    setGender,
    setAges,
    updateSettings,
  } = useSourcingStore();

  const { fetchTrend, isLoading: isTrendLoading, trendData } = useNaverTrend();
  const { analyzeWithClaude, isLoading: isAnalyzing, analysisData } = useClaudeAnalyze();

  const [startDateObj, setStartDateObj] = useState<Date | undefined>(
    startDate ? new Date(startDate) : undefined
  );
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(
    endDate ? new Date(endDate) : undefined
  );

  const isLoading = isTrendLoading || isAnalyzing;

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDateObj(date);
    if (date) {
      setDateRange(format(date, "yyyy-MM-dd"), endDate);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDateObj(date);
    if (date) {
      setDateRange(startDate, format(date, "yyyy-MM-dd"));
    }
  };

  const handleAnalyze = async () => {
    if (selectedCategories.length === 0) {
      toast.error("카테고리를 최소 1개 이상 선택해주세요.");
      return;
    }

    // 1. 네이버 트렌드 데이터 수집
    const trends = await fetchTrend({
      startDate,
      endDate,
      timeUnit: "month",
      category: selectedCategories,
      device,
      gender,
      ages,
    });

    if (!trends) return;

    // 2. Claude AI 분석
    const trendDataForAnalysis = trends.map((t: any) => ({
      keyword: t.title,
      historicalTrend: t.data.map((d: any) => ({
        date: d.period,
        value: d.ratio,
      })),
      growthRate: calculateGrowthRate(t.data),
    }));

    const analysis = await analyzeWithClaude({
      trendData: trendDataForAnalysis,
      userCriteria: {
        excludeClothing: settings.excludeClothing,
        maxVolume: settings.maxVolume,
        targetPlatform: settings.targetPlatform,
      },
      analysisType: "ranking",
    });

    if (analysis && onAnalysisComplete) {
      onAnalysisComplete(analysis);
    }
  };

  const calculateGrowthRate = (data: { period: string; ratio: number }[]) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-3).reduce((a, b) => a + b.ratio, 0) / 3;
    const old = data.slice(0, 3).reduce((a, b) => a + b.ratio, 0) / 3;
    return old > 0 ? ((recent - old) / old) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🛒 쿠팡 소싱 도우미</h1>
          <p className="text-muted-foreground text-sm">
            네이버 데이터랩 + AI 분석으로 유망 상품을 발굴하세요
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || selectedCategories.length === 0}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          분석 시작
        </Button>
      </div>

      {/* Date Range Selection */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            분석 기간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !startDateObj && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateObj ? format(startDateObj, "yyyy년 MM월 dd일", { locale: ko }) : "시작일 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDateObj}
                  onSelect={handleStartDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">~</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !endDateObj && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDateObj ? format(endDateObj, "yyyy년 MM월 dd일", { locale: ko }) : "종료일 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDateObj}
                  onSelect={handleEndDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            카테고리 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {NAVER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "p-3 rounded-lg border text-sm flex items-center gap-2 transition-all",
                  selectedCategories.includes(cat.id)
                    ? "bg-primary/10 border-primary/50 text-foreground"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            상세 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Device */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">기기</label>
              <Select value={device} onValueChange={(v) => setDevice(v as "" | "pc" | "mo")}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="pc">PC</SelectItem>
                  <SelectItem value="mo">모바일</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">성별</label>
              <Select value={gender} onValueChange={(v) => setGender(v as "" | "m" | "f")}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="m">남성</SelectItem>
                  <SelectItem value="f">여성</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">연령대</label>
              <Select
                value={ages.length > 0 ? ages[0] : ""}
                onValueChange={(v) => setAges(v ? [v] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {AGE_OPTIONS.map((age) => (
                    <SelectItem key={age.value} value={age.value}>
                      {age.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exclude Clothing */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">옵션</label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="excludeClothing"
                  checked={settings.excludeClothing}
                  onCheckedChange={(checked) =>
                    updateSettings({ excludeClothing: checked as boolean })
                  }
                />
                <label
                  htmlFor="excludeClothing"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  의류 카테고리 제외
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                {isTrendLoading
                  ? "네이버 데이터랩에서 트렌드 데이터를 수집 중입니다..."
                  : "Claude AI가 유망 키워드를 분석 중입니다..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results Preview */}
      {analysisData && !isLoading && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              분석 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {analysisData.analysisInsights || "분석이 완료되었습니다. 상세 결과를 확인하세요."}
            </p>
            {analysisData.top10Keywords && (
              <div className="flex flex-wrap gap-2">
                {analysisData.top10Keywords.slice(0, 5).map((kw: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-primary/20 text-sm font-medium"
                  >
                    {kw.keyword}
                  </span>
                ))}
                {analysisData.top10Keywords.length > 5 && (
                  <span className="px-3 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground">
                    +{analysisData.top10Keywords.length - 5}개 더보기
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
