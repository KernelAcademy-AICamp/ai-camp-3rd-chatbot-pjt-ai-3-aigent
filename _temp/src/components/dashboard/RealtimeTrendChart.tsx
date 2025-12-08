import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/data/categories";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RealtimeTrendChartProps {
  selectedCategories: string[];
}

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

const generateCategoryData = (categoryId: string, baseValue: number) => {
  const now = new Date();
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const noise = Math.random() * 20 - 10;
    const trend = (12 - i) * (categoryId.charCodeAt(0) % 5);
    data.push({
      month: `${date.getMonth() + 1}월`,
      value: Math.round(baseValue + trend + noise + Math.sin(i / 2) * 10),
    });
  }
  return data;
};

export function RealtimeTrendChart({ selectedCategories }: RealtimeTrendChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const generateData = () => {
      const baseData: any[] = [];
      for (let i = 0; i < 12; i++) {
        const now = new Date();
        now.setMonth(now.getMonth() - (11 - i));
        baseData.push({ month: `${now.getMonth() + 1}월` });
      }

      selectedCategories.forEach((categoryId) => {
        const categoryData = generateCategoryData(categoryId, 50 + Math.random() * 50);
        categoryData.forEach((item, index) => {
          baseData[index][categoryId] = item.value;
        });
      });

      setChartData(baseData);
      setLastUpdated(new Date());
    };

    generateData();

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(generateData, 30000);
    return () => clearInterval(interval);
  }, [selectedCategories]);

  const getCategoryName = (id: string) => {
    return CATEGORIES.find((c) => c.id === id)?.name || id;
  };

  return (
    <Card variant="glass" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">실시간 카테고리 트렌드</CardTitle>
          <Badge variant="outline" className="text-xs">
            마지막 업데이트: {lastUpdated.toLocaleTimeString("ko-KR")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(222, 30%, 20%)" }}
              />
              <YAxis
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(222, 30%, 20%)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 11%)",
                  border: "1px solid hsl(222, 30%, 25%)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(215, 20%, 75%)" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span style={{ color: "hsl(215, 20%, 75%)" }}>
                    {getCategoryName(value)}
                  </span>
                )}
              />
              {selectedCategories.map((categoryId) => (
                <Line
                  key={categoryId}
                  type="monotone"
                  dataKey={categoryId}
                  name={categoryId}
                  stroke={CATEGORY_COLORS[categoryId] || "hsl(168, 80%, 50%)"}
                  strokeWidth={2}
                  dot={{ fill: CATEGORY_COLORS[categoryId], strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
