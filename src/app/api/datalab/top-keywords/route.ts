import { NextResponse } from "next/server";
import {
  fetchTopKeywords,
  normalizeNaverKeyword,
} from "@/lib/naver-top-keywords";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get("cid");
  const timeUnit = searchParams.get("timeUnit") || "month";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const device = searchParams.get("device") || "";
  const gender = searchParams.get("gender") || "";
  const age = searchParams.get("age") || "";
  const limitParam = searchParams.get("limit");

  const limit = limitParam ? Number.parseInt(limitParam, 10) || 10 : 10;

  if (!cid || !startDate || !endDate) {
    return NextResponse.json(
      {
        error:
          "cid, startDate, endDate는 필수입니다. (timeUnit, device, gender, age는 선택)",
      },
      { status: 400 },
    );
  }

  try {
    const { ranks, meta } = await fetchTopKeywords({
      cid,
      timeUnit,
      startDate,
      endDate,
      age,
      gender,
      device,
    });

    const top = ranks.slice(0, limit).map((r) => ({
      rank: r.rank,
      keyword: normalizeNaverKeyword(r.keyword),
      rawKeyword: r.keyword,
      linkId: r.linkId,
    }));

    return NextResponse.json({
      cid,
      timeUnit,
      startDate,
      endDate,
      age,
      gender,
      device,
      limit,
      meta: {
        statusCode: meta.statusCode,
        returnCode: meta.returnCode,
        range: meta.range,
      },
      keywords: top,
    });
  } catch (error) {
    console.error("Naver top-keywords crawl error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "네이버 쇼핑인사이트 Top 키워드 크롤링에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
