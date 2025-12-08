import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  TrendingUp,
  Calculator,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "analysis", label: "트렌드 분석", icon: TrendingUp },
  { id: "ai-insights", label: "AI 인사이트", icon: Sparkles },
  { id: "calculator", label: "마진 계산기", icon: Calculator },
  { id: "history", label: "분석 히스토리", icon: History },
  { id: "settings", label: "설정", icon: Settings },
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg gradient-text">소싱마스터</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  isActive && "bg-primary/10 text-primary border border-primary/20",
                  collapsed && "justify-center px-2"
                )}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {!collapsed && (
                  <span className={cn(isActive && "font-medium")}>
                    {item.label}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="glass-card rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Powered by AI
              </p>
              <p className="text-xs text-primary font-medium mt-1">
                Claude + LSTM 분석
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
