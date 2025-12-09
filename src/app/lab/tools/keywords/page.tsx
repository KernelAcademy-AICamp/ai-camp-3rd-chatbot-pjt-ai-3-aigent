"use client";

import { useEffect, useState } from "react";

const CATEGORY_OPTIONS = [
  { id: "50000000", label: "패션의류" },
  { id: "50000001", label: "패션잡화" },
  { id: "50000002", label: "화장품/미용" },
  { id: "50000003", label: "디지털/가전" },
  { id: "50000004", label: "가구/인테리어" },
  { id: "50000005", label: "출산/육아" },
  { id: "50000006", label: "식품" },
  { id: "50000007", label: "생활/건강" },
  { id: "50000008", label: "스포츠/레저" },
  { id: "50000009", label: "자동차용품" },
  { id: "50005542", label: "도서" },
  { id: "50000011", label: "완구/취미" },
  { id: "50000012", label: "문구/오피스" },
  { id: "50000013", label: "반려동물용품" },
  { id: "50000014", label: "여가/생활편의" },
  { id: "50000015", label: "면세점" },
];

const DEVICE_OPTIONS = ["전체", "모바일", "PC"] as const;
const GENDER_OPTIONS = ["전체", "여성", "남성"] as const;
const AGE_OPTIONS = [
  "전체",
  "~12",
  "13-18",
  "19-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-49",
  "50-54",
  "55-59",
  "60+",
] as const;

type KeywordMetrics = {
  keyword: string;
  periods: number;
  avgRatio: number;
  recentAvgRatio: number;
  prevAvgRatio: number | null;
  growthRatio: number | null;
  peakMonths: number[];
};

type ApiResponse = {
  categoryId: string;
  startDate: string;
  endDate: string;
  timeUnit: string;
  keywords: string[];
  metrics: Record<string, KeywordMetrics>;
  series: Record<
    string,
    {
      period: string;
      ratio: number;
    }[]
  >;
  analysis: string | null;
};

