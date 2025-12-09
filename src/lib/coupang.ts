import { guardCoupangRequest } from "@/lib/coupang-guard";

const COUPANG_SEARCH_ENDPOINT =
  process.env.COUPANG_SEARCH_ENDPOINT ??
  "https://www.coupang.com/np/search";

const COUPANG_SLEEP_MS = Number(process.env.COUPANG_SLEEP_MS ?? 1200);
const COUPANG_MAX_KEYWORDS = Number(
  process.env.COUPANG_MAX_KEYWORDS ?? 10,
);

export type CoupangPriceStat = {
  keyword: string;
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchSearchHtml(keyword: string): Promise<string> {
  const path = "/np/search";
  await guardCoupangRequest(path);

  // User-Agent 를 여러 개 중 랜덤으로 선택해 너무 고정된 패턴을 피합니다.
  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  ];
  const ua =
    userAgents[Math.floor(Math.random() * userAgents.length)] ||
    userAgents[0];

  const url = `${COUPANG_SEARCH_ENDPOINT}?q=${encodeURIComponent(
    keyword,
  )}&page=1&listSize=36&channel=user`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "user-agent": ua,
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 300);
    throw new Error(
      `Coupang search failed: ${res.status} ${res.statusText} body=${snippet}`,
    );
  }

  return res.text();
}

/**
 * Coupang 검색 결과 HTML에서 가격 숫자만 뽑아냅니다.
 *
 * 사이트 마크업이 가끔 바뀔 수 있으므로, 여러 패턴을 시도하고
 * 너무 작은 값/이상한 값은 필터링합니다.
 */
export function extractPricesFromHtml(
  html: string,
  maxItems: number,
): number[] {
  const prices: number[] = [];

  const patterns: RegExp[] = [
    /class=["']price-value["'][^>]*>\s*([\d,]+)\s*</g, // 대표 가격 영역
    /data-price=["']([\d,]+)["']/g, // data-price 속성
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) && prices.length < maxItems) {
      const raw = match[1].replace(/[^\d]/g, "");
      const value = Number.parseInt(raw, 10);
      if (!Number.isNaN(value) && value > 0 && value < 100_000_000) {
        prices.push(value);
      }
    }
    if (prices.length >= maxItems) break;
  }

  return prices;
}

function buildPriceStat(keyword: string, prices: number[]): CoupangPriceStat {
  if (!prices.length) {
    return {
      keyword,
      count: 0,
      min: null,
      max: null,
      avg: null,
    };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, v) => sum + v, 0) / prices.length;

  return {
    keyword,
    count: prices.length,
    min,
    max,
    avg: Number.isFinite(avg) ? Math.round(avg) : avg,
  };
}

export async function fetchCoupangPriceStatsForKeywords(
  rawKeywords: string[],
  limitPerKeyword = 10,
): Promise<{
  stats: Record<string, CoupangPriceStat>;
  errors: Record<string, string>;
}> {
  const keywords = Array.from(
    new Set(
      rawKeywords
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    ),
  ).slice(0, COUPANG_MAX_KEYWORDS);

  const stats: Record<string, CoupangPriceStat> = {};
  const errors: Record<string, string> = {};

  for (let i = 0; i < keywords.length; i += 1) {
    const keyword = keywords[i];
    try {
      const html = await fetchSearchHtml(keyword);
      const prices = extractPricesFromHtml(html, limitPerKeyword);
      stats[keyword] = buildPriceStat(keyword, prices);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      errors[keyword] = message;
      stats[keyword] = buildPriceStat(keyword, []);
      if (process.env.NODE_ENV !== "production") {
        console.warn("Coupang price stats keyword error", keyword, message);
      }

      // 403 / Access Denied 처럼 IP 차단 계열 에러가 나오면
      // 나머지 키워드에 대해서는 추가 요청을 보내지 않고 바로 중단합니다.
      if (/403/.test(message) || /Access Denied/i.test(message)) {
        const friendly =
          "쿠팡에서 이 서버 IP의 검색 요청을 허용하지 않습니다 (403 Forbidden).";
        for (let j = i + 1; j < keywords.length; j += 1) {
          const k = keywords[j];
          errors[k] = friendly;
          stats[k] = buildPriceStat(k, []);
        }
        break;
      }
    }

    if (COUPANG_SLEEP_MS > 0 && i < keywords.length - 1) {
      // 연속 호출 시 쿠팡 서버에 부담을 주지 않도록 간단한 딜레이를 둡니다.
      // 완전히 일정한 간격 대신, base ± 30% 범위의 랜덤 지연을 사용합니다.
      const base = COUPANG_SLEEP_MS;
      const jitter = Math.floor(Math.random() * Math.round(base * 0.6));
      const wait = base + jitter - Math.round(base * 0.3);
      await sleep(Math.max(0, wait));
    }
  }

  if (
    process.env.NODE_ENV !== "production" &&
    Object.keys(errors).length > 0
  ) {
    console.warn("Coupang price stats completed with errors", errors);
  }

  return { stats, errors };
}
