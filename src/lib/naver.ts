const NAVER_CLIENT_ID = process.env.NAVER_API_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_API_CLIENT_SECRET;

type ShoppingCategoriesRequest = {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  category: { name: string; param: string[] }[];
  device?: "" | "pc" | "mo";
  gender?: "" | "m" | "f";
  ages?: string[];
};

export type ShoppingCategoriesResponse = {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: {
    title: string;
    category: string[];
    data: { period: string; ratio: number }[];
  }[];
};

export async function callShoppingCategories(
  payload: ShoppingCategoriesRequest,
): Promise<ShoppingCategoriesResponse> {
  const res = await naverPost(
    "https://openapi.naver.com/v1/datalab/shopping/categories",
    payload,
  );

  return (await res.json()) as ShoppingCategoriesResponse;
}

type ShoppingCategoryKeywordsRequest = {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  category: string;
  keyword: { name: string; param: string[] }[];
  device?: "" | "pc" | "mo";
  gender?: "" | "m" | "f";
  ages?: string[];
};

export type ShoppingCategoryKeywordsResponse = {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: {
    title: string;
    keyword: string[];
    data: { period: string; ratio: number }[];
  }[];
};

export async function callShoppingCategoryKeywords(
  payload: ShoppingCategoryKeywordsRequest,
): Promise<ShoppingCategoryKeywordsResponse> {
  const res = await naverPost(
    "https://openapi.naver.com/v1/datalab/shopping/category/keywords",
    payload,
  );

  return (await res.json()) as ShoppingCategoryKeywordsResponse;
}

async function naverPost(url: string, payload: unknown): Promise<Response> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("NAVER_API_CLIENT_ID / NAVER_API_CLIENT_SECRET 미설정");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Naver API 오류 (${url}): ${res.status} ${text}`);
  }

  return res;
}

