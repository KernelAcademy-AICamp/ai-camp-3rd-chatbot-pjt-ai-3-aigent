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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  useEffect(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setMonth(from.getMonth() - 6);
    const fromStr = from.toISOString().slice(0, 10);
    setStartDate(fromStr);
    setEndDate(to);
  }, []);

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
        device: "pc",
        gender: "",
        age: "",
        limit: "10",
      });
      const res = await fetch(`/api/datalab/top-keywords?${params.toString()}`);
      const data = (await res.json()) as {
        keywords?: { rank: number; keyword: string; rawKeyword?: string }[];
        error?: string;
        bodyPreview?: string;
      };
      console.log("data top-keywords", data)

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
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 쿠팡 경쟁도 섹션 (현재 환경에서는 크롤링 불가 안내) */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                3. 쿠팡 경쟁도 요약 (테스트 환경)
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                실제 서비스에서는 각 키워드에 대해 쿠팡 검색 결과를 크롤링해
                상품 수, 리뷰 수, 가격대, 광고 비율 등을 계산할 예정입니다. 현재
                이 테스트 환경에서는 Coupang 쪽 접근 제한으로 인해 실제
                크롤링은 수행하지 않고, UI 구조만 확인하는 단계입니다.
              </p>
              <ul className="mt-3 grid gap-1 text-xs text-slate-700 md:grid-cols-2">
                {result.keywords.map((kw) => (
                  <li
                    key={kw}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                  >
                    <span className="font-semibold text-slate-900">{kw}</span>
                    <span className="ml-1 text-[11px] text-slate-500">
                      · 쿠팡 경쟁도: (로컬 크롤러 연동 시 실제 데이터 표시 예정)
                    </span>
                  </li>
                ))}
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
      </div>
    </div>
  );
}
