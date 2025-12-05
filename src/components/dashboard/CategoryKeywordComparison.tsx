import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/categories";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CategoryKeywordComparisonProps {
  selectedCategories: string[];
  onKeywordSelect?: (keyword: string) => void;
}

// Mock data for category keywords
const CATEGORY_KEYWORDS: Record<string, { keyword: string; volume: number; growth: number }[]> = {
  "fashion-accessories": [
    { keyword: "미니백", volume: 125000, growth: 32.5 },
    { keyword: "스마트워치 스트랩", volume: 98000, growth: 28.3 },
    { keyword: "선글라스 케이스", volume: 76000, growth: 15.2 },
  ],
  "furniture-interior": [
    { keyword: "LED 무드등", volume: 156000, growth: 45.2 },
    { keyword: "접이식 테이블", volume: 89000, growth: 22.8 },
    { keyword: "수납 선반", volume: 134000, growth: 18.5 },
  ],
  "life-health": [
    { keyword: "휴대용 가습기", volume: 203000, growth: 38.7 },
    { keyword: "마사지건", volume: 178000, growth: 25.4 },
    { keyword: "스마트 체중계", volume: 112000, growth: 19.5 },
  ],
  "digital-appliance": [
    { keyword: "무선 충전 마우스패드", volume: 145000, growth: 52.3 },
    { keyword: "미니 프로젝터", volume: 98000, growth: 35.8 },
    { keyword: "포터블 모니터", volume: 87000, growth: 28.9 },
  ],
  "food": [
    { keyword: "에어프라이어 종이호일", volume: 189000, growth: 42.1 },
    { keyword: "저당 과자", volume: 156000, growth: 33.5 },
    { keyword: "프로틴 음료", volume: 134000, growth: 27.8 },
  ],
  "sports-leisure": [
    { keyword: "접이식 캠핑 테이블", volume: 167000, growth: 48.5 },
    { keyword: "휴대용 선풍기", volume: 145000, growth: 35.2 },
    { keyword: "러닝 벨트", volume: 98000, growth: 22.3 },
  ],
  "beauty": [
    { keyword: "LED 마스크", volume: 178000, growth: 55.2 },
    { keyword: "미니 고데기", volume: 134000, growth: 28.9 },
    { keyword: "뷰티 디바이스", volume: 112000, growth: 23.5 },
  ],
  "baby-kids": [
    { keyword: "유아용 식판", volume: 145000, growth: 32.8 },
    { keyword: "아기 체온계", volume: 123000, growth: 25.4 },
    { keyword: "휴대용 젖병 소독기", volume: 98000, growth: 18.9 },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  "fashion-accessories": "hsl(168, 80%, 50%)",
  "furniture-interior": "hsl(280, 70%, 60%)",
  "life-health": "hsl(45, 90%, 55%)",
  "digital-appliance": "hsl(200, 80%, 55%)",
  "food": "hsl(120, 60%, 50%)",
  "sports-leisure": "hsl(340, 70%, 55%)",
  "beauty": "hsl(300, 60%, 60%)",
  "baby-kids": "hsl(30, 80%, 55%)",
};

type ViewMode = "list" | "chart";

export function CategoryKeywordComparison({
  selectedCategories,
  onKeywordSelect,
}: CategoryKeywordComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const allKeywords = useMemo(() => {
    const keywords: { keyword: string; volume: number; growth: number; category: string; categoryName: string }[] = [];
    selectedCategories.forEach((categoryId) => {
      const categoryKeywords = CATEGORY_KEYWORDS[categoryId] || [];
      const categoryName = CATEGORIES.find((c) => c.id === categoryId)?.name || categoryId;
      categoryKeywords.forEach((kw) => {
        keywords.push({ ...kw, category: categoryId, categoryName });
      });
    });
    return keywords.sort((a, b) => b.growth - a.growth);
  }, [selectedCategories]);

  const chartData = useMemo(() => {
    return allKeywords.slice(0, 8).map((kw) => ({
      name: kw.keyword.length > 8 ? kw.keyword.slice(0, 8) + "..." : kw.keyword,
      fullName: kw.keyword,
      volume: kw.volume,
      growth: kw.growth,
      category: kw.category,
    }));
  }, [allKeywords]);

  const getGrowthIcon = (growth: number) => {
    if (growth > 30) return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
    if (growth > 0) return <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />;
    if (growth < 0) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const getCategoryName = (id: string) => {
    return CATEGORIES.find((c) => c.id === id)?.name || id;
  };

  return (
    <Card variant="glass" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">카테고리별 인기 키워드</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("list")}
            >
              목록
            </Button>
            <Button
              variant={viewMode === "chart" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setViewMode("chart")}
            >
              <BarChart3 className="w-3 h-3" />
              차트
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedCategories.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            카테고리를 선택해주세요
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
            {allKeywords.slice(0, 10).map((kw, index) => (
              <div
                key={`${kw.category}-${kw.keyword}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                onClick={() => onKeywordSelect?.(kw.keyword)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{kw.keyword}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 mt-0.5"
                      style={{ borderColor: CATEGORY_COLORS[kw.category], color: CATEGORY_COLORS[kw.category] }}
                    >
                      {kw.categoryName}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">검색량</p>
                    <p className="text-sm font-medium">{kw.volume.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getGrowthIcon(kw.growth)}
                    <span className={`text-sm font-medium ${kw.growth > 30 ? "text-primary" : ""}`}>
                      {kw.growth > 0 ? "+" : ""}{kw.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
                  axisLine={{ stroke: "hsl(222, 30%, 20%)" }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
                  axisLine={{ stroke: "hsl(222, 30%, 20%)" }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 11%)",
                    border: "1px solid hsl(222, 30%, 25%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(215, 20%, 75%)" }}
                  formatter={(value: number, name: string, props: any) => [
                    value.toLocaleString(),
                    name === "growth" ? "성장률 (%)" : "검색량",
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Bar dataKey="volume" name="검색량" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || "hsl(168, 80%, 50%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
