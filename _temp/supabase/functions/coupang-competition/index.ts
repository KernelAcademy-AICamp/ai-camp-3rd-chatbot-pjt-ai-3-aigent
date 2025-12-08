import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoupangCompetitionRequest {
  keyword: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json() as CoupangCompetitionRequest;

    if (!keyword) {
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

    console.log(`Analyzing competition for: ${keyword}`);

    const systemPrompt = `당신은 쿠팡 마켓플레이스 경쟁 분석 전문가입니다.
키워드를 기반으로 쿠팡 내 경쟁 상황을 분석하고 인사이트를 제공합니다.

실제 쿠팡 시장 데이터를 기반으로 현실적인 추정치를 제공해주세요.
반드시 유효한 JSON 형식으로만 응답하세요.`;

    const userPrompt = `키워드: "${keyword}"

이 키워드에 대한 쿠팡 경쟁강도 분석을 수행해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "keyword": "${keyword}",
  "totalProducts": 예상총상품수(숫자),
  "avgReviewCount": 평균리뷰수(숫자),
  "avgPrice": 평균가격(숫자),
  "priceRange": {
    "min": 최저가(숫자),
    "max": 최고가(숫자)
  },
  "top10Products": [
    {
      "name": "상품명",
      "price": 가격(숫자),
      "reviewCount": 리뷰수(숫자),
      "rating": 평점(숫자),
      "isRocketDelivery": true/false
    }
  ],
  "rocketDeliveryRatio": 로켓배송비율(0-100),
  "competitionScore": 경쟁강도점수(1-100),
  "competitionLevel": "상/중/하",
  "insights": "시장 진입 전략 및 주의사항에 대한 상세 인사이트"
}

참고: 실제 쿠팡 시장 데이터를 기반으로 현실적인 수치를 제공해주세요.`;

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
        keyword,
        totalProducts: 0,
        avgReviewCount: 0,
        avgPrice: 0,
        priceRange: { min: 0, max: 0 },
        top10Products: [],
        rocketDeliveryRatio: 0,
        competitionScore: 50,
        competitionLevel: "중",
        insights: "분석 데이터를 파싱하는 중 오류가 발생했습니다."
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
    console.error('Error in coupang-competition:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '경쟁강도 분석 중 오류가 발생했습니다.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
