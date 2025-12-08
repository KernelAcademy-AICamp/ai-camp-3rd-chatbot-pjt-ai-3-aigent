export type KeywordRank = { rank: number; keyword: string; linkId?: string };

export type NaverResponse = {
  message: string | null;
  statusCode: number;
  returnCode: number;
  range: string;
  ranks: KeywordRank[];
};

export type QueryParams = {
  cid: string;
  timeUnit: string;
  startDate: string;
  endDate: string;
  age?: string;
  gender?: string;
  device?: string;
  page?: number;
  count?: number;
};

const NAVER_ENDPOINT =
  process.env.NAVER_SHOPPING_ENDPOINT ??
  "https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver";

const PAGE_SIZE = 20;
const MAX_PAGES = 1; // 초기에는 첫 페이지만 사용
const SLEEP_MS = Number(process.env.NAVER_SLEEP_MS ?? 1000);
const RETRY_429 = Number(process.env.NAVER_RETRY_429 ?? 2);

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function postOnce(
  payload: URLSearchParams,
  attempt: number,
): Promise<Response> {
  const res = await fetch(NAVER_ENDPOINT, {
    method: "POST",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      referer: "https://datalab.naver.com/shoppingInsight/sCategory.naver",
      origin: "https://datalab.naver.com",
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    body: payload,
  });

  if (res.status === 429 && attempt <= RETRY_429) {
    const backoff = Math.min(4000 * attempt, 10000);
    await sleep(backoff);
    return postOnce(payload, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Naver error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res;
}

// 네이버 쇼핑인사이트 랭킹 응답의 keyword는 경우에 따라
// 여러 연관 검색어 + 내부 코드가 붙어서 내려온다.
// 예) "남성반바지면반바지5부팬츠카고반바지insum57"
// 우리는 분석/표시용으로 "대표 키워드"를 사용하기 위해
// 아래 휴리스틱으로 정제한다.
export function normalizeNaverKeyword(raw: string): string {
  let cleaned = raw.trim();

  // 1) 맨 끝에 붙는 브랜드/내부 코드 (영문+숫자) 제거
  cleaned = cleaned.replace(/[a-zA-Z]{2,}\d{0,}$/g, "").trim();

  // 2) 중간 이후에 등장하는 숫자(예: 5부, 7부 등) 이후는 잘라냄
  //    "남성반바지면반바지5부팬츠카고반바지" -> "남성반바지면반바지"
  cleaned = cleaned.replace(/\d.*$/, "").trim();

  // 3) 대표 상품 토큰 기준으로 끊기
  const baseTokens = [
    "원피스",
    "블라우스",
    "반바지",
    "레인코트",
    "패딩",
    "조끼",
    "자켓",
    "재킷",
    "우비",
    "팬츠",
    "바지",
    "코트",
    "셔츠",
    "티셔츠",
  ];

  let cutIndex = -1;
  for (const token of baseTokens) {
    const idx = cleaned.indexOf(token);
    if (idx !== -1) {
      const end = idx + token.length;
      if (cutIndex === -1 || end < cutIndex) {
        cutIndex = end;
      }
    }
  }

  if (cutIndex !== -1) {
    cleaned = cleaned.slice(0, cutIndex);
  }

  // 4) 너무 길면 앞부분만 대표로 사용 (예: 도메인 전반에 안전하게)
  const MAX_LEN = 20;
  if (cleaned.length > MAX_LEN) {
    cleaned = cleaned.slice(0, MAX_LEN);
  }

  return cleaned.trim();
}

export async function fetchTopKeywords(params: QueryParams) {
  let ranks: KeywordRank[] = [];
  let meta: Partial<NaverResponse> = {};

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = new URLSearchParams({
      cid: params.cid,
      timeUnit: params.timeUnit,
      startDate: params.startDate,
      endDate: params.endDate,
      age: params.age ?? "",
      gender: params.gender ?? "",
      device: params.device ?? "",
      page: String(page),
      count: String(PAGE_SIZE),
    });

    const res = await postOnce(payload, 1);

    let data: NaverResponse;
    try {
      data = (await res.json()) as NaverResponse;
    } catch (err) {
      const snippet = (await res.text()).slice(0, 200);
      throw new Error(
        `Naver returned non-JSON. status=${res.status} body=${snippet}`,
      );
    }

    meta = data;
    ranks = ranks.concat(data.ranks ?? []);

    if (!data.ranks || data.ranks.length < PAGE_SIZE) break;
    if (SLEEP_MS > 0 && page < MAX_PAGES) await sleep(SLEEP_MS);
  }

  return { ranks, meta };
}
