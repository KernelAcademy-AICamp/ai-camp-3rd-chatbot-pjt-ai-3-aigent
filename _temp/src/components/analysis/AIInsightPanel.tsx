import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, Loader2, RefreshCw, Copy, Check, TrendingUp, AlertTriangle, Users, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeywordAnalysis } from "@/hooks/useKeywordAnalysis";

interface AIInsightPanelProps {
  keyword?: string;
  analysis?: KeywordAnalysis | null;
  isLoading?: boolean;
}

export function AIInsightPanel({ keyword, analysis, isLoading = false }: AIInsightPanelProps) {
  const [copied, setCopied] = useState(false);
  
  const getPotentialLabel = (potential: string) => {
    switch (potential) {
      case "high": return "높음";
      case "medium": return "보통";
      case "low": return "낮음";
      default: return potential;
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case "high": return "text-emerald-500 bg-emerald-500/20";
      case "medium": return "text-yellow-500 bg-yellow-500/20";
      case "low": return "text-red-500 bg-red-500/20";
      default: return "text-muted-foreground bg-secondary";
    }
  };

  const copyToClipboard = () => {
    if (!analysis || !keyword) return;
    
    const text = `## ${keyword} 분석 리포트

### 트렌드 점수: ${analysis.trendScore}/100
### 성장 잠재력: ${getPotentialLabel(analysis.growthPotential)}
### 경쟁 강도: ${getPotentialLabel(analysis.competition)}

### 타겟 고객
${analysis.targetAudience}

### 계절성
${analysis.seasonality}

### 가격 전략
${analysis.pricingStrategy}

### 시장 인사이트
${analysis.marketInsight}

### AI 추천
${analysis.recommendation}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Default empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
        <Bot className="w-12 h-12 text-accent relative" />
      </div>
      <div>
        <p className="text-sm font-medium">AI 분석 대기 중</p>
        <p className="text-xs text-muted-foreground mt-1">
          키워드를 선택하면 AI가 분석해드립니다
        </p>
      </div>
      <div className="text-xs text-muted-foreground space-y-1 mt-2">
        <p>📊 트렌드 분석</p>
        <p>🗓️ 계절성 패턴</p>
        <p>🏆 경쟁 분석</p>
        <p>💡 소싱 추천</p>
      </div>
    </div>
  );

  // Loading state
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full" />
        <Bot className="w-12 h-12 text-accent relative animate-pulse" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        AI가 &quot;{keyword}&quot; 분석 중...
      </div>
    </div>
  );

  // Analysis results
  const renderAnalysisResults = () => {
    if (!analysis || !keyword) return null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold gradient-text">{keyword}</h3>
          <p className="text-xs text-muted-foreground">AI 분석 결과</p>
        </div>

        {/* Trend Score */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">트렌드 점수</span>
            <span className="text-xl font-bold text-primary">{analysis.trendScore}/100</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${analysis.trendScore}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">성장 잠재력</span>
            </div>
            <Badge className={cn("text-[10px]", getPotentialColor(analysis.growthPotential))}>
              {getPotentialLabel(analysis.growthPotential)}
            </Badge>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">경쟁 강도</span>
            </div>
            <Badge className={cn("text-[10px]", getPotentialColor(analysis.competition === "low" ? "high" : analysis.competition === "high" ? "low" : "medium"))}>
              {getPotentialLabel(analysis.competition)}
            </Badge>
          </div>
        </div>

        {/* Target Audience */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">타겟 고객</span>
          </div>
          <p className="text-xs text-muted-foreground">{analysis.targetAudience}</p>
        </div>

        {/* Related Keywords */}
        {analysis.relatedKeywords && analysis.relatedKeywords.length > 0 && (
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">관련 키워드</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.relatedKeywords.slice(0, 5).map((kw, i) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-background/50">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-500">AI 추천</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-4">{analysis.recommendation}</p>
        </div>
      </div>
    );
  };

  return (
    <Card variant="glow" className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            AI 인사이트
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyToClipboard}>
                {copied ? (
                  <Check className="w-4 h-4 text-chart-up" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin p-4">
          {isLoading ? renderLoadingState() : analysis ? renderAnalysisResults() : renderEmptyState()}
        </div>
      </CardContent>
    </Card>
  );
}
