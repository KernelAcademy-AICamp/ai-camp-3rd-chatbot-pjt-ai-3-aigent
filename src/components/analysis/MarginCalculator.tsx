import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarginCalculator() {
  const [sellingPrice, setSellingPrice] = useState<string>("29900");
  const [costPrice, setCostPrice] = useState<string>("8000");
  const [shippingCost, setShippingCost] = useState<string>("3000");
  const [platformFee, setPlatformFee] = useState<string>("10.8");

  const calculation = useMemo(() => {
    const selling = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(costPrice) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const feeRate = parseFloat(platformFee) || 0;

    const fee = selling * (feeRate / 100);
    const totalCost = cost + shipping + fee;
    const netProfit = selling - totalCost;
    const marginRate = selling > 0 ? (netProfit / selling) * 100 : 0;

    return {
      fee: Math.round(fee),
      totalCost: Math.round(totalCost),
      netProfit: Math.round(netProfit),
      marginRate: marginRate.toFixed(1),
    };
  }, [sellingPrice, costPrice, shippingCost, platformFee]);

  const getMarginStatus = () => {
    const rate = parseFloat(calculation.marginRate);
    if (rate >= 30) return { color: "text-chart-up", label: "우수", bg: "bg-chart-up/20" };
    if (rate >= 20) return { color: "text-yellow-500", label: "양호", bg: "bg-yellow-500/20" };
    if (rate >= 10) return { color: "text-orange-500", label: "보통", bg: "bg-orange-500/20" };
    return { color: "text-chart-down", label: "주의", bg: "bg-chart-down/20" };
  };

  const status = getMarginStatus();

  return (
    <Card variant="glass" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          마진율 계산기
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">판매가 (원)</label>
            <Input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">원가 (원)</label>
            <Input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">배송비 (원)</label>
            <Input
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">수수료율 (%)</label>
            <Input
              type="number"
              value={platformFee}
              onChange={(e) => setPlatformFee(e.target.value)}
              className="bg-secondary/50"
              step="0.1"
            />
          </div>
        </div>

        {/* Results */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border/50 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">플랫폼 수수료</span>
            <span className="font-medium">{calculation.fee.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">총 비용</span>
            <span className="font-medium">{calculation.totalCost.toLocaleString()}원</span>
          </div>
          <div className="h-px bg-border/50 my-2" />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">순이익</span>
            <span
              className={cn(
                "text-lg font-bold",
                calculation.netProfit >= 0 ? "text-chart-up" : "text-chart-down"
              )}
            >
              {calculation.netProfit >= 0 ? "+" : ""}
              {calculation.netProfit.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Margin Rate Display */}
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

        {/* Tips */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            쿠팡 기준 수수료율 10.8%가 적용됩니다. 마진율 30% 이상을 권장합니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
