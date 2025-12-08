import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package,
  Shield,
  Lightbulb,
  History,
  LogOut,
  User,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { SourcingDashboard } from "@/components/dashboard/SourcingDashboard";
import { KeywordRanking } from "@/components/analysis/KeywordRanking";
import { CompetitionAnalysis } from "@/components/analysis/CompetitionAnalysis";
import { NicheKeywordFinder } from "@/components/analysis/NicheKeywordFinder";

const navItems = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "competition", label: "경쟁분석", icon: Shield },
  { id: "niche", label: "틈새 키워드", icon: Lightbulb },
  { id: "history", label: "히스토리", icon: History },
];

export default function Sourcing() {
  const navigate = useNavigate();
  const { user, signOut, isLoading: isAuthLoading, isAuthenticated, isDemoMode } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");

  // Redirect to auth if not authenticated (check after loading is complete)
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && !isDemoMode) {
      navigate("/auth");
    }
  }, [isAuthLoading, isAuthenticated, isDemoMode, navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    } else {
      toast.success("로그아웃되었습니다.");
      navigate("/auth");
    }
  };

  const handleAnalysisComplete = (data: any) => {
    setAnalysisResult(data);
  };

  const handleKeywordClick = (keyword: any) => {
    setSelectedKeyword(keyword.keyword);
    setCurrentPage("competition");
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <SourcingDashboard onAnalysisComplete={handleAnalysisComplete} />
            {analysisResult && analysisResult.top10Keywords && (
              <KeywordRanking
                keywords={analysisResult.top10Keywords}
                onKeywordClick={handleKeywordClick}
              />
            )}
          </div>
        );

      case "competition":
        return <CompetitionAnalysis initialKeyword={selectedKeyword} />;

      case "niche":
        return (
          <NicheKeywordFinder
            initialKeyword={selectedKeyword}
            onKeywordSelect={(kw) => {
              setSelectedKeyword(kw);
              setCurrentPage("competition");
            }}
          />
        );

      case "history":
        return (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">분석 히스토리</p>
            <p className="text-sm text-muted-foreground mt-1">
              이전 분석 결과를 확인할 수 있습니다.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - will redirect via useEffect
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 p-4 flex flex-col fixed h-screen">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            소싱도우미
          </span>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="space-y-3">
          {user && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.user_metadata?.display_name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          )}

          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground">Powered by</p>
            <p className="text-xs font-medium text-primary">Claude AI + 네이버 데이터랩</p>
          </div>

          {/* Link to original */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="w-full"
          >
            기존 대시보드로
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-6">{renderContent()}</main>
    </div>
  );
}
