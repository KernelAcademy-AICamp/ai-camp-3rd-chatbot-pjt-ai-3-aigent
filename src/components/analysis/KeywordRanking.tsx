import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Trophy,
  Target,
  Shield,
  Calendar,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RankedKeyword {
  rank: number;
  keyword: string;
  growthPotential: "상" | "중" | "하";
  competitionLevel: "상" | "중" | "하";
  reason: string;
  recommendedTiming: string;
  seasonalPattern: string;
  nicheKeywords: string[];
}

interface KeywordRankingProps {
  keywords: RankedKeyword[];
  onKeywordClick?: (keyword: RankedKeyword) => void;
}

export function KeywordRanking({ keywords, onKeywordClick }: KeywordRankingProps) {
  const getPotentialBadge = (potential: "상" | "중" | "하") => {
    switch (potential) {
      case "상":
        return { color: "text-emerald-500", bg: "bg-emerald-500/20", icon: TrendingUp, label: "성장↑" };
      case "중":
        return { color: "text-yellow-500", bg: "bg-yellow-500/20", icon: Minus, label: "유지→" };
      case "하":
        return { color: "text-red-500", bg: "bg-red-500/20", icon: TrendingDown, label: "하락↓" };
    }
  };

  const getCompetitionBadge = (level: "상" | "중" | "하") => {
    switch (level) {
      case "상":
        return { color: "text-red-500", bg: "bg-red-500/20", label: "치열" };
      case "중":
        return { color: "text-yellow-500", bg: "bg-yellow-500/20", label: "보통" };
      case "하":
        return { color: "text-emerald-500", bg: "bg-emerald-500/20", label: "여유" };
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-amber-500 text-white";
    if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800";
    if (rank === 3) return "bg-gradient-to-br from-amber-600 to-amber-700 text-white";
    return "bg-secondary text-muted-foreground";
  };

  if (!keywords || keywords.length === 0) {
    return (
      <Card className="bg-card/60 border-border/50">
        <CardContent className="p-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">분석 결과가 없습니다.</p>
          <p className="text-sm text-muted-foreground mt-1">
            카테고리를 선택하고 분석을 시작하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          TOP 10 유망 키워드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keywords.map((item) => {
            const potential = getPotentialBadge(item.growthPotential);
            const competition = getCompetitionBadge(item.competitionLevel);
            const PotentialIcon = potential.icon;

            return (
              <div
                key={item.rank}
                onClick={() => onKeywordClick?.(item)}
                className="p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0",
                      getRankStyle(item.rank)
                    )}
                  >
                    {item.rank}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {item.keyword}
                      </h3>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          potential.bg,
                          potential.color
                        )}
                      >
                        <PotentialIcon className="w-3 h-3" />
                        {potential.label}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          competition.bg,
                          competition.color
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        경쟁 {competition.label}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {item.reason}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.recommendedTiming}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {item.seasonalPattern}
                      </span>
                    </div>

                    {/* Niche Keywords */}
                    {item.nicheKeywords && item.nicheKeywords.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {item.nicheKeywords.slice(0, 3).map((niche, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-secondary text-xs"
                            >
                              {niche}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
