import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, Tag, AlertTriangle, Lightbulb, Target, BarChart3, Download, Share2, Package, ShoppingCart, Megaphone, Boxes, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExportAnalysis } from "@/hooks/useExportAnalysis";
import type { KeywordAnalysis, AnalysisOptions } from "@/hooks/useKeywordAnalysis";

interface KeywordAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyword: string;
  analysis: KeywordAnalysis | null;
  isLoading: boolean;
  onAnalyze?: (options: AnalysisOptions) => void;
}

export function KeywordAnalysisModal({
  open,
  onOpenChange,
  keyword,
  analysis,
  isLoading,
  onAnalyze,
}: KeywordAnalysisModalProps) {
  const { exportToPDF, shareAnalysis } = useExportAnalysis();

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case "high": return "text-emerald-500 bg-emerald-500/20";
      case "medium": return "text-yellow-500 bg-yellow-500/20";
      case "low": return "text-red-500 bg-red-500/20";
      default: return "text-muted-foreground bg-secondary";
    }
  };

  const getPotentialLabel = (potential: string) => {
    switch (potential) {
      case "high": return "높음";
      case "medium": return "보통";
      case "low": return "낮음";
      default: return potential;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-5 h-5 text-primary" />
              AI 키워드 분석: &quot;{keyword}&quot;
            </DialogTitle>
            {analysis && !isLoading && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => shareAnalysis(keyword, analysis)}
                  title="공유하기"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => exportToPDF(keyword, analysis)}
                  title="PDF 내보내기"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogDescription className="text-muted-foreground">
            AI가 키워드의 트렌드, 경쟁 강도, 성장 잠재력을 분석합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Analysis Options */}
        {onAnalyze && !isLoading && !analysis && (
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
            <h4 className="text-sm font-medium">분석 옵션 선택</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">플랫폼</label>
                <Select defaultValue="general" onValueChange={(v) => {
                  const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
                  if (btn) btn.dataset.platform = v;
                }}>
                  <SelectTrigger className="h-9 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">전체 플랫폼</SelectItem>
                    <SelectItem value="coupang">쿠팡</SelectItem>
                    <SelectItem value="naver">네이버 스마트스토어</SelectItem>
                    <SelectItem value="gmarket">G마켓/11번가</SelectItem>
                    <SelectItem value="amazon">아마존</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">분석 깊이</label>
                <Select defaultValue="standard" onValueChange={(v) => {
                  const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
                  if (btn) btn.dataset.depth = v;
                }}>
                  <SelectTrigger className="h-9 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">간단 분석</SelectItem>
                    <SelectItem value="standard">표준 분석</SelectItem>
                    <SelectItem value="deep">심층 분석</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">응답 스타일</label>
                <Select defaultValue="professional" onValueChange={(v) => {
                  const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
                  if (btn) btn.dataset.tone = v;
                }}>
                  <SelectTrigger className="h-9 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적</SelectItem>
                    <SelectItem value="friendly">친근한</SelectItem>
                    <SelectItem value="actionable">실행 중심</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              id="analyze-btn"
              className="w-full"
              onClick={(e) => {
                const btn = e.currentTarget;
                onAnalyze({
                  platform: (btn.dataset.platform || 'general') as AnalysisOptions['platform'],
                  analysisDepth: (btn.dataset.depth || 'standard') as AnalysisOptions['analysisDepth'],
                  tone: (btn.dataset.tone || 'professional') as AnalysisOptions['tone'],
                });
              }}
            >
              분석 시작
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">AI가 키워드를 분석하고 있습니다...</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Trend Score */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">트렌드 점수</span>
                <span className="text-2xl font-bold text-primary">{analysis.trendScore}/100</span>
              </div>
              <Progress value={analysis.trendScore} className="h-3" />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">성장 잠재력</span>
                </div>
                <Badge className={cn("font-medium", getPotentialColor(analysis.growthPotential))}>
                  {getPotentialLabel(analysis.growthPotential)}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">경쟁 강도</span>
                </div>
                <Badge className={cn("font-medium", getPotentialColor(analysis.competition === "low" ? "high" : analysis.competition === "high" ? "low" : "medium"))}>
                  {getPotentialLabel(analysis.competition)}
                </Badge>
              </div>
            </div>

            {/* Target Audience */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">타겟 고객층</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.targetAudience}</p>
            </div>

            {/* Seasonality */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">계절성</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.seasonality}</p>
            </div>

            {/* Related Keywords */}
            {analysis.relatedKeywords && analysis.relatedKeywords.length > 0 && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">관련 키워드</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.relatedKeywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="bg-background/50">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Strategy */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">가격 전략</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.pricingStrategy}</p>
            </div>

            {/* Extended Analysis Section - Deep Mode */}
            {(analysis.sourcingChannels || analysis.marketingStrategy || analysis.profitMargin) && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  심층 분석 결과
                </h4>
                
                {analysis.sourcingChannels && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">추천 소싱 채널</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.sourcingChannels}</p>
                  </div>
                )}

                {analysis.estimatedSales && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">예상 월간 판매량</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.estimatedSales}</p>
                  </div>
                )}

                {analysis.marketingStrategy && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">마케팅 전략</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.marketingStrategy}</p>
                  </div>
                )}

                {analysis.profitMargin && (
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">예상 마진율</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.profitMargin}</p>
                  </div>
                )}

                {analysis.inventoryStrategy && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Boxes className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">재고 관리 전략</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.inventoryStrategy}</p>
                  </div>
                )}

                {analysis.competitorAnalysis && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">경쟁자 분석</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.competitorAnalysis}</p>
                  </div>
                )}

                {analysis.productDifferentiation && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">차별화 포인트</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.productDifferentiation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Risk Factors */}
            {analysis.riskFactors && analysis.riskFactors.length > 0 && (
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">위험 요소</span>
                </div>
                <ul className="space-y-1">
                  {analysis.riskFactors.map((risk, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market Insight */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">시장 인사이트</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.marketInsight}</p>
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">AI 추천</span>
              </div>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>

            {/* Re-analyze button */}
            {onAnalyze && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  onAnalyze({});
                }}
              >
                다른 옵션으로 재분석
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            분석 결과가 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
