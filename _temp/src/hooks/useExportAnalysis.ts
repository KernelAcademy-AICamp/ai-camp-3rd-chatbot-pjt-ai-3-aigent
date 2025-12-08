import { useCallback } from "react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import type { KeywordAnalysis } from "./useKeywordAnalysis";

export function useExportAnalysis() {
  const exportToPDF = useCallback(async (keyword: string, analysis: KeywordAnalysis) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(16, 24, 40);
      doc.rect(0, 0, pageWidth, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("소싱마스터", 20, 25);
      
      doc.setFontSize(12);
      doc.text("AI 키워드 분석 리포트", pageWidth - 20, 25, { align: "right" });
      
      // Content
      doc.setTextColor(0, 0, 0);
      let y = 55;
      
      // Keyword Title
      doc.setFontSize(20);
      doc.text(`키워드: ${keyword}`, 20, y);
      y += 15;
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`분석일시: ${new Date().toLocaleString("ko-KR")}`, 20, y);
      y += 20;
      
      // Scores Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("분석 결과 요약", 20, y);
      y += 10;
      
      doc.setFontSize(11);
      const growthLabel = analysis.growthPotential === "high" ? "높음" : analysis.growthPotential === "medium" ? "보통" : "낮음";
      const competitionLabel = analysis.competition === "high" ? "높음" : analysis.competition === "medium" ? "보통" : "낮음";
      
      doc.text(`• 트렌드 점수: ${analysis.trendScore}/100`, 25, y);
      y += 8;
      doc.text(`• 성장 잠재력: ${growthLabel}`, 25, y);
      y += 8;
      doc.text(`• 경쟁 강도: ${competitionLabel}`, 25, y);
      y += 8;
      doc.text(`• 타겟 고객: ${analysis.targetAudience}`, 25, y);
      y += 15;
      
      // Seasonality
      doc.setFontSize(14);
      doc.text("계절성", 20, y);
      y += 10;
      doc.setFontSize(11);
      const seasonalityLines = doc.splitTextToSize(analysis.seasonality, pageWidth - 50);
      doc.text(seasonalityLines, 25, y);
      y += seasonalityLines.length * 6 + 10;
      
      // Pricing Strategy
      doc.setFontSize(14);
      doc.text("가격 전략", 20, y);
      y += 10;
      doc.setFontSize(11);
      const pricingLines = doc.splitTextToSize(analysis.pricingStrategy, pageWidth - 50);
      doc.text(pricingLines, 25, y);
      y += pricingLines.length * 6 + 10;
      
      // Risk Factors
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text("위험 요소", 20, y);
      y += 10;
      doc.setFontSize(11);
      analysis.riskFactors.forEach((risk, idx) => {
        const riskLines = doc.splitTextToSize(`${idx + 1}. ${risk}`, pageWidth - 50);
        doc.text(riskLines, 25, y);
        y += riskLines.length * 6 + 4;
      });
      y += 6;
      
      // Related Keywords
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text("연관 키워드", 20, y);
      y += 10;
      doc.setFontSize(11);
      doc.text(analysis.relatedKeywords.join(", "), 25, y);
      y += 15;
      
      // Recommendation
      if (y > 200) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text("AI 추천 의견", 20, y);
      y += 10;
      doc.setFontSize(11);
      const recommendationLines = doc.splitTextToSize(analysis.recommendation, pageWidth - 50);
      doc.text(recommendationLines, 25, y);
      y += recommendationLines.length * 6 + 10;
      
      // Market Insight
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text("시장 인사이트", 20, y);
      y += 10;
      doc.setFontSize(11);
      const insightLines = doc.splitTextToSize(analysis.marketInsight, pageWidth - 50);
      doc.text(insightLines, 25, y);
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Powered by 소싱마스터 AI | 페이지 ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
      
      // Save
      const fileName = `소싱마스터_분석_${keyword}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF가 다운로드되었습니다.");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 내보내기 중 오류가 발생했습니다.");
    }
  }, []);

  const shareAnalysis = useCallback(async (keyword: string, analysis: KeywordAnalysis) => {
    const shareText = `🔍 소싱마스터 AI 분석 결과

📌 키워드: ${keyword}
📊 트렌드 점수: ${analysis.trendScore}/100
📈 성장 잠재력: ${analysis.growthPotential === "high" ? "높음" : analysis.growthPotential === "medium" ? "보통" : "낮음"}
⚔️ 경쟁 강도: ${analysis.competition === "high" ? "높음" : analysis.competition === "medium" ? "보통" : "낮음"}

💡 AI 추천: ${analysis.recommendation.slice(0, 100)}...

#소싱마스터 #이커머스 #상품소싱`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `소싱마스터 - ${keyword} 분석 결과`,
          text: shareText,
        });
        toast.success("공유되었습니다.");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await copyToClipboard(shareText);
        }
      }
    } else {
      await copyToClipboard(shareText);
    }
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("클립보드에 복사되었습니다.");
    } catch (error) {
      toast.error("복사 중 오류가 발생했습니다.");
    }
  };

  return {
    exportToPDF,
    shareAnalysis,
    copyToClipboard,
  };
}