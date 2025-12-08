import { NextRequest, NextResponse } from 'next/server';

interface TrendRequest {
  startDate: string;
  endDate: string;
  timeUnit: string;
  keywordGroups: {
    groupName: string;
    keywords: string[];
  }[];
  device?: string;
  gender?: string;
  ages?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      console.error('API credentials not configured');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const requestData = await request.json() as TrendRequest;
    const { startDate, endDate, timeUnit, keywordGroups, device, gender, ages } = requestData;

    // Input validation
    if (!startDate || !endDate || !/^\d{8}$/.test(startDate) || !/^\d{8}$/.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format (expected YYYYMMDD)' },
        { status: 400 }
      );
    }

    if (!keywordGroups || !Array.isArray(keywordGroups) || keywordGroups.length === 0 || keywordGroups.length > 5) {
      return NextResponse.json(
        { error: 'Invalid keyword groups (must be 1-5)' },
        { status: 400 }
      );
    }

    // Validate keyword groups
    for (const group of keywordGroups) {
      if (!group.groupName || typeof group.groupName !== 'string' || group.groupName.length > 50) {
        return NextResponse.json(
          { error: 'Invalid group name' },
          { status: 400 }
        );
      }
      if (!group.keywords || !Array.isArray(group.keywords) || group.keywords.length === 0 || group.keywords.length > 20) {
        return NextResponse.json(
          { error: 'Invalid keywords in group (must be 1-20)' },
          { status: 400 }
        );
      }
      for (const keyword of group.keywords) {
        if (typeof keyword !== 'string' || keyword.length > 50) {
          return NextResponse.json(
            { error: 'Invalid keyword' },
            { status: 400 }
          );
        }
      }
    }

    console.log('📡 Requesting Naver DataLab trend data:', { startDate, endDate, groupCount: keywordGroups.length });

    const requestBody: any = {
      startDate,
      endDate,
      timeUnit: timeUnit || 'month',
      keywordGroups,
    };

    // Add optional filters
    if (device && device !== 'all') {
      requestBody.device = device === 'pc' ? 'pc' : 'mo';
    }
    if (gender && gender !== 'all') {
      requestBody.gender = gender === 'male' ? 'm' : 'f';
    }
    if (ages && ages.length > 0) {
      requestBody.ages = ages;
    }

    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Naver API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'External API error' },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log('✅ Naver DataLab response received:', JSON.stringify(data).substring(0, 500));

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in naver-trend API:', error);

    let errorMessage = 'Failed to fetch trend data';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('configuration')) {
        errorMessage = 'Service temporarily unavailable';
        statusCode = 503;
      } else if (error.message.includes('API error')) {
        errorMessage = 'External API error';
        statusCode = 502;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
