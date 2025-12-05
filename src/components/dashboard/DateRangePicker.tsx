import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

const presetRanges = [
  { label: "최근 1년", months: 12 },
  { label: "최근 2년", months: 24 },
  { label: "최근 3년", months: 36 },
  { label: "최근 5년", months: 60 },
];

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
}: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<number | null>(60);

  const applyPreset = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);

    onDateChange(
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0]
    );
    setActivePreset(months);
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          분석 기간 설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {presetRanges.map((preset) => (
              <Button
                key={preset.months}
                variant={activePreset === preset.months ? "default" : "secondary"}
                size="sm"
                className={cn(
                  "text-xs",
                  activePreset === preset.months && "glow-primary"
                )}
                onClick={() => applyPreset(preset.months)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  onDateChange(e.target.value, endDate);
                  setActivePreset(null);
                }}
                className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  onDateChange(startDate, e.target.value);
                  setActivePreset(null);
                }}
                className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Selected Range Display */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
            <p className="text-xs text-muted-foreground">선택된 기간</p>
            <p className="text-sm font-medium mt-1">
              {new Date(startDate).toLocaleDateString("ko-KR")} ~{" "}
              {new Date(endDate).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
