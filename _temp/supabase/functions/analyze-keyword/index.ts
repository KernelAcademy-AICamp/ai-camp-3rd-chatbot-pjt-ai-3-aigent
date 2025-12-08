import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to format target audience object to readable Korean text
function formatTargetAudience(target: any): string {
  if (!target) return "일반 소비자";
  
  const parts: string[] = [];
  
  if (target.age || target.ageRange) {
    parts.push(`연령: ${target.age || target.ageRange}`);
  }
  if (target.gender) {
    parts.push(`성별: ${target.gender}`);
  }
  if (target.interests && Array.isArray(target.interests)) {
    parts.push(`관심사: ${target.interests.join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : "일반 소비자";
}

// Helper function to format seasonality object
function formatSeasonality(seasonality: any): string {
  if (!seasonality) return "분석 중";
  if (typeof seasonality === 'string') return seasonality;
  
  const parts: string[] = [];
  
  if (seasonality.peakSeason) {
    parts.push(`피크 시즌: ${seasonality.peakSeason}`);
  }
  if (seasonality.offSeason) {
    parts.push(`비수기: ${seasonality.offSeason}`);
  }
  if (seasonality.yearlyPattern) {
    parts.push(`연중 패턴: ${seasonality.yearlyPattern}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : "연중 꾸준한 수요";
}

// Helper function to format estimated sales object
function formatEstimatedSales(sales: any): string | null {
  if (!sales) return null;
  
  const parts: string[] = [];
  
  if (sales.initialSeller) {
    parts.push(`신규 셀러: ${sales.initialSeller}`);
  }
  if (sales.establishedSeller) {
    parts.push(`기존 셀러: ${sales.establishedSeller}`);
  }
  
  return parts.length > 0 ? parts.join(' / ') : JSON.stringify(sales);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, category, platform, analysisDepth, tone } = await req.json();
    
    if (!keyword) {
      return new Response(
        JSON.stringify({ error: '키워드를 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
      
      if (!userError && user) {
        userId = user.id;
        console.log(`Authenticated user: ${userId}`);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing keyword: ${keyword}, category: ${category || 'general'}, userId: ${userId}`);

    // Platform-specific context
    const platformContext: Record<string, string> = {
      coupang: '쿠팡 로켓배송/로켓그로스 기준으로 분석하고, 쿠팡 특유의 가격 경쟁과 리뷰 시스템을 고려해주세요.',
      naver: '네이버 스마트스토어 기준으로 분석하고, 네이버 쇼핑 검색 알고리즘과 브랜드스토어 전략을 고려해주세요.',
      gmarket: '11번가/G마켓 기준으로 분석하고, 오픈마켓 특유의 판매자 경쟁과 프로모션 전략을 고려해주세요.',
      amazon: '아마존 글로벌 셀링 기준으로 분석하고, FBA와 해외 배송 전략을 고려해주세요.',
      general: '국내 주요 이커머스 플랫폼 전체를 고려하여 분석해주세요.'
    };

    // Analysis depth configuration
    const depthConfig: Record<string, { items: string; detail: string }> = {
      simple: {
        items: '핵심 지표 5개',
        detail: '간결하게 핵심만'
      },
      standard: {
        items: '기본 분석 항목 10개',
        detail: '적절한 수준의 상세함으로'
      },
      deep: {
        items: '심층 분석 항목 15개 이상',
        detail: '매우 상세하고 구체적인 데이터와 함께'
      }
    };

    // Tone configuration
    const toneConfig: Record<string, string> = {
      professional: '전문적이고 데이터 중심적인 톤으로 분석해주세요. 객관적인 수치와 근거를 강조하세요.',
      friendly: '친근하고 이해하기 쉬운 톤으로 분석해주세요. 초보 셀러도 쉽게 이해할 수 있도록 설명하세요.',
      actionable: '실행 가능한 액션 아이템 중심으로 분석해주세요. "무엇을 해야 하는지"에 집중하세요.'
    };

    const selectedPlatform = platform || 'general';
    const selectedDepth = analysisDepth || 'standard';
    const selectedTone = tone || 'professional';

    const systemPrompt = `당신은 10년 이상 경력의 이커머스 상품 소싱 전문가입니다. 
${platformContext[selectedPlatform]}
${toneConfig[selectedTone]}
${depthConfig[selectedDepth].detail} 분석해주세요.

주어진 키워드에 대해 다음 정보를 JSON 형식으로 분석해주세요:

## 기본 분석 (필수)
1. trendScore: 트렌드 점수 (0-100, 현재 검색량과 관심도 기반)
2. growthPotential: 성장 잠재력 ("high", "medium", "low")
3. competition: 경쟁 강도 ("high", "medium", "low")
4. seasonality: 계절성 분석 (피크 시즌, 비수기, 연중 패턴)
5. targetAudience: 주요 타겟 고객층 (연령대, 성별, 관심사)
6. relatedKeywords: 관련 키워드 5-10개 (배열, 검색량 추정 포함)
7. pricingStrategy: 권장 가격대 전략 (경쟁가, 프리미엄가, 저가 전략)
8. riskFactors: 주의해야 할 위험 요소들 (배열)
9. recommendation: 소싱 추천 여부와 상세 이유
10. marketInsight: 시장 동향 인사이트

## 확장 분석 (심층 분석 시)
11. sourcingChannels: 추천 소싱 채널 (국내/해외, 도매/제조, 구체적 플랫폼명)
12. estimatedSales: 예상 월간 판매량 범위 (신규 셀러 기준)
13. marketingStrategy: 마케팅 전략 제안 (SNS, 키워드 광고, 인플루언서 등)
14. supplierTips: 공급업체 협상 팁
15. profitMargin: 예상 마진율 범위 (%)
16. entryBarrier: 진입 장벽 수준과 극복 방법
17. competitorAnalysis: 상위 경쟁자 특징 분석
18. productDifferentiation: 차별화 포인트 제안
19. inventoryStrategy: 재고 관리 전략 (초기 물량, 리오더 주기)
20. contentStrategy: 상품 상세페이지 및 콘텐츠 전략

반드시 유효한 JSON 형식으로만 응답하세요. 모든 한글 텍스트는 UTF-8로 인코딩되어야 합니다.`;

    const userPrompt = `키워드: "${keyword}"
${category ? `카테고리: ${category}` : ''}
플랫폼: ${selectedPlatform === 'general' ? '전체 플랫폼' : selectedPlatform}
분석 깊이: ${selectedDepth === 'simple' ? '간단 분석' : selectedDepth === 'deep' ? '심층 분석' : '표준 분석'}

이 키워드에 대한 ${depthConfig[selectedDepth].items}를 포함한 소싱 분석을 해주세요.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI 사용량을 초과했습니다. 크레딧을 충전해주세요.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI Response:", content);

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const rawAnalysis = JSON.parse(jsonMatch[0]);
        
        // Handle nested structure (basicAnalysis/extendedAnalysis) or flat structure
        const basic = rawAnalysis.basicAnalysis || rawAnalysis;
        const extended = rawAnalysis.extendedAnalysis || {};
        
        // Flatten and normalize the analysis object
        analysis = {
          trendScore: basic.trendScore || 75,
          growthPotential: basic.growthPotential || "medium",
          competition: basic.competition || "medium",
          seasonality: formatSeasonality(basic.seasonality),
          targetAudience: typeof basic.targetAudience === 'object' 
            ? formatTargetAudience(basic.targetAudience)
            : (basic.targetAudience || "일반 소비자"),
          relatedKeywords: Array.isArray(basic.relatedKeywords) 
            ? basic.relatedKeywords.map((kw: any) => typeof kw === 'object' ? kw.keyword : kw)
            : [],
          pricingStrategy: basic.pricingStrategy || "분석 필요",
          riskFactors: Array.isArray(basic.riskFactors) ? basic.riskFactors : [],
          recommendation: basic.recommendation || "분석 결과를 확인해주세요",
          marketInsight: basic.marketInsight || "상세 분석이 필요합니다",
          // Extended analysis
          sourcingChannels: Array.isArray(extended.sourcingChannels) 
            ? extended.sourcingChannels.join('\n') 
            : (extended.sourcingChannels || null),
          estimatedSales: typeof extended.estimatedSales === 'object'
            ? formatEstimatedSales(extended.estimatedSales)
            : (extended.estimatedSales || null),
          marketingStrategy: Array.isArray(extended.marketingStrategy)
            ? extended.marketingStrategy.join('\n')
            : (extended.marketingStrategy || null),
          supplierTips: Array.isArray(extended.supplierTips)
            ? extended.supplierTips.join('\n')
            : (extended.supplierTips || null),
          profitMargin: extended.profitMargin || null,
          entryBarrier: typeof extended.entryBarrier === 'object'
            ? `${extended.entryBarrier.level || ''}: ${(extended.entryBarrier.overcomingMethods || []).join(', ')}`
            : (extended.entryBarrier || null),
          competitorAnalysis: Array.isArray(extended.competitorAnalysis)
            ? extended.competitorAnalysis.join('\n')
            : (extended.competitorAnalysis || null),
          productDifferentiation: Array.isArray(extended.productDifferentiation)
            ? extended.productDifferentiation.join('\n')
            : (extended.productDifferentiation || null),
          inventoryStrategy: typeof extended.inventoryStrategy === 'object'
            ? JSON.stringify(extended.inventoryStrategy)
            : (extended.inventoryStrategy || null),
          contentStrategy: Array.isArray(extended.contentStrategy)
            ? extended.contentStrategy.join('\n')
            : (extended.contentStrategy || null),
        };
        
        console.log("Parsed analysis:", JSON.stringify(analysis, null, 2));
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      analysis = {
        trendScore: 75,
        growthPotential: "medium",
        competition: "medium",
        seasonality: "분석 중",
        targetAudience: "일반 소비자",
        relatedKeywords: [],
        pricingStrategy: "분석 결과를 확인해주세요",
        riskFactors: ["AI 응답 파싱 오류"],
        recommendation: content,
        marketInsight: "상세 분석이 필요합니다",
        sourcingChannels: null,
        estimatedSales: null,
        marketingStrategy: null,
        supplierTips: null,
        profitMargin: null,
        entryBarrier: null,
        competitorAnalysis: null,
        productDifferentiation: null,
        inventoryStrategy: null,
        contentStrategy: null,
      };
    }

    // Save to database only if user is authenticated
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error: insertError } = await supabase
          .from('keyword_analyses')
          .insert({
            keyword,
            category: category || null,
            user_id: userId,
            trend_score: analysis.trendScore,
            growth_potential: analysis.growthPotential,
            competition: analysis.competition,
            seasonality: analysis.seasonality,
            target_audience: analysis.targetAudience,
            related_keywords: analysis.relatedKeywords || [],
            pricing_strategy: analysis.pricingStrategy,
            risk_factors: analysis.riskFactors || [],
            recommendation: analysis.recommendation,
            market_insight: analysis.marketInsight,
            // Extended analysis fields
            sourcing_channels: analysis.sourcingChannels || null,
            estimated_sales: analysis.estimatedSales || null,
            marketing_strategy: analysis.marketingStrategy || null,
            supplier_tips: analysis.supplierTips || null,
            profit_margin: analysis.profitMargin || null,
            entry_barrier: analysis.entryBarrier || null,
            competitor_analysis: analysis.competitorAnalysis || null,
            product_differentiation: analysis.productDifferentiation || null,
            inventory_strategy: analysis.inventoryStrategy || null,
            content_strategy: analysis.contentStrategy || null,
            platform: selectedPlatform,
            analysis_depth: selectedDepth,
          });

        if (insertError) {
          console.error("Failed to save analysis:", insertError);
        } else {
          console.log("Analysis saved to database for user:", userId);
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
      }
    } else {
      console.log("Skipping database save - user not authenticated");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        keyword,
        analysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-keyword:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});