const COUPANG_ROBOTS_URL =
  process.env.COUPANG_ROBOTS_URL ?? "https://www.coupang.com/robots.txt";

// 명시적으로 true 로 설정된 경우에만 크롤링을 허용합니다.
const COUPANG_SCRAPE_ENABLED = process.env.COUPANG_SCRAPE_ENABLED === "true";

// robots.txt 를 반드시 읽어야만 요청을 허용할지 여부.
// true 이고 robots.txt 를 가져오지 못하면 모든 요청을 막습니다.
const COUPANG_REQUIRE_ROBOTS =
  process.env.COUPANG_REQUIRE_ROBOTS === "true";

// 분당 최대 요청 수, 최소 간격(ms) 등은 환경변수로 조정 가능.
const MAX_REQ_PER_MIN = Number(
  process.env.COUPANG_MAX_REQ_PER_MIN ?? 20,
);
const MIN_INTERVAL_MS = Number(
  process.env.COUPANG_MIN_INTERVAL_MS ?? 2000,
);

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

let robotsLoaded = false;
let robotsFailed = false;
let robotsDisallows: string[] = [];

let lastRequestAt = 0;
let windowStartAt = 0;
let windowCount = 0;

function parseRobotsTxt(content: string) {
  // 매우 단순한 파서: User-agent: * 블록의 Disallow 만 본다.
  const lines = content.split(/\r?\n/);
  let inGlobalAgent = false;
  const disallows: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const ua = line.slice("user-agent:".length).trim();
      inGlobalAgent = ua === "*" || ua === "";
    } else if (inGlobalAgent && lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path) disallows.push(path);
    }
  }

  robotsDisallows = disallows;
}

async function ensureRobotsLoaded() {
  if (robotsLoaded || robotsFailed) return;

  try {
    const res = await fetch(COUPANG_ROBOTS_URL, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        accept: "text/plain, */*;q=0.1",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      robotsFailed = true;
      return;
    }

    const text = await res.text();
    parseRobotsTxt(text);
  } catch {
    robotsFailed = true;
  } finally {
    robotsLoaded = true;
  }
}

function isPathDisallowed(path: string): boolean {
  if (!robotsDisallows.length) return false;
  return robotsDisallows.some((dis) => {
    if (dis === "/") return true;
    return path.startsWith(dis);
  });
}

async function applyRateLimit() {
  const now = Date.now();

  // 분당 요청 수 제한
  if (!windowStartAt || now - windowStartAt > 60_000) {
    windowStartAt = now;
    windowCount = 0;
  }

  if (windowCount >= MAX_REQ_PER_MIN) {
    const remaining = 60_000 - (now - windowStartAt);
    const jitter = Math.floor(Math.random() * 5000); // 최대 5초 랜덤 대기 추가
    const waitMs = remaining + jitter;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    windowStartAt = Date.now();
    windowCount = 0;
  }

  // 최소 간격 보장
  if (lastRequestAt) {
    const diff = now - lastRequestAt;
    if (diff < MIN_INTERVAL_MS) {
      // 최소 간격 + 약간의 랜덤 지터를 더해, 완전히 규칙적인 패턴을 피합니다.
      const base = MIN_INTERVAL_MS - diff;
      const jitter = Math.floor(
        Math.random() * Math.round(MIN_INTERVAL_MS * 0.3),
      ); // 최대 30% 지터
      await sleep(base + jitter);
    }
  }

  lastRequestAt = Date.now();
  windowCount += 1;
}

/**
 * 쿠팡 요청 전 호출해서:
 * 1) 기능 플래그(COUPANG_SCRAPE_ENABLED) 확인
 * 2) robots.txt 기준 path 허용 여부 확인
 * 3) 프로세스 내부 rate limit 적용
 */
export async function guardCoupangRequest(path: string) {
  if (!COUPANG_SCRAPE_ENABLED) {
    throw new Error(
      "쿠팡 크롤링이 비활성화되어 있습니다. COUPANG_SCRAPE_ENABLED=true 로 설정 후 사용하세요.",
    );
  }

  await ensureRobotsLoaded();

  if (COUPANG_REQUIRE_ROBOTS && robotsFailed) {
    throw new Error(
      "Coupang robots.txt를 불러오지 못해 크롤링을 중단합니다. 환경 설정을 확인해주세요.",
    );
  }

  if (!robotsFailed && isPathDisallowed(path)) {
    throw new Error(
      `Coupang robots.txt 정책에 따라 크롤링이 허용되지 않은 경로입니다: ${path}`,
    );
  }

  await applyRateLimit();
}
