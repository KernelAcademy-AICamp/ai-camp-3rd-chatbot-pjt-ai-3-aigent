import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { TrendingUp, Search, Package, Sparkles, Calculator, LayoutDashboard, History, ChevronRight, Play, AlertCircle, PieChart, DollarSign, Percent, Truck, Loader2, RefreshCw, Calendar, Target, Shield, LogOut, User, Download, Share2, Star, Trash2, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeywordAnalysis, KeywordAnalysis, AnalysisOptions } from "@/hooks/useKeywordAnalysis";
import { KeywordAnalysisModal } from "@/components/analysis/KeywordAnalysisModal";
import { useAnalysisHistory, AnalysisRecord } from "@/hooks/useAnalysisHistory";
import { useAuth } from "@/hooks/useAuth";
import { useExportAnalysis } from "@/hooks/useExportAnalysis";
import { toast } from "sonner";
import { ContactSection } from "@/components/ContactSection";
const CATEGORIES = [{
  id: "fashion-accessories",
  name: "패션잡화",
  icon: "👜"
}, {
  id: "furniture-interior",
  name: "가구/인테리어",
  icon: "🛋️"
}, {
  id: "life-health",
  name: "생활/건강",
  icon: "💊"
}, {
  id: "digital-appliance",
  name: "디지털/가전",
  icon: "📱"
}, {
  id: "food",
  name: "식품",
  icon: "🍎"
}, {
  id: "sports-leisure",
  name: "스포츠/레저",
  icon: "⚽"
}];
const mockKeywords = [{
  rank: 1,
  keyword: "무선 충전 마우스패드",
  growthRate: 45.2,
  volume: 125000,
  score: 92
}, {
  rank: 2,
  keyword: "접이식 캠핑 테이블",
  growthRate: 38.7,
  volume: 89000,
  score: 88
}, {
  rank: 3,
  keyword: "LED 무드등",
  growthRate: 32.1,
  volume: 156000,
  score: 85
}, {
  rank: 4,
  keyword: "휴대용 가습기",
  growthRate: 28.9,
  volume: 203000,
  score: 78
}, {
  rank: 5,
  keyword: "에어프라이어 종이호일",
  growthRate: 25.4,
  volume: 178000,
  score: 82
}];
import { MessageSquare } from "lucide-react";
import { Rocket } from "lucide-react";
const navItems = [{
  id: "dashboard",
  label: "대시보드",
  icon: LayoutDashboard
}, {
  id: "sourcing",
  label: "소싱 도우미",
  icon: Rocket
}, {
  id: "analysis",
  label: "트렌드 분석",
  icon: TrendingUp
}, {
  id: "calculator",
  label: "마진 계산기",
  icon: Calculator
}, {
  id: "history",
  label: "히스토리",
  icon: History
}, {
  id: "contact",
  label: "문의하기",
  icon: MessageSquare
}];

