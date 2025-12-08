"use client";

import { ArrowRight, LineChart, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

const defaultFocusTags: string[] = [];

export default function Home() {
  const [productName, setProductName] = useState("리유저블백");
  const [target, setTarget] = useState("20~30대 여성, 장보기/캠핑 수요");
  const [focusTags, setFocusTags] = useState<string[]>(defaultFocusTags);
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [newFocusTag, setNewFocusTag] = useState("");
  const [trialUsed, setTrialUsed] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [trialResult, setTrialResult] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const used = window.localStorage.getItem("keyword_radar_trial_used");
    if (used === "1") {
      setTrialUsed(true);
    }
  }, []);

  const toggleFocus = (tag: string) => {
    setSelectedFocus((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddFocusTag = () => {
    const value = newFocusTag.trim();
    if (!value) return;
    if (!focusTags.includes(value)) {
      setFocusTags((prev) => [...prev, value]);
    }
    if (!selectedFocus.includes(value)) {
      setSelectedFocus((prev) => [...prev, value]);
    }
    setNewFocusTag("");
  };

  const handleTrial = async () => {
    setTrialError(null);
    if (!productName.trim()) {
      setTrialError("기본 상품명을 입력해주세요.");
      return;
    }
    if (trialUsed) {
      setTrialError("무료 체험은 1회만 제공됩니다. 로그인 후 계속 사용해주세요.");
      return;
    }

    setTrialLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          target,
          focus: selectedFocus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "추천을 생성하지 못했습니다.");
      }
      setTrialResult(data.reply as string);
      setTrialUsed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("keyword_radar_trial_used", "1");
      }
    } catch (err) {
      setTrialError(
        err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다.",
      );
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-slate-900">
      <div className="relative isolate overflow-hidden px-6 pb-16 pt-12 sm:px-10 md:px-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-50 via-white to-sky-50" />
        <div className="absolute inset-x-12 top-14 -z-10 h-64 rounded-3xl bg-gradient-to-r from-amber-200/50 via-white to-sky-200/40 blur-3xl" />

        <header className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm ring-1 ring-amber-200/80">
              <Sparkles className="h-4 w-4" />
              Copaung Code Command · 키워드 소싱 레이더
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <a
                href="/login"
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
              >
                로그인하고 사용하기
              </a>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">
                미래 키워드 + 틈새 제품명 자동 추천
              </p>
              <h1 className="space-y-3 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                <span className="block">검색 트렌드와 마켓 경쟁도 기반으로</span>
                <span className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-lg text-white">
                  미래 유망 키워드와 니치 제품명
                  <ArrowRight className="h-4 w-4 text-amber-300" />
                </span>
                <span className="block text-amber-600">
                  을 한 번에 추천하는 소싱 전문가 챗봇입니다.
                </span>
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-slate-700">
                네이버 데이터랩과 마켓 데이터를 해석해 “다음 시즌에 뜰 키워드”와 “쿠팡에서
                경쟁이 덜한 니치 제품명”을 제안합니다. 지금은 1인 셀러와 소규모 브랜드를 위한
                베타 버전입니다.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/lab"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-200/40 transition hover:-translate-y-0.5 hover:shadow-amber-300/50"
                >
                  로그인 후 전체 기능 사용
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#trial"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-700"
                >
                  1회 무료 체험 해보기
                </a>
              </div>
            </div>

            <div className="glass-panel relative rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-2xl shadow-amber-100/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                한눈에 보는 가치
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <LineChart className="h-4 w-4" />
                    미래 검색량 관점
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    시계열 기반으로 상시 성장하는 키워드를 찾고, 시즌성 노이즈를 줄입니다.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                    <Target className="h-4 w-4" />
                    경쟁도 관점
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    노출 상품 수·가격대·검색 패턴을 고려해 “진짜 들어갈 만한 키워드”를 고릅니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          id="trial"
          className="mx-auto mt-16 flex max-w-5xl flex-col gap-6 rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-amber-100/60"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                1회 무료 체험
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                로그인 없이 한 번, 우리 챗봇의 제품명 추천을 체험해보세요.
              </h2>
              <p className="text-sm text-slate-600">
                체험 후 계속 사용하려면 로그인 후{" "}
                <span className="font-semibold text-slate-900">키워드 소싱 레이더 Lab</span>으로
                이동합니다.
              </p>
            </div>
            <span className="mt-2 inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              비로그인 1회 · 이후 로그인 필요
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/90 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                기본 상품명
              </span>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 리유저블백"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
            </label>
            <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/90 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                타깃/상황
              </span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="예: 20~30대 여성, 장보기/캠핑 수요"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              강조 포인트
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFocus(tag)}
                  className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedFocus.includes(tag)
                      ? "bg-slate-900 text-white shadow-md shadow-amber-200/50"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                  }`}
                >
                  <span>{tag}</span>
                  <span
                    className="ml-1 text-[10px] opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusTags((prev) => prev.filter((t) => t !== tag));
                      setSelectedFocus((prev) => prev.filter((t) => t !== tag));
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={newFocusTag}
                onChange={(e) => setNewFocusTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleAddFocusTag();
                  }
                }}
                placeholder="직접 키워드 추가 (예: 방수, 재활용)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="button"
                onClick={handleAddFocusTag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
              >
                추가
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTrial}
              disabled={trialLoading || trialUsed}
              className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-200/70 transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:opacity-60"
            >
              {trialLoading
                ? "추천 생성 중..."
                : trialUsed
                  ? "무료 체험 사용 완료"
                  : "무료 체험으로 제품명 받아보기"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              이후에는 로그인 후 Lab에서 계속 사용할 수 있어요.
            </span>
          </div>
          {trialError ? (
            <p className="mt-2 text-sm font-medium text-red-600">{trialError}</p>
          ) : null}

          {trialResult ? (
            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-line">
              {trialResult}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
