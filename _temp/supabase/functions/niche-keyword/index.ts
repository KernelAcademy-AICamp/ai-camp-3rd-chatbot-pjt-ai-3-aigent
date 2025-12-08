import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NicheKeywordRequest {
  mainKeyword: string;
  maxResults?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mainKeyword, maxResults = 10 } = await req.json() as NicheKeywordRequest;

    if (!mainKeyword) {
      return new Response(
        JSON.stringify({ success: false, error: '키워드를 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lovable AI Gateway 또는 Claude API 사용
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

    if (!LOVABLE_API_KEY && !CLAUDE_API_KEY) {
      throw new Error('AI API 키가 설정되지 않았습니다.');
    }

    console.log(`Finding niche keywords for: ${mainKeyword}`);

    const systemPrompt = `당신은 쿠팡 및 네이버 쇼핑 키워드 분석 전문가입니다.
메인 키워드를 기반으로 경쟁이 낮고 전환율이 높은 롱테일 틈새 키워드를 발굴합니다.

다음 원칙을 따라주세요:
1. 검색 의도가 명확한 구체적 키워드
2. 경쟁이 낮아 신규 셀러도 상위 노출 가능한 키워드
3. 구매 전환율이 높은 상업적 키워드
4. 실제 소비자가 사용하는 자연스러운 표현

반드시 유효한 JSON 형식으로만 응답하세요.`;

    const userPrompt = `메인 키워드: "${mainKeyword}"

이 키워드에 대해 ${maxResults}개의 틈새 키워드를 추천해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "mainKeyword": "${mainKeyword}",
  "nicheKeywords": [
    {
      "keyword": "틈새 키워드",
      "searchVolume": 예상월간검색량(숫자),
      "competition": "상/중/하",
      "cpc": 예상클릭비용(숫자),
      "relevanceScore": 연관성점수(0-100),
      "recommendedTitle": "이 키워드를 활용한 추천 제품명",
      "reasoning": "이 키워드를 추천하는 이유"
    }
  ],
  "titleSuggestions": [
    {
      "keyword": "${mainKeyword}",
      "titles": ["추천 제품명 1", "추천 제품명 2", "추천 제품명 3"]
    }
  ]
}`;

    let response;
    let content;

    if (LOVABLE_API_KEY) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        throw new Error(`Lovable API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      content = aiResponse.choices?.[0]?.message?.content;
    } else {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': CLAUDE_API_KEY!,
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
        throw new Error(`Claude API error: ${response.status}`);
      }

      const claudeResponse = await response.json();
      content = claudeResponse.content?.[0]?.text;
    }

    console.log('AI response received');

    // JSON 파싱
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      result = {
        mainKeyword,
        nicheKeywords: [],
        titleSuggestions: [],
        rawResponse: content
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in niche-keyword:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '틈새 키워드 분석 중 오류가 발생했습니다.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