export default function KeywordToolsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("50000000");
  const [keywordsInput, setKeywordsInput] = useState(
    "리유저블백, 장보기 장바구니, 캠핑 장바구니, 접이식 쇼핑백, 에코백",
  );
  const [autoKeywords, setAutoKeywords] = useState<string[] | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [timeUnit, setTimeUnit] = useState<"date" | "week" | "month">("month");
  const [devices, setDevices] = useState<string[]>(["전체"]);
  const [gender, setGender] = useState<string>("전체");
  const [ageBuckets, setAgeBuckets] = useState<string[]>(["전체"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [seriesKeyword, setSeriesKeyword] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setMonth(from.getMonth() - 6);
    const fromStr = from.toISOString().slice(0, 10);
    setStartDate(fromStr);
    setEndDate(to);
  }, []);

  const toggleDevice = (value: string) => {
    setDevices((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev.filter((v) => v !== "전체"), value],
    );
  };

  const toggleGender = (value: string) => {
    setGender(value);
  };

  const toggleAgeBucket = (value: string) => {
    setAgeBuckets((prev) => {
      if (value === "전체") return ["전체"];
      const withoutAll = prev.filter((v) => v !== "전체");
      if (withoutAll.includes(value)) {
        const next = withoutAll.filter((v) => v !== value);
        return next.length === 0 ? ["전체"] : next;
      }
      return [...withoutAll, value];
    });
  };

  const mapDeviceToApi = () => {
    const hasPc = devices.includes("PC");
    const hasMo = devices.includes("모바일");
    if (hasPc && hasMo) return "";
    if (hasPc) return "pc";
    if (hasMo) return "mo";
    return "";
  };

  const mapGenderToApi = () => {
    if (gender === "여성") return "f";
    if (gender === "남성") return "m";
    return "";
  };

  const mapAgesToApi = () => {
    const buckets = ageBuckets.filter((v) => v !== "전체");
    if (buckets.length === 0) return [] as string[];
    const map: Record<string, string> = {
      "~12": "10",
      "13-18": "10",
      "19-24": "20",
      "25-29": "20",
      "30-34": "30",
      "35-39": "30",
      "40-44": "40",
      "45-49": "40",
      "50-54": "50",
      "55-59": "50",
      "60+": "60",
    };
    const codes = new Set<string>();
    for (const b of buckets) {
      const code = map[b];
      if (code) codes.add(code);
    }
    return Array.from(codes);
  };

  const handleFetchTopKeywords = async () => {
    setAutoError(null);
    setAutoKeywords(null);
    if (!categoryId || !startDate || !endDate) {
      setAutoError("카테고리 ID와 기간을 먼저 입력해주세요.");
      return;
    }
    setAutoLoading(true);
    try {
      const params = new URLSearchParams({
        cid: categoryId,
        timeUnit,
        startDate,
        endDate,
        device: mapDeviceToApi(),
        gender: mapGenderToApi(),
        age: mapAgesToApi().join(","),
        limit: "10",
      });
      const res = await fetch(`/api/datalab/top-keywords?${params.toString()}`);
      const data = (await res.json()) as {
        keywords?: { rank: number; keyword: string; rawKeyword?: string }[];
        error?: string;
        bodyPreview?: string;
      };
      if (!res.ok || !data.keywords) {
        throw new Error(
          data.error ||
            "Top 키워드 API 응답에서 키워드 목록을 찾지 못했습니다.",
        );
      }

      const kws = data.keywords.map((k) => k.keyword);
      setAutoKeywords(kws);
      setKeywordsInput(kws.join(", "));
    } catch (err) {
      setAutoError(
        err instanceof Error
          ? err.message
          : "Top 키워드 조회 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setAutoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const keywords = keywordsInput
        .split(/[,\\n]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await fetch("/api/datalab/keyword-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          keywords,
          startDate,
          endDate,
          timeUnit,
          device: mapDeviceToApi(),
          gender: mapGenderToApi(),
          ages: mapAgesToApi(),
        }),
      });

      const data = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "API 호출에 실패했습니다.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderGrowthLabel = (g: number | null) => {
    if (!g || !Number.isFinite(g)) return "데이터 부족";
    const pct = (g - 1) * 100;
    if (pct > 20) return `강한 상승 (${pct.toFixed(1)}%)`;
    if (pct > 5) return `완만한 상승 (${pct.toFixed(1)}%)`;
    if (pct > -5) return `보합 (${pct.toFixed(1)}%)`;
    if (pct > -20) return `완만한 감소 (${pct.toFixed(1)}%)`;
    return `강한 감소 (${pct.toFixed(1)}%)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">
            카테고리 내 키워드 트렌드 · 테스트
          </h1>
          <p className="text-sm text-slate-600">
            네이버 데이터랩 쇼핑 카테고리/키워드 API를 이용해, 선택한 카테고리와
            키워드 목록의 검색 추세를 계산하고 Groq LLM으로 유망 키워드를 분석하는
            내부 실험용 페이지입니다.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                카테고리
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({opt.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                키워드 목록 (쉼표 또는 줄바꿈으로 구분, 최대 10개)
              </label>
              {autoKeywords && (
                <p className="mt-1 text-[11px] text-emerald-600">
                  네이버 Top 키워드에서 자동으로 불러온 상위 {autoKeywords.length}
                  개를 사용 중입니다. 필요하면 직접 편집해도 됩니다.
                </p>
              )}
              <textarea
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="mt-1 h-24 w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                timeUnit
              </label>
              <select
                value={timeUnit}
                onChange={(e) =>
                  setTimeUnit(e.target.value as "date" | "week" | "month")
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="date">date (일간)</option>
                <option value="week">week (주간)</option>
                <option value="month">month (월간)</option>
              </select>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={handleFetchTopKeywords}
                  disabled={autoLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700 disabled:opacity-60"
                >
                  {autoLoading
                    ? "네이버 Top 키워드 불러오는 중..."
                    : "네이버 Top 키워드 상위 10개 가져오기"}
                </button>
                <p className="text-[11px] text-slate-500">
                  버튼을 누르면 `getKeywordRank.naver`에서 해당 카테고리 기준 Top
                  키워드를 가져와 상위 10개를 분석 후보로 사용합니다.{" "}
                  <span className="font-semibold">
                    로컬 환경에서 JSON 구조가 다르면 API 파서를 조정해야 합니다.
                  </span>
                </p>
                {autoError && (
                  <p className="text-[11px] font-medium text-red-500">
                    Top 키워드 오류: {autoError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 분석 조건 - Lab 우측 패널과 동일한 구조 */}
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <h2 className="text-xs font-semibold text-slate-900">
              분석 조건 (Lab 우측 패널과 동일)
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">
                  범위
                </p>
                <div className="flex flex-wrap gap-1">
                  {DEVICE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDevice(opt)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        devices.includes(opt)
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">
                  성별
                </p>
                <div className="flex flex-wrap gap-1">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleGender(opt)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        gender === opt
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">
                  연령 선택
                </p>
                <div className="flex flex-wrap gap-1">
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleAgeBucket(opt)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        ageBuckets.includes(opt)
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

      <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "분석 중..." : "키워드 트렌드 분석 실행"}
          </button>

          {error && (
            <p className="text-sm font-medium text-red-600">에러: {error}</p>
          )}
        </form>

        {result && (
          <section className="space-y-5">
            {/* 1. 검색 조건 + 분석 대상 키워드 */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                1. 네이버 데이터랩 검색 조건 & 분석 대상 키워드
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                이 섹션은 실제 네이버 DataLab API 호출에 사용된 조건입니다. 현재
                테스트 단계에서는 Top 500 자동 추출 로직과 분리해서, 아래에 입력한
                키워드를 “분석 후보 키워드”로 간주하고 흐름을 검증합니다.
              </p>
              <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">검색 조건</p>
                  <ul className="space-y-0.5 text-slate-700">
                    <li>
                      • 기간: {result.startDate} ~ {result.endDate}
                    </li>
                    <li>• timeUnit: {result.timeUnit}</li>
                    <li>• 카테고리 ID: {result.categoryId}</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">
                    분석 대상 키워드 목록
                  </p>
                  <p className="text-slate-700">
                    {result.keywords.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 네이버 데이터랩 키워드 추세/계절성 */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                2. 네이버 데이터랩 키워드 추세 & 계절성
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                카테고리/키워드 트렌드 API의 ratio 시계열을 단순 통계로 요약한
                값입니다. ratio는 해당 기간 내에서 상대적인 클릭 비율(최대 100
                기준)입니다.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {Object.values(result.metrics).map((m) => (
                  <div
                    key={m.keyword}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
                    <div className="font-semibold text-slate-900">
                      {m.keyword}
                    </div>
                    <div className="mt-1 space-y-0.5 text-slate-700">
                      <p>데이터 포인트 수: {m.periods}</p>
                      <p>전체 평균 ratio: {m.avgRatio.toFixed(2)}</p>
                      <p>최근 구간 평균: {m.recentAvgRatio.toFixed(2)}</p>
                      <p>성장 평가: {renderGrowthLabel(m.growthRatio)}</p>
                      <p>
                        피크 시즌:{" "}
                        {m.peakMonths.length > 0
                          ? m.peakMonths.map((mm) => `${mm}월`).join(", ")
                          : "특정 계절 패턴 없음"}
                      </p>
                    </div>
                    {result.series[m.keyword]?.length ? (
                      <button
                        type="button"
                        onClick={() => setSeriesKeyword(m.keyword)}
                        className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
                      >
                        시계열 그래프 보기
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 쿠팡 검색 바로가기 섹션 */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                3. 쿠팡 검색 결과 빠르게 열기
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                현재 환경에서는 쿠팡 측 Access Denied(403)로 인해 자동 크롤링
                기반 가격 집계는 사용하지 않습니다. 대신 아래 키워드를 클릭하면
                각 키워드에 대한 쿠팡 검색 결과 페이지를 새 탭에서 바로 열 수
                있습니다.{" "}
                <span className="font-semibold">
                  “Top 10 가격 분포” 기능은 추후 별도 배치/공식 API 환경에서
                  수집한 데이터를 기반으로 다시 연결할 예정입니다.
                </span>
              </p>
              <ul className="mt-3 grid gap-2 text-xs text-slate-700 md:grid-cols-2">
              {result.keywords.map((kw) => {
                const coupangUrl = `https://www.coupang.com/np/search?channel=user&q=${encodeURIComponent(
                  kw,
                )}`;
                const marketplace1688Url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(
                  kw,
                )}`;
                const taobaoUrl = `https://s.taobao.com/search?q=${encodeURIComponent(
                  kw,
                )}`;

                return (
                  <li
                    key={kw}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                  >
                    <div className="font-semibold text-slate-900">{kw}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      <a
                        href={coupangUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-900 px-2.5 py-0.5 font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        쿠팡 검색
                      </a>
                      <a
                        href={marketplace1688Url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-300 px-2.5 py-0.5 font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700"
                      >
                        1688 검색
                      </a>
                      <a
                        href={taobaoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-300 px-2.5 py-0.5 font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700"
                      >
                        타오바오 검색
                      </a>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      각 마켓에서 이 키워드로 상단 상품의 가격대, 리뷰 수, 광고
                      비율 등을 직접 비교해 보면서 소싱 방향을 잡아보세요.
                    </p>
                  </li>
                );
              })}
              </ul>
            </div>

            {/* 4. AI 소싱 인사이트 */}
            {result.analysis && (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  4. AI 소싱 인사이트 (Groq LLM)
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  위 1–2번의 네이버 DataLab 지표(평균, 성장률, 피크 시즌)를 입력으로
                  Groq LLM이 생성한 정성적 해석입니다. 실제 서비스에서는 여기에 3번
                  쿠팡 경쟁도까지 합쳐서 최종 추천을 만들게 됩니다.
                </p>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-800">
                  {result.analysis}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 시계열 모달 */}
        {seriesKeyword && result?.series[seriesKeyword] && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {seriesKeyword} · 시계열 추세
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    기간: {result.startDate} ~ {result.endDate} · timeUnit:{" "}
                    {result.timeUnit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSeriesKeyword(null)}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-amber-200 hover:text-amber-700"
                >
                  닫기
                </button>
              </div>

              {/* 차트를 카드 좌우 패딩까지 꽉 차게 보이도록 살짝 음수 마진을 줍니다. */}
              <div className="mt-4 -mx-2 sm:-mx-4">
                <KeywordSeriesChart
                  points={result.series[seriesKeyword]}
                  height={200}
                  timeUnit={result.timeUnit as "date" | "week" | "month"}
                  peakMonths={
                    result.metrics[seriesKeyword]?.peakMonths ?? undefined
                  }
                />
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                ratio 값은 해당 기간 내에서 상대적인 클릭 인덱스입니다. 그래프의
                모양과 피크 구간을 중심으로 트렌드 방향을 확인하세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ChartProps = {
  points: { period: string; ratio: number }[];
  height?: number;
  timeUnit?: "date" | "week" | "month";
  peakMonths?: number[];
};

function KeywordSeriesChart({
  points,
  height = 180,
  timeUnit = "month",
  peakMonths,
}: ChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  if (!points || points.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[11px] text-slate-500">
        시계열 데이터가 없습니다.
      </div>
    );
  }

  // SVG 내부 논리 폭. viewBox 기준 값이라 실제 렌더 폭은 부모 width 100%를 꽉 채웁니다.
  // 좌우 여백을 줄이기 위해 기존 360에서 약간 넓혀 레이아웃을 안정화합니다.
  const width = 480;

  const simplifySeries = (
    raw: { period: string; ratio: number }[],
    maxSamples: number,
  ) => {
    if (raw.length <= maxSamples) return raw;
    const bucketSize = Math.ceil(raw.length / maxSamples);
    const buckets: { period: string; ratio: number }[] = [];
    for (let i = 0; i < raw.length; i += bucketSize) {
      const slice = raw.slice(i, i + bucketSize);
      if (slice.length === 0) continue;
      const avg =
        slice.reduce((sum, p) => sum + (Number.isFinite(p.ratio) ? p.ratio : 0), 0) /
        slice.length;
      buckets.push({ period: slice[0].period, ratio: avg });
    }
    return buckets;
  };

  const displayPoints =
    timeUnit === "date" ? simplifySeries(points, 60) : points;

  const maxRatio = Math.max(
    1,
    ...displayPoints.map((p) => (Number.isFinite(p.ratio) ? p.ratio : 0)),
  );

  const stepX =
    displayPoints.length > 1
      ? width / (displayPoints.length - 1)
      : width / 2 || width;

  const coords = displayPoints.map((p, idx) => {
    const x = stepX * idx;
    const normalized = p.ratio / maxRatio;
    const y = height - normalized * (height - 20) - 10;
    return { x, y, period: p.period, ratio: p.ratio };
  });

  const pathD = coords
    .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const first = points[0];
  const last = points[points.length - 1];

  const maxPoint = points.reduce((acc, cur) =>
    cur.ratio > acc.ratio ? cur : acc,
  );

  const peakSet = new Set<number>(peakMonths ?? []);

  type Region = { month: number; minX: number; maxX: number };
  const monthRegionsMap = new Map<number, Region>();

  displayPoints.forEach((p, idx) => {
    const month = Number.parseInt(p.period.slice(5, 7), 10);
    if (!peakSet.has(month)) return;
    const x = coords[idx].x;
    const region = monthRegionsMap.get(month);
    if (!region) {
      monthRegionsMap.set(month, { month, minX: x, maxX: x });
    } else {
      region.minX = Math.min(region.minX, x);
      region.maxX = Math.max(region.maxX, x);
    }
  });

  const monthRegions = Array.from(monthRegionsMap.values());

  const formatLabelDate = (period: string) => {
    const [y, m, d] = period.split("-");
    if (timeUnit === "month") return `${y}-${m}`;
    if (timeUnit === "week") return `${m}/${d}`;
    // date
    return `${m}/${d}`;
  };

  const tickCount = Math.min(4, coords.length);
  const tickIndices: number[] = [];
  if (tickCount === 1) {
    tickIndices.push(0);
  } else {
    const step = (coords.length - 1) / (tickCount - 1);
    for (let i = 0; i < tickCount; i += 1) {
      tickIndices.push(Math.round(step * i));
    }
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[200px] w-full text-slate-400"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const xPx = e.clientX - rect.left;
          const xView = (xPx / rect.width) * width;
          let bestIdx = 0;
          let bestDist = Infinity;
          coords.forEach((c, idx) => {
            const d = Math.abs(c.x - xView);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = idx;
            }
          });
          setHoverIndex(bestIdx);
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* 피크 시즌 하이라이트 영역 */}
        {monthRegions.map((r) => {
          const regionWidth = Math.max(stepX, r.maxX - r.minX + stepX);
          const regionX = r.minX - stepX / 2;
          return (
            <rect
              key={`region-${r.month}`}
              x={Math.max(0, regionX)}
              y={0}
              width={Math.min(width, regionWidth)}
              height={height}
              fill="#f97316"
              fillOpacity={0.06}
            />
          );
        })}

        {/* baseline */}
        <line
          x1={0}
          y1={height - 10}
          x2={width}
          y2={height - 10}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        {/* path */}
        <path
          d={pathD}
          fill="none"
          stroke="#f97316"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* points */}
        {coords.map((c, idx) => (
          <circle
            key={`${c.period}-${idx}`}
            cx={c.x}
            cy={c.y}
            r={displayPoints.length > 80 ? 1.5 : 2.5}
            fill="#f97316"
          />
        ))}
        {/* x 축 눈금 + 레이블 */}
        {tickIndices.map((i) => {
          const c = coords[i];
          const p = displayPoints[i];
          return (
            <g key={`tick-${p.period}-${i}`}>
              <line
                x1={c.x}
                y1={height - 10}
                x2={c.x}
                y2={height - 5}
                stroke="#cbd5f5"
                strokeWidth={1}
              />
              <text
                x={c.x}
                y={height - 2}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {formatLabelDate(p.period)}
              </text>
            </g>
          );
        })}

        {/* hover indicator */}
        {hoverIndex != null && coords[hoverIndex] && (
          <>
            {(() => {
              const c = coords[hoverIndex];
              const p = displayPoints[hoverIndex];
              const tooltipWidth = 120;
              const tooltipHeight = 40;
              const baseX = Math.min(
                width - tooltipWidth - 4,
                Math.max(4, c.x + 8),
              );
              const baseY = 10;
              return (
                <>
                  <line
                    x1={c.x}
                    y1={0}
                    x2={c.x}
                    y2={height}
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={4}
                    fill="#ffffff"
                    stroke="#f97316"
                    strokeWidth={2}
                  />
                  <rect
                    x={baseX}
                    y={baseY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx={6}
                    fill="#ffffff"
                    stroke="#cbd5f5"
                    strokeWidth={1}
                    filter="url(#shadow-none)"
                  />
                  <text
                    x={baseX + 8}
                    y={baseY + 15}
                    fontSize={9}
                    fill="#0f172a"
                  >
                    {p.period}
                  </text>
                  <text
                    x={baseX + 8}
                    y={baseY + 28}
                    fontSize={9}
                    fill="#64748b"
                  >
                    {p.ratio.toFixed(1)}
                  </text>
                </>
              );
            })()}
          </>
        )}
      </svg>
      <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-500 md:grid-cols-3">
        <span>
          시작: {first.period} ({first.ratio.toFixed(1)})
        </span>
        <span>
          마지막: {last.period} ({last.ratio.toFixed(1)})
        </span>
        <span>
          최대: {maxPoint.period} ({maxPoint.ratio.toFixed(1)})
        </span>
      </div>
    </div>
  );
}
