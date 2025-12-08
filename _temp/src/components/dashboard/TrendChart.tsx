import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DataPoint {
  label: string;
  value: number;
  predicted?: boolean;
}

interface TrendChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
}

export function TrendChart({ title, data, color = "hsl(168, 80%, 50%)" }: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeRange, setActiveRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("ALL");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    // Calculate scales
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
    const minValue = Math.min(...data.map(d => d.value)) * 0.9;
    const valueRange = maxValue - minValue;

    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
    const yScale = (v: number) => padding.top + chartHeight - ((v - minValue) / valueRange) * chartHeight;

    // Draw gradient area
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(data[0].value));
    data.forEach((point, i) => {
      ctx.lineTo(xScale(i), yScale(point.value));
    });
    ctx.lineTo(xScale(data.length - 1), height - padding.bottom);
    ctx.lineTo(xScale(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(data[0].value));
    data.forEach((point, i) => {
      if (i > 0) {
        const xPrev = xScale(i - 1);
        const yPrev = yScale(data[i - 1].value);
        const xCurr = xScale(i);
        const yCurr = yScale(point.value);
        const xMid = (xPrev + xCurr) / 2;
        ctx.bezierCurveTo(xMid, yPrev, xMid, yCurr, xCurr, yCurr);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw predicted section with dashed line
    const predictedStart = data.findIndex(d => d.predicted);
    if (predictedStart > 0) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(xScale(predictedStart - 1), yScale(data[predictedStart - 1].value));
      for (let i = predictedStart; i < data.length; i++) {
        ctx.lineTo(xScale(i), yScale(data[i].value));
      }
      ctx.strokeStyle = "hsl(280, 70%, 60%)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    data.forEach((point, i) => {
      ctx.beginPath();
      ctx.arc(xScale(i), yScale(point.value), 4, 0, Math.PI * 2);
      ctx.fillStyle = point.predicted ? "hsl(280, 70%, 60%)" : color;
      ctx.fill();
      ctx.strokeStyle = "hsl(222, 47%, 6%)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw axes labels
    ctx.fillStyle = "hsl(215, 20%, 55%)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";

    // X-axis labels (show every nth label)
    const labelStep = Math.ceil(data.length / 6);
    data.forEach((point, i) => {
      if (i % labelStep === 0 || i === data.length - 1) {
        ctx.fillText(point.label, xScale(i), height - 8);
      }
    });

    // Y-axis labels
    ctx.textAlign = "right";
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = minValue + (valueRange * i) / ySteps;
      const y = yScale(value);
      ctx.fillText(Math.round(value).toLocaleString(), padding.left - 8, y + 4);

      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.strokeStyle = "hsl(222, 30%, 15%)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [data, color]);

  return (
    <Card variant="glass" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="flex gap-1">
            {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((range) => (
              <Button
                key={range}
                variant={activeRange === range ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setActiveRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[200px]">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span>실제 데이터</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-accent rounded" style={{ borderStyle: "dashed" }} />
            <span>AI 예측</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
