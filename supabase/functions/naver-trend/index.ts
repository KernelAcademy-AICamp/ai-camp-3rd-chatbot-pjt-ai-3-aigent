import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NaverTrendRequest {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  category: string[];
  device?: "pc" | "mo" | "";
  gender?: "m" | "f" | "";
  ages?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startDate, endDate, timeUnit, category, device, gender, ages } = await req.json() as NaverTrendRequest;

    if (!startDate || !endDate || !category || category.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '필수 파라미터가 누락되었습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const NAVER_CLIENT_ID = Deno.env.get('NAVER_CLIENT_ID');
    const NAVER_CLIENT_SECRET = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      throw new Error('네이버 API 인증 정보가 설정되지 않았습니다.');
    }

    console.log(`Fetching Naver trend data: ${startDate} ~ ${endDate}, categories: ${category.join(', ')}`);

    // 네이버 데이터랩 쇼핑인사이트 API 호출
    const response = await fetch('https://openapi.naver.com/v1/datalab/shopping/categories', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate,
        endDate,
        timeUnit: timeUnit || 'month',
        category: category.map((cat, idx) => ({
          name: `카테고리${idx + 1}`,
          param: [cat]
        })),
        device: device || '',
        gender: gender || '',
        ages: ages || []
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Naver API error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('네이버 API 인증에 실패했습니다. API 키를 확인해주세요.');
      }
      if (response.status === 429) {
        throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      }
      throw new Error(`네이버 API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('Naver API response:', JSON.stringify(data).substring(0, 200));

    return new Response(
      JSON.stringify({
        success: true,
        data: data.results || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in naver-trend:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '트렌드 데이터 조회 중 오류가 발생했습니다.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
