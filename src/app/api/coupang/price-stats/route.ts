import { NextResponse } from "next/server";
import { fetchCoupangPriceStatsForKeywords } from "@/lib/coupang";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keywords?: string[];
      limitPerKeyword?: number;
    };

    const keywords = Array.isArray(body.keywords) ? body.keywords : [];
    if (!keywords.length) {
      return NextResponse.json(
        { error: "키워드 배열이 비어 있습니다." },
        { status: 400 },
      );
    }

    const limit =
      typeof body.limitPerKeyword === "number" && body.limitPerKeyword > 0
        ? body.limitPerKeyword
        : 10;

    const { stats, errors } = await fetchCoupangPriceStatsForKeywords(
      keywords,
      limit,
    );

    return NextResponse.json({ stats, errors });
  } catch (error) {
    console.error("Coupang price-stats error", error);

    const base = {
      error: "쿠팡 가격 정보를 가져오는 중 오류가 발생했습니다.",
    };

    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      return NextResponse.json(
        { ...base, details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(base, { status: 500 });
  }
}

