import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  Lightbulb,
  Target,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNicheKeyword, type NicheKeywordData } from "@/hooks/useNicheKeyword";
import { toast } from "sonner";

interface NicheKeywordFinderProps {
  initialKeyword?: string;
  onKeywordSelect?: (keyword: string) => void;
}

export function NicheKeywordFinder({ initialKeyword, onKeywordSelect }: NicheKeywordFinderProps) {
  const [keyword, setKeyword] = useState(initialKeyword || "");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { findNicheKeywords, isLoading, nicheData, getCompetitionBadge } = useNicheKeyword();

  const handleSearch = async () => {
    await findNicheKeywords(keyword, 10);
  };

  const handleCopyTitle = (title: string, idx: number) => {
    navigator.clipboard.writeText(title);
    setCopiedIdx(idx);
    toast.success("제품명이 복사되었습니다.");
    setTimeout(() => setCopiedIdx(null), 2000);
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
                placeholder="틈새 키워드를 발굴할 메인 키워드를 입력하세요"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading || !keyword.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4" />
              )}
              틈새 발굴
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
              <p className="text-muted-foreground">
                "{keyword}" 관련 틈새 키워드를 분석 중입니다...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {nicheData && !isLoading && (
        <div className="space-y-4">
          {/* Niche Keywords */}
          <Card className="bg-card/60 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                발굴된 틈새 키워드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nicheData.nicheKeywords?.map((niche, idx) => {
                  const badge = getCompetitionBadge(niche.competition);

                  return (
                    <div
                      key={idx}
                      onClick={() => onKeywordSelect?.(niche.keyword)}
                      className="p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{niche.keyword}</h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            badge.bg,
                            badge.color
                          )}
                        >
                          경쟁 {niche.competition}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          월 {niche.searchVolume?.toLocaleString() || "-"}회
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          CPC {niche.cpc?.toLocaleString() || "-"}원
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          연관도 {niche.relevanceScore || "-"}점
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{niche.reasoning}</p>

                      {/* Recommended Title */}
                      <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">추천 제품명</p>
                          <p className="text-sm font-medium truncate">{niche.recommendedTitle}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTitle(niche.recommendedTitle, idx);
                          }}
                          className="shrink-0"
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {(!nicheData.nicheKeywords || nicheData.nicheKeywords.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    분석된 틈새 키워드가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Title Suggestions */}
          {nicheData.titleSuggestions && nicheData.titleSuggestions.length > 0 && (
            <Card className="bg-card/60 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  추천 제품명
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nicheData.titleSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-sm font-medium">{suggestion.keyword}</p>
                      <div className="space-y-1">
                        {suggestion.titles.map((title, titleIdx) => (
                          <div
                            key={titleIdx}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                          >
                            <span className="text-sm">{title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopyTitle(title, idx * 100 + titleIdx)
                              }
                            >
                              {copiedIdx === idx * 100 + titleIdx ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ))}
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
      {!isLoading && !nicheData && (
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-12 text-center">
            <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">메인 키워드를 입력하고 틈새 키워드를 발굴하세요</p>
            <p className="text-sm text-muted-foreground mt-1">
              경쟁이 낮은 롱테일 키워드와 추천 제품명을 제공합니다
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
