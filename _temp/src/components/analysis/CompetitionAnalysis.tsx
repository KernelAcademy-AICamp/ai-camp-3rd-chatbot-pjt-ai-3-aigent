import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Loader2,
  Shield,
  Package,
  Star,
  TrendingUp,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoupangCompetition, type CompetitionData } from "@/hooks/useCoupangCompetition";

interface CompetitionAnalysisProps {
  initialKeyword?: string;
  onAnalysisComplete?: (data: CompetitionData) => void;
}

export function CompetitionAnalysis({ initialKeyword, onAnalysisComplete }: CompetitionAnalysisProps) {
  const [keyword, setKeyword] = useState(initialKeyword || "");
  const { analyzeCompetition, isLoading, competitionData, getCompetitionBadge } = useCoupangCompetition();

  const handleAnalyze = async () => {
    const result = await analyzeCompetition(keyword);
    if (result && onAnalysisComplete) {
      onAnalysisComplete(result);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-red-500";
    if (score >= 40) return "text-yellow-500";
    return "text-emerald-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "치열함";
    if (score >= 40) return "보통";
    return "진입 용이";
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-card/60 border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="쿠팡 경쟁강도를 분석할 키워드를 입력하세요"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !keyword.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              경쟁 분석
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">"{keyword}" 키워드의 경쟁강도를 분석 중입니다...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {competitionData && !isLoading && (
        <div className="space-y-4">
          {/* Competition Score */}
          <Card className="bg-card/60 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                경쟁강도 점수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      className="text-secondary"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      className={getScoreColor(competitionData.competitionScore)}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(competitionData.competitionScore / 100) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-3xl font-bold", getScoreColor(competitionData.competitionScore))}>
                      {competitionData.competitionScore}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        getCompetitionBadge(competitionData.competitionLevel).bg,
                        getCompetitionBadge(competitionData.competitionLevel).color
                      )}
                    >
                      {getScoreLabel(competitionData.competitionScore)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{competitionData.insights}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">총 상품 수</p>
                    <p className="text-2xl font-bold mt-1">
                      {competitionData.totalProducts.toLocaleString()}
                    </p>
                  </div>
                  <Package className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">평균 리뷰 수</p>
                    <p className="text-2xl font-bold mt-1">
                      {competitionData.avgReviewCount.toLocaleString()}
                    </p>
                  </div>
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">평균 가격</p>
                    <p className="text-2xl font-bold mt-1">
                      {competitionData.avgPrice.toLocaleString()}원
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">로켓배송 비율</p>
                    <p className="text-2xl font-bold mt-1">{competitionData.rocketDeliveryRatio}%</p>
                  </div>
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Range */}
          <Card className="bg-card/60 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">가격 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {competitionData.priceRange.min.toLocaleString()}원
                </span>
                <Progress value={50} className="flex-1" />
                <span className="text-sm text-muted-foreground">
                  {competitionData.priceRange.max.toLocaleString()}원
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          {competitionData.top10Products && competitionData.top10Products.length > 0 && (
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">상위 경쟁 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitionData.top10Products.slice(0, 5).map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{product.price.toLocaleString()}원</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {product.rating}
                          </span>
                          <span>리뷰 {product.reviewCount.toLocaleString()}</span>
                          {product.isRocketDelivery && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">
                              로켓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !competitionData && (
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">키워드를 입력하고 경쟁강도 분석을 시작하세요</p>
            <p className="text-sm text-muted-foreground mt-1">
              쿠팡 내 상품 수, 리뷰 수, 가격대 등을 분석합니다
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
