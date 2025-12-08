import { NextResponse } from "next/server";
import { callShoppingCategories } from "@/lib/naver";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    startDate,
    endDate,
    timeUnit = "month",
    categoryIds,
    device = "",
    gender = "",
    ages = [],
  } = body as {
    startDate?: string;
    endDate?: string;
    timeUnit?: "date" | "week" | "month";
    categoryIds?: string[];
    device?: "" | "pc" | "mo";
    gender?: "" | "m" | "f";
    ages?: string[];
  };

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate와 endDate를 입력해주세요." },
      { status: 400 },
    );
  }

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return NextResponse.json(
      { error: "최소 하나 이상의 categoryIds가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const payload = {
      startDate,
      endDate,
      timeUnit,
      category: categoryIds.map((cid) => ({
        name: cid,
        param: [cid],
      })),
      device,
      gender,
      ages,
    };

    const result = await callShoppingCategories(payload);

    const summary = result.results.map((r) => {
      const ratios = r.data.map((d) => d.ratio);
      const avg =
        ratios.length > 0
          ? ratios.reduce((sum, v) => sum + v, 0) / ratios.length
          : 0;
      const last = r.data[r.data.length - 1]?.ratio ?? null;

      return {
        title: r.title,
        category: r.category,
        averageRatio: avg,
        latestRatio: last,
      };
    });

    return NextResponse.json({ raw: result, summary });
  } catch (error) {
    console.error("Naver DataLab categories error", error);

    const base = {
      error:
        "네이버 데이터랩 카테고리 정보를 불러오지 못했습니다. 환경변수와 파라미터를 확인해주세요.",
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

