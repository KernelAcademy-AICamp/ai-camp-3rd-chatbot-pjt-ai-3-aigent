import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  variant?: "default" | "primary" | "accent";
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
}: StatsCardProps) {
  const isPositive = change && change > 0;

  return (
    <Card
      variant="glass"
      className={cn(
        "overflow-hidden group hover:scale-[1.02] transition-all duration-300",
        variant === "primary" && "border-primary/30",
        variant === "accent" && "border-accent/30"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300",
              variant === "default" && "bg-secondary",
              variant === "primary" && "bg-primary/20 text-primary",
              variant === "accent" && "bg-accent/20 text-accent"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-3">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-chart-up" />
            ) : (
              <TrendingDown className="h-4 w-4 text-chart-down" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                isPositive ? "text-chart-up" : "text-chart-down"
              )}
            >
              {isPositive ? "+" : ""}
              {change}%
            </span>
            <span className="text-xs text-muted-foreground">vs 지난달</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