// Platform fee presets
const PLATFORM_PRESETS = [{
  name: "쿠팡",
  fee: 10.8
}, {
  name: "네이버",
  fee: 5.5
}, {
  name: "11번가",
  fee: 12.0
}, {
  name: "G마켓",
  fee: 13.0
}];
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    isLoading: isAuthLoading,
    isAuthenticated,
    signOut
  } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["fashion-accessories", "life-health"]);

  // AI Analysis
  const {
    analyzeKeyword,
    isAnalyzing,
    analysis
  } = useKeywordAnalysis();
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // History
  const {
    history,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
    toggleFavorite,
    deleteAnalysis
  } = useAnalysisHistory();
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AnalysisRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [growthFilter, setGrowthFilter] = useState<string>("all");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Filtered history
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.keyword.toLowerCase().includes(historySearchQuery.toLowerCase());
      const matchesGrowth = growthFilter === "all" || item.growth_potential === growthFilter;
      const matchesCompetition = competitionFilter === "all" || item.competition === competitionFilter;
      const matchesFavorite = favoriteFilter === "all" || favoriteFilter === "favorite" && item.is_favorite || favoriteFilter === "not-favorite" && !item.is_favorite;

      // Date range filter
      const itemDate = new Date(item.created_at);
      const matchesStartDate = !startDate || itemDate >= startDate;
      const matchesEndDate = !endDate || itemDate <= new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1);
      return matchesSearch && matchesGrowth && matchesCompetition && matchesFavorite && matchesStartDate && matchesEndDate;
    });
  }, [history, historySearchQuery, growthFilter, competitionFilter, favoriteFilter, startDate, endDate]);

  // Export
  const {
    exportToPDF,
    shareAnalysis
  } = useExportAnalysis();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Refetch history when analysis completes
  useEffect(() => {
    if (!isAnalyzing && analysis) {
      refetchHistory();
    }
  }, [isAnalyzing, analysis, refetchHistory]);
  const handleSignOut = async () => {
    const {
      error
    } = await signOut();
    if (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    } else {
      toast.success("로그아웃되었습니다.");
      navigate("/auth");
    }
  };
  const handleHistoryItemClick = (item: AnalysisRecord) => {
    setSelectedHistoryItem(item);
    setIsHistoryModalOpen(true);
  };
  const convertRecordToAnalysis = (record: AnalysisRecord): KeywordAnalysis => ({
    trendScore: record.trend_score,
    growthPotential: record.growth_potential as "high" | "medium" | "low",
    competition: record.competition as "high" | "medium" | "low",
    seasonality: record.seasonality,
    targetAudience: record.target_audience,
    relatedKeywords: record.related_keywords || [],
    pricingStrategy: record.pricing_strategy,
    riskFactors: record.risk_factors || [],
    recommendation: record.recommendation,
    marketInsight: record.market_insight,
    // Extended analysis fields
    sourcingChannels: record.sourcing_channels || undefined,
    estimatedSales: record.estimated_sales || undefined,
    marketingStrategy: record.marketing_strategy || undefined,
    supplierTips: record.supplier_tips || undefined,
    profitMargin: record.profit_margin || undefined,
    entryBarrier: record.entry_barrier || undefined,
    competitorAnalysis: record.competitor_analysis || undefined,
    productDifferentiation: record.product_differentiation || undefined,
    inventoryStrategy: record.inventory_strategy || undefined,
    contentStrategy: record.content_strategy || undefined
  });
  const handleKeywordClick = async (keyword: string) => {
    setSelectedKeyword(keyword);
    setIsModalOpen(true);
    // Don't auto-analyze, let user select options first
  };
  const handleAnalyzeWithOptions = async (options: AnalysisOptions) => {
    await analyzeKeyword(selectedKeyword, undefined, options);
  };

  // Margin Calculator State
  const [sellingPrice, setSellingPrice] = useState("29900");
  const [costPrice, setCostPrice] = useState("8000");
  const [shippingCost, setShippingCost] = useState("3000");
  const [platformFee, setPlatformFee] = useState("10.8");
  const calculation = useMemo(() => {
    const selling = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(costPrice) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const feeRate = parseFloat(platformFee) || 0;
    const fee = selling * (feeRate / 100);
    const totalCost = cost + shipping + fee;
    const netProfit = selling - totalCost;
    const marginRate = selling > 0 ? netProfit / selling * 100 : 0;
    const roi = totalCost > 0 ? netProfit / totalCost * 100 : 0;
    return {
      fee: Math.round(fee),
      totalCost: Math.round(totalCost),
      netProfit: Math.round(netProfit),
      marginRate: marginRate.toFixed(1),
      roi: roi.toFixed(1)
    };
  }, [sellingPrice, costPrice, shippingCost, platformFee]);
  const getMarginStatus = () => {
    const rate = parseFloat(calculation.marginRate);
    if (rate >= 30) return {
      color: "text-emerald-500",
      label: "우수",
      bg: "bg-emerald-500/20"
    };
    if (rate >= 20) return {
      color: "text-yellow-500",
      label: "양호",
      bg: "bg-yellow-500/20"
    };
    if (rate >= 10) return {
      color: "text-orange-500",
      label: "보통",
      bg: "bg-orange-500/20"
    };
    return {
      color: "text-red-500",
      label: "주의",
      bg: "bg-red-500/20"
    };
  };
  const status = getMarginStatus();
  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // Calculate cost breakdown for pie chart visualization
  const costBreakdown = useMemo(() => {
    const cost = parseFloat(costPrice) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const fee = calculation.fee;
    const total = cost + shipping + fee;
    if (total === 0) return {
      costPercent: 0,
      shippingPercent: 0,
      feePercent: 0
    };
    return {
      costPercent: cost / total * 100,
      shippingPercent: shipping / total * 100,
      feePercent: fee / total * 100
    };
  }, [costPrice, shippingCost, calculation.fee]);
  // Dashboard keyword input
  const [dashboardKeyword, setDashboardKeyword] = useState("");

  const handleDashboardAnalyze = () => {
    const keywordToAnalyze = dashboardKeyword.trim();
    if (keywordToAnalyze) {
      handleKeywordClick(keywordToAnalyze);
    } else {
      toast.error("분석할 키워드를 입력해주세요.");
    }
  };

  const renderDashboard = () => <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">쿠팡 대시보드</h1>
          <p className="text-muted-foreground text-sm">AI 기반 상품 트렌드 분석</p>
        </div>
      </div>

      {/* Keyword Search */}
      <Card className="mb-6 bg-card/60 border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="분석할 키워드를 입력하세요 (예: 무선 이어폰, 캠핑용품)"
                value={dashboardKeyword}
                onChange={(e) => setDashboardKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDashboardAnalyze()}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Button
              onClick={handleDashboardAnalyze}
              disabled={isAnalyzing || !dashboardKeyword.trim()}
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI 분석
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{
        label: "분석 키워드",
        value: "1,247",
        icon: Search,
        change: "+12.5%"
      }, {
        label: "유망 상품",
        value: "89",
        icon: Package,
        change: "+8.3%"
      }, {
        label: "평균 성장률",
        value: "23.4%",
        icon: TrendingUp,
        change: "+5.2%"
      }, {
        label: "AI 스코어",
        value: "78.5",
        icon: Sparkles,
        change: "+3.1%"
      }].map((stat, i) => <Card key={i} className="bg-card/60 border-border/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-emerald-500 mt-1">{stat.change}</p>
                </div>
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* Category Selection */}
      <Card className="mb-6 bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">카테고리 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {CATEGORIES.map(cat => <button key={cat.id} onClick={() => toggleCategory(cat.id)} className={cn("p-3 rounded-lg border text-sm flex items-center gap-2 transition-all", selectedCategories.includes(cat.id) ? "bg-primary/10 border-primary/50 text-foreground" : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-border")}>
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>)}
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            인기 키워드 TOP 10
            <span className="text-xs text-muted-foreground font-normal">클릭하여 AI 분석</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockKeywords.map(item => <div key={item.rank} onClick={() => handleKeywordClick(item.keyword)} className="flex items-center gap-4 p-3 rounded-lg hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-colors cursor-pointer group">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold", item.rank <= 3 ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {item.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium group-hover:text-primary transition-colors">{item.keyword}</p>
                  <p className="text-xs text-muted-foreground">검색량: {item.volume.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">+{item.growthRate}%</span>
                </div>
                <div className="w-20">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{
                  width: `${item.score}%`
                }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-right mt-1">AI {item.score}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>)}
          </div>
        </CardContent>
      </Card>
    </>;
  const renderCalculator = () => <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">마진 계산기</h1>
          <p className="text-muted-foreground text-sm">판매 마진율과 순이익을 계산하세요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-2 bg-card/60 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              비용 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Platform Presets */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">플랫폼 선택</label>
              <div className="flex gap-2">
                {PLATFORM_PRESETS.map(platform => <Button key={platform.name} variant={parseFloat(platformFee) === platform.fee ? "default" : "outline"} size="sm" onClick={() => setPlatformFee(platform.fee.toString())} className="flex-1">
                    {platform.name} ({platform.fee}%)
                  </Button>)}
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  판매가 (원)
                </label>
                <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="bg-secondary/50 text-lg font-semibold" placeholder="29,900" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  상품 원가 (원)
                </label>
                <Input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="bg-secondary/50 text-lg font-semibold" placeholder="8,000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  배송비 (원)
                </label>
                <Input type="number" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className="bg-secondary/50 text-lg font-semibold" placeholder="3,000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  수수료율 (%)
                </label>
                <Input type="number" value={platformFee} onChange={e => setPlatformFee(e.target.value)} className="bg-secondary/50 text-lg font-semibold" step="0.1" placeholder="10.8" />
              </div>
            </div>

            {/* Cost Breakdown Visual */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border/50">
              <p className="text-sm font-medium mb-3">비용 구성</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm flex-1">상품 원가</span>
                  <span className="text-sm font-medium">{parseFloat(costPrice || "0").toLocaleString()}원 ({costBreakdown.costPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm flex-1">배송비</span>
                  <span className="text-sm font-medium">{parseFloat(shippingCost || "0").toLocaleString()}원 ({costBreakdown.shippingPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm flex-1">플랫폼 수수료</span>
                  <span className="text-sm font-medium">{calculation.fee.toLocaleString()}원 ({costBreakdown.feePercent.toFixed(1)}%)</span>
                </div>
                {/* Visual Bar */}
                <div className="h-4 rounded-full overflow-hidden flex mt-2">
                  <div className="bg-blue-500 h-full" style={{
                  width: `${costBreakdown.costPercent}%`
                }} />
                  <div className="bg-amber-500 h-full" style={{
                  width: `${costBreakdown.shippingPercent}%`
                }} />
                  <div className="bg-purple-500 h-full" style={{
                  width: `${costBreakdown.feePercent}%`
                }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Main Result Card */}
          <Card className="bg-card/60 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                계산 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Cost */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                <p className="text-sm text-muted-foreground">총 비용</p>
                <p className="text-2xl font-bold">{calculation.totalCost.toLocaleString()}원</p>
              </div>

              {/* Net Profit */}
              <div className={cn("p-4 rounded-xl border", calculation.netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                <p className="text-sm text-muted-foreground">순이익</p>
                <p className={cn("text-3xl font-bold", calculation.netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {calculation.netProfit >= 0 ? "+" : ""}{calculation.netProfit.toLocaleString()}원
                </p>
              </div>

              {/* Margin Rate */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", status.bg)}>
                    <TrendingUp className={cn("w-5 h-5", status.color)} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">마진율</p>
                    <p className={cn("text-2xl font-bold", status.color)}>
                      {calculation.marginRate}%
                    </p>
                  </div>
                </div>
                <div className={cn("px-3 py-1.5 rounded-full text-xs font-medium", status.bg, status.color)}>
                  {status.label}
                </div>
              </div>

              {/* ROI */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                <p className="text-sm text-muted-foreground">투자수익률 (ROI)</p>
                <p className="text-xl font-bold">{calculation.roi}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">마진율 가이드</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      30% 이상: 우수 (권장)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      20-30%: 양호
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      10-20%: 보통
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      10% 미만: 주의 필요
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>;
  const renderPlaceholder = (title: string) => <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2">이 페이지는 준비 중입니다.</p>
      </div>
    </div>;

  // Trend Analysis State
  const [searchKeyword, setSearchKeyword] = useState("");
  const [trendAnalysisResult, setTrendAnalysisResult] = useState<KeywordAnalysis | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const handleTrendSearch = async () => {
    if (!searchKeyword.trim()) {
      toast.error("키워드를 입력해주세요.");
      return;
    }
    setIsSearching(true);
    const result = await analyzeKeyword(searchKeyword);
    setTrendAnalysisResult(result);
    setIsSearching(false);
  };
  const renderAnalysis = () => <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">트렌드 분석</h1>
          <p className="text-muted-foreground text-sm">키워드를 검색하여 상세 트렌드를 분석하세요</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6 bg-card/60 border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="분석할 키워드를 입력하세요 (예: 무선 이어폰, 캠핑용품)" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTrendSearch()} className="pl-10 bg-secondary/50" />
            </div>
            <Button onClick={handleTrendSearch} disabled={isSearching} className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI 분석
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {isSearching ? <Card className="bg-card/60 border-border/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">AI가 "{searchKeyword}" 키워드를 분석하고 있습니다...</p>
            </div>
          </CardContent>
        </Card> : trendAnalysisResult ? <div className="space-y-6">
          {/* Export/Share Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => shareAnalysis(searchKeyword, trendAnalysisResult)} className="gap-2">
              <Share2 className="w-4 h-4" />
              공유하기
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToPDF(searchKeyword, trendAnalysisResult)} className="gap-2">
              <Download className="w-4 h-4" />
              PDF 내보내기
            </Button>
          </div>

          {/* Score Overview */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">트렌드 점수</p>
                <p className="text-4xl font-bold text-primary">{trendAnalysisResult.trendScore}</p>
                <p className="text-xs text-muted-foreground mt-1">/100</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">성장 잠재력</p>
                <p className={cn("text-2xl font-bold", getGrowthBadgeStyle(trendAnalysisResult.growthPotential).split(" ")[1])}>
                  {getGrowthLabel(trendAnalysisResult.growthPotential)}
                </p>
                <div className={cn("mt-2 px-2 py-1 rounded-full text-xs w-fit", getGrowthBadgeStyle(trendAnalysisResult.growthPotential))}>
                  {trendAnalysisResult.growthPotential === "high" ? "⬆️ 상승세" : trendAnalysisResult.growthPotential === "medium" ? "➡️ 유지" : "⬇️ 하락세"}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">경쟁 강도</p>
                <p className={cn("text-2xl font-bold", getGrowthBadgeStyle(trendAnalysisResult.competition === "low" ? "high" : trendAnalysisResult.competition === "high" ? "low" : "medium").split(" ")[1])}>
                  {getGrowthLabel(trendAnalysisResult.competition)}
                </p>
                <div className={cn("mt-2 px-2 py-1 rounded-full text-xs w-fit", getGrowthBadgeStyle(trendAnalysisResult.competition === "low" ? "high" : trendAnalysisResult.competition === "high" ? "low" : "medium"))}>
                  {trendAnalysisResult.competition === "low" ? "🎯 진입 용이" : trendAnalysisResult.competition === "medium" ? "⚔️ 경쟁 존재" : "🔥 치열한 경쟁"}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">타겟 고객</p>
                <p className="text-sm font-medium line-clamp-2">{trendAnalysisResult.targetAudience}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-2 gap-6">
            {/* Trend Score Gauge */}
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  트렌드 분석 게이지
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="relative w-48 h-48">
                    {/* Background circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="80" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="16" />
                      <circle cx="96" cy="96" r="80" fill="none" stroke="url(#gradient)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${trendAnalysisResult.trendScore / 100 * 502} 502`} />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--accent))" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{trendAnalysisResult.trendScore}</span>
                      <span className="text-sm text-muted-foreground">점</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />0-40 낮음</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />40-70 보통</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />70-100 높음</span>
                </div>
              </CardContent>
            </Card>

            {/* Risk & Opportunity Analysis */}
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  위험 요소 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(trendAnalysisResult.riskFactors || []).map((risk, idx) => <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-red-500">{idx + 1}</span>
                      </div>
                      <p className="text-sm">{risk}</p>
                    </div>)}
                  {(!trendAnalysisResult.riskFactors || trendAnalysisResult.riskFactors.length === 0) && <p className="text-sm text-muted-foreground">분석된 위험 요소가 없습니다.</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Info */}
          <div className="grid grid-cols-3 gap-6">
            {/* Seasonality */}
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  계절성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{trendAnalysisResult.seasonality}</p>
              </CardContent>
            </Card>

            {/* Pricing Strategy */}
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  가격 전략
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{trendAnalysisResult.pricingStrategy}</p>
              </CardContent>
            </Card>

            {/* Market Insight */}
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  시장 인사이트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{trendAnalysisResult.marketInsight}</p>
              </CardContent>
            </Card>
          </div>

          {/* Related Keywords */}
          <Card className="bg-card/60 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                연관 키워드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(trendAnalysisResult.relatedKeywords || []).map((kw, idx) => <button key={idx} onClick={() => {
              setSearchKeyword(kw);
              handleTrendSearch();
            }} className="px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/20 text-sm transition-colors">
                    {kw}
                  </button>)}
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                AI 추천 의견
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{trendAnalysisResult.recommendation}</p>
            </CardContent>
          </Card>
        </div> : <Card className="bg-card/60 border-border/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">키워드를 검색하여 분석을 시작하세요</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                AI가 키워드의 트렌드 점수, 성장 잠재력, 경쟁 강도, 계절성 등을 종합적으로 분석합니다.
              </p>
              <div className="flex gap-2 mt-6">
                {["무선 이어폰", "캠핑용품", "홈카페"].map(kw => <Button key={kw} variant="outline" size="sm" onClick={() => {
              setSearchKeyword(kw);
            }}>
                    {kw}
                  </Button>)}
              </div>
            </div>
          </CardContent>
        </Card>}
    </>;
  const getGrowthBadgeStyle = (growth: string) => {
    switch (growth) {
      case "high":
        return "bg-emerald-500/20 text-emerald-500";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500";
      case "low":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };
  const getGrowthLabel = (growth: string) => {
    switch (growth) {
      case "high":
        return "높음";
      case "medium":
        return "보통";
      case "low":
        return "낮음";
      default:
        return growth;
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const renderHistory = () => <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">분석 히스토리</h1>
          <p className="text-muted-foreground text-sm">과거 키워드 분석 결과를 조회하세요</p>
        </div>
        <Button onClick={() => refetchHistory()} variant="outline" className="gap-2" disabled={isHistoryLoading}>
          <RefreshCw className={cn("w-4 h-4", isHistoryLoading && "animate-spin")} />
          새로고침
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="키워드 검색..." value={historySearchQuery} onChange={e => setHistorySearchQuery(e.target.value)} className="pl-10 bg-card/60 border-border/50" />
        </div>
        <Select value={growthFilter} onValueChange={setGrowthFilter}>
          <SelectTrigger className="w-[140px] bg-card/60 border-border/50">
            <SelectValue placeholder="성장잠재력" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">성장: 전체</SelectItem>
            <SelectItem value="high">고성장</SelectItem>
            <SelectItem value="medium">중간</SelectItem>
            <SelectItem value="low">저성장</SelectItem>
          </SelectContent>
        </Select>
        <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
          <SelectTrigger className="w-[140px] bg-card/60 border-border/50">
            <SelectValue placeholder="경쟁도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">경쟁: 전체</SelectItem>
            <SelectItem value="low">저경쟁</SelectItem>
            <SelectItem value="medium">중간</SelectItem>
            <SelectItem value="high">고경쟁</SelectItem>
          </SelectContent>
        </Select>
        <Select value={favoriteFilter} onValueChange={setFavoriteFilter}>
          <SelectTrigger className="w-[140px] bg-card/60 border-border/50">
            <SelectValue placeholder="즐겨찾기" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">즐겨찾기: 전체</SelectItem>
            <SelectItem value="favorite">⭐ 즐겨찾기만</SelectItem>
            <SelectItem value="not-favorite">일반 항목만</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal bg-card/60 border-border/50", !startDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "MM/dd") : "시작일"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal bg-card/60 border-border/50", !endDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "MM/dd") : "종료일"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && <Button variant="ghost" size="icon" onClick={() => {
        setStartDate(undefined);
        setEndDate(undefined);
      }} className="h-10 w-10" title="날짜 필터 초기화">
            <X className="h-4 w-4" />
          </Button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">총 분석 횟수</p>
                <p className="text-2xl font-bold mt-1">{history.length}</p>
              </div>
              <History className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">고성장 키워드</p>
                <p className="text-2xl font-bold mt-1">{filteredHistory.filter(h => h.growth_potential === "high").length}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">평균 트렌드 점수</p>
                <p className="text-2xl font-bold mt-1">
                  {filteredHistory.length > 0 ? Math.round(filteredHistory.reduce((acc, h) => acc + h.trend_score, 0) / filteredHistory.length) : 0}
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">저경쟁 키워드</p>
                <p className="text-2xl font-bold mt-1">{filteredHistory.filter(h => h.competition === "low").length}</p>
              </div>
              <Target className="w-5 h-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">분석 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {isHistoryLoading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> : filteredHistory.length === 0 ? <div className="text-center py-12">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              {history.length === 0 ? <>
                  <p className="text-muted-foreground">아직 분석 기록이 없습니다.</p>
                  <p className="text-sm text-muted-foreground mt-1">대시보드에서 키워드를 클릭하여 분석을 시작하세요.</p>
                  <Button className="mt-4" onClick={() => setCurrentPage("dashboard")}>
                    대시보드로 이동
                  </Button>
                </> : <>
                  <p className="text-muted-foreground">검색 결과가 없습니다.</p>
                  <p className="text-sm text-muted-foreground mt-1">다른 검색어나 필터를 사용해보세요.</p>
                </>}
            </div> : <div className="space-y-2">
              {filteredHistory.map(item => <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors group">
                  {/* Favorite Button */}
                  <button onClick={e => {
              e.stopPropagation();
              toggleFavorite(item.id, item.is_favorite);
            }} className="shrink-0 p-1.5 rounded-lg hover:bg-secondary transition-colors" title={item.is_favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}>
                    <Star className={cn("w-5 h-5 transition-colors", item.is_favorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-yellow-500")} />
                  </button>

                  {/* Clickable Area */}
                  <div onClick={() => handleHistoryItemClick(item)} className="flex items-center gap-4 flex-1 cursor-pointer">
                    {/* Trend Score */}
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0", item.trend_score >= 80 ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : item.trend_score >= 60 ? "bg-emerald-500/20 text-emerald-500" : "bg-secondary text-muted-foreground")}>
                      {item.trend_score}
                    </div>
                    
                    {/* Keyword & Meta */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold group-hover:text-primary transition-colors truncate">
                        {item.keyword}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.created_at)}
                        </span>
                        {item.category && <span className="px-2 py-0.5 rounded bg-secondary">
                            {item.category}
                          </span>}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getGrowthBadgeStyle(item.growth_potential))}>
                        성장 {getGrowthLabel(item.growth_potential)}
                      </span>
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getGrowthBadgeStyle(item.competition === "low" ? "high" : item.competition === "high" ? "low" : "medium"))}>
                        <Shield className="w-3 h-3 inline mr-1" />
                        경쟁 {getGrowthLabel(item.competition)}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>

                  {/* Delete Button */}
                  <button onClick={e => {
              e.stopPropagation();
              if (confirm("이 분석 기록을 삭제하시겠습니까?")) {
                deleteAnalysis(item.id);
              }
            }} className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" title="삭제">
                    <Trash2 className="w-5 h-5 text-muted-foreground hover:text-red-500 transition-colors" />
                  </button>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </>;
  if (isAuthLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 p-4 flex flex-col fixed h-screen">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            소싱마스터
          </span>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return <button key={item.id} onClick={() => {
            if (item.id === "sourcing") {
              navigate("/sourcing");
            } else {
              setCurrentPage(item.id);
            }
          }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary")}>
                <Icon className="w-5 h-5" />
                {item.label}
              </button>;
        })}
        </nav>

        {/* User Info */}
        <div className="space-y-3">
          {user && <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.user_metadata?.display_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full mt-2 text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>}
          
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground">Powered by</p>
            <p className="text-xs font-medium text-primary">Lovable AI + 데이터 분석</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-6">
        {currentPage === "dashboard" && renderDashboard()}
        {currentPage === "calculator" && renderCalculator()}
        {currentPage === "analysis" && renderAnalysis()}
        {currentPage === "history" && renderHistory()}
        {currentPage === "contact" && <ContactSection />}
      </main>

      {/* AI Analysis Modal */}
      <KeywordAnalysisModal open={isModalOpen} onOpenChange={setIsModalOpen} keyword={selectedKeyword} analysis={analysis} isLoading={isAnalyzing} onAnalyze={handleAnalyzeWithOptions} />

      {/* History Item Modal */}
      {selectedHistoryItem && <KeywordAnalysisModal open={isHistoryModalOpen} onOpenChange={open => {
      setIsHistoryModalOpen(open);
      if (!open) {
        setSelectedHistoryItem(null);
      }
    }} keyword={selectedHistoryItem.keyword} analysis={isAnalyzing ? null : convertRecordToAnalysis(selectedHistoryItem)} isLoading={isAnalyzing} onAnalyze={async options => {
      await analyzeKeyword(selectedHistoryItem.keyword, undefined, options);
      setSelectedHistoryItem(null);
      setIsHistoryModalOpen(false);
      setSelectedKeyword(selectedHistoryItem.keyword);
      setIsModalOpen(true);
    }} />}
    </div>;
};
export default Index;