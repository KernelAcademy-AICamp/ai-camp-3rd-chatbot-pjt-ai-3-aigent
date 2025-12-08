import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordData {
  rank: number;
  keyword: string;
  searchVolume: number;
  growthRate: number;
  competition: "낮음" | "중간" | "높음";
  aiScore: number;
}

interface KeywordTableProps {
  keywords: KeywordData[];
  onAnalyze?: (keyword: string) => void;
}

export function KeywordTable({ keywords, onAnalyze }: KeywordTableProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case "낮음":
        return "bg-chart-up/20 text-chart-up border-chart-up/30";
      case "중간":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "높음":
        return "bg-chart-down/20 text-chart-down border-chart-down/30";
      default:
        return "";
    }
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            인기 키워드 TOP 10
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs">
            전체보기
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {keywords.map((item) => (
            <div
              key={item.rank}
              className={cn(
                "group flex items-center gap-4 p-3 rounded-lg transition-all duration-200 cursor-pointer",
                "hover:bg-secondary/50",
                selectedKeyword === item.keyword && "bg-primary/10 border border-primary/20"
              )}
              onClick={() => setSelectedKeyword(item.keyword === selectedKeyword ? null : item.keyword)}
            >
              {/* Rank */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                  item.rank <= 3
                    ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {item.rank}
              </div>

              {/* Keyword Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.keyword}</span>
                  {item.aiScore >= 85 && (
                    <Sparkles className="w-4 h-4 text-accent shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>검색량: {item.searchVolume.toLocaleString()}</span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0", getCompetitionColor(item.competition))}
                  >
                    경쟁 {item.competition}
                  </Badge>
                </div>
              </div>

              {/* Growth Rate */}
              <div className="flex items-center gap-1.5">
                {item.growthRate > 0 ? (
                  <TrendingUp className="w-4 h-4 text-chart-up" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-chart-down" />
                )}
                <span
                  className={cn(
                    "font-semibold text-sm",
                    item.growthRate > 0 ? "text-chart-up" : "text-chart-down"
                  )}
                >
                  {item.growthRate > 0 ? "+" : ""}
                  {item.growthRate}%
                </span>
              </div>

              {/* AI Score */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${item.aiScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8">{item.aiScore}</span>
              </div>

              {/* Actions - Always visible analyze button */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs bg-primary/10 hover:bg-primary/20 border-primary/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze?.(item.keyword);
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  분석
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
