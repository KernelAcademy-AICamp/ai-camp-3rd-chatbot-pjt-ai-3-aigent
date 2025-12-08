import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrendDataItem {
  keyword: string;
  historicalTrend: { date: string; value: number }[];
  lstmPrediction?: { date: string; value: number }[];
  growthRate: number;
}

interface UserCriteria {
  excludeClothing: boolean;
  maxVolume: string;
  targetPlatform: string;
}

interface ClaudeAnalyzeRequest {
  trendData: TrendDataItem[];
  userCriteria: UserCriteria;
  analysisType: "ranking" | "niche_keyword" | "product_name";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trendData, userCriteria, analysisType } = await req.json() as ClaudeAnalyzeRequest;

    if (!trendData || trendData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '분석할 트렌드 데이터가 없습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API 키가 설정되지 않았습니다.');
    }

    console.log(`Analyzing ${trendData.length} keywords with Claude AI, type: ${analysisType}`);

    const systemPrompt = `당신은 숙련된 온라인 쇼핑몰 소싱 전문가입니다.
특히 쿠팡 마켓플레이스에 대한 깊은 이해를 가지고 있습니다.

분석 기준:
1. 부피가 크지 않은 제품 (택배 배송 가능)
2. ${userCriteria.excludeClothing ? '의류 카테고리 제외' : '의류 포함'}
3. 쿠팡 소비자 검색 패턴 기반
4. 목표 플랫폼: ${userCriteria.targetPlatform}

반드시 유효한 JSON 형식으로만 응답하세요.`;

    let userPrompt = '';

    if (analysisType === 'ranking') {
      userPrompt = `다음 트렌드 데이터를 분석하여 TOP 10 유망 키워드를 선정해주세요.

트렌드 데이터:
${JSON.stringify(trendData, null, 2)}

사용자 조건:
${JSON.stringify(userCriteria, null, 2)}

다음 JSON 형식으로 응답해주세요:
{
  "top10Keywords": [
    {
      "rank": 1,
      "keyword": "키워드명",
      "growthPotential": "상/중/하",
      "competitionLevel": "상/중/하",
      "reason": "유망한 이유 상세 설명",
      "recommendedTiming": "최적 진입 시기",
      "seasonalPattern": "계절성 패턴",
      "nicheKeywords": ["틈새 키워드1", "틈새 키워드2", "틈새 키워드3"]
    }
  ],
  "analysisInsights": "전체 분석 인사이트"
}`;
    } else if (analysisType === 'niche_keyword') {
      userPrompt = `다음 키워드들에 대해 경쟁 회피 가능한 틈새 키워드를 추천해주세요.

메인 키워드:
${trendData.map(t => t.keyword).join(', ')}

각 키워드에 대해 3-5개의 롱테일 틈새 키워드를 제안하고, 추천 제품명도 함께 제시해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "nicheAnalysis": [
    {
      "mainKeyword": "메인 키워드",
      "nicheKeywords": [
        {
          "keyword": "틈새 키워드",
          "expectedSearchVolume": "예상 월간 검색량",
          "competition": "상/중/하",
          "recommendedTitle": "추천 제품명"
        }
      ]
    }
  ],
  "insights": "전체 인사이트"
}`;
    } else {
      userPrompt = `다음 키워드들에 대해 최적화된 제품명을 추천해주세요.

키워드:
${trendData.map(t => t.keyword).join(', ')}

쿠팡 검색 알고리즘과 소비자 클릭률을 고려한 제품명 3개씩 제안해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "productNames": [
    {
      "keyword": "키워드",
      "titles": ["제품명1", "제품명2", "제품명3"],
      "reasoning": "제품명 선정 이유"
    }
  ]
}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('Claude API 인증에 실패했습니다.');
      }
      if (response.status === 429) {
        throw new Error('API 호출 한도를 초과했습니다.');
      }
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    const claudeResponse = await response.json();
    const content = claudeResponse.content?.[0]?.text;

    console.log('Claude response received, length:', content?.length);

    // JSON 파싱
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      analysisResult = { rawResponse: content };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in claude-analyze:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
