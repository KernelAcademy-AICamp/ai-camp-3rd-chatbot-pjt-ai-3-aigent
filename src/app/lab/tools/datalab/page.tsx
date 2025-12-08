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

type ApiResult = {
  summary: {
    title: string;
    category: string[];
    averageRatio: number;
    latestRatio: number | null;
  }[];
  raw: unknown;
};

export default function DatalabToolsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryIds, setCategoryIds] = useState("50000000");
  const [timeUnit, setTimeUnit] = useState<"date" | "week" | "month">("month");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  useEffect(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const fromStr = from.toISOString().slice(0, 10);
    setStartDate(fromStr);
    setEndDate(to);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const ids = categoryIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      const res = await fetch("/api/datalab/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          timeUnit,
          categoryIds: ids,
          device: "",
          gender: "",
          ages: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "API 호출에 실패했습니다.");
      }

      setResult(data as ApiResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">
            네이버 데이터랩 · 카테고리 테스트
          </h1>
          <p className="text-sm text-slate-600">
            실제 쇼핑인사이트 API 응답을 확인하기 위한 내부 도구입니다. 기간과
            카테고리 ID를 입력해 카테고리별 트렌드 요약을 확인할 수 있습니다.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
                카테고리 ID 목록 (쉼표로 구분)
              </label>
              <div className="mb-1 flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCategoryIds(opt.id);
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      categoryIds === opt.id
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={categoryIds}
                onChange={(e) => setCategoryIds(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="예: 50000000,50000002"
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
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "조회 중..." : "카테고리 트렌드 조회"}
          </button>

          {error && (
            <p className="text-sm font-medium text-red-600">에러: {error}</p>
          )}
        </form>

        {result && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                요약 결과
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {result.summary.map((item) => (
                  <div
                    key={item.title + item.category.join(",")}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
                    <div className="font-semibold text-slate-900">
                      {item.title}{" "}
                      <span className="text-[10px] text-slate-500">
                        ({item.category.join(", ")})
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-slate-700">
                      <p>평균 ratio: {item.averageRatio.toFixed(2)}</p>
                      <p>
                        최신 구간 ratio:{" "}
                        {item.latestRatio !== null
                          ? item.latestRatio.toFixed(2)
                          : "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-900/90 p-4 text-xs text-slate-100">
              <summary className="cursor-pointer text-sm font-semibold">
                Raw 응답 보기
              </summary>
              <pre className="mt-3 max-h-80 overflow-x-auto whitespace-pre-wrap text-[11px]">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
