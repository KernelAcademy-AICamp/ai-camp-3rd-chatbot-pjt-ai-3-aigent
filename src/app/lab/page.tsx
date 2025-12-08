"use client";

import { ArrowRight, LogOut, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const defaultFocusTags: string[] = [];

const deviceOptions = ["전체", "모바일", "PC"] as const;
const genderOptions = ["전체", "여성", "남성"] as const;
const ageOptions = [
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
const categoryOptions = ["생활잡화", "생활/건강", "생활용품"] as const;

export default function LabPage() {
  const [productName, setProductName] = useState("리유저블백");
  const [focusTags, setFocusTags] = useState<string[]>(defaultFocusTags);
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "키워드 소싱 레이더 Lab입니다. 분석할 기본 상품명과 강조 포인트, 분석 조건을 오른쪽에서 설정한 뒤, 아래 입력창에 궁금한 점을 물어보면 니치 제품명을 추천해드릴게요.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [newFocusTag, setNewFocusTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 네이버 데이터랩/마켓 분석용 파라미터
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [devices, setDevices] = useState<string[]>(["전체"]);
  const [gender, setGender] = useState<string>("전체");
  const [ageBuckets, setAgeBuckets] = useState<string[]>(["전체"]);
  const [categories, setCategories] = useState<string[]>(["생활잡화"]);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setUserEmail(data.user?.email ?? null);
      })
      .finally(() => setAuthLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // 기본 날짜(최근 3개월) 세팅
  useEffect(() => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const fromStr = from.toISOString().slice(0, 10);
    setDateFrom(fromStr);
    setDateTo(toStr);
  }, []);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  const toggleFocus = (tag: string) => {
    setSelectedFocus((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleDeleteFocusTag = (tag: string) => {
    setFocusTags((prev) => prev.filter((t) => t !== tag));
    setSelectedFocus((prev) => prev.filter((t) => t !== tag));
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

  const toggleCategory = (value: string) => {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const buildDatalabSnippet = () => {
    const periodText =
      dateFrom && dateTo ? `${dateFrom} ~ ${dateTo}` : "기간 전체";
    const deviceText = devices.length ? devices.join("/") : "전체";
    const genderText = gender || "전체";
    const ageText = ageBuckets.length ? ageBuckets.join(", ") : "전체";
    const categoryText = categories.length ? categories.join(", ") : "전체";

    return `키워드 분석 조건: 기간 ${periodText}, 디바이스 ${deviceText}, 성별 ${genderText}, 연령 ${ageText}, 카테고리 ${categoryText}. 이 조건으로 네이버 검색 기준 인기 키워드 Top 10과 마켓 경쟁도를 기반으로 니치 키워드를 추천해줘.`;
  };

  const handleAppendParamsToChat = () => {
    const snippet = buildDatalabSnippet();
    setInputMessage((prev) => (prev ? `${prev}\n${snippet}` : snippet));
  };

  const handleSend = async () => {
    setError(null);
    if (!inputMessage.trim()) {
      setError("메시지를 입력해주세요.");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
    };
    const nextMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          focus: selectedFocus,
          messages: nextMessages,
          datalabParams: {
            dateFrom,
            dateTo,
            devices,
            gender,
            ageBuckets,
            categories,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "추천을 생성하지 못했습니다.");
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply as string },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "추천을 생성하지 못했어요. 환경변수 설정을 확인하거나 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/85 p-6 text-slate-900 shadow-xl shadow-amber-100/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Sparkles className="h-4 w-4" />
            Copaung Code Command · Lab
          </div>
          <h1 className="mt-4 text-2xl font-semibold">
            로그인 후 키워드 소싱 챗봇을 사용해보세요
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            이 페이지는 키워드 소싱 레이더의 메인 워크스페이스입니다. 로그인하면 ChatGPT처럼
            대화형으로 제품명 추천과 키워드 인사이트를 받을 수 있습니다.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            로그인 여부를 확인하는 중입니다. 잠시 후 자동으로 이동하지 않으면 아래 버튼을 눌러
            직접 로그인해주세요.
          </p>
          <a
            href="/login?redirect=/lab"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200/70 transition hover:bg-slate-800"
          >
            로그인하러 가기
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/85 p-6 text-slate-900 shadow-xl shadow-amber-100/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Sparkles className="h-4 w-4" />
            Copaung Code Command · Lab
          </div>
          <h1 className="mt-4 text-2xl font-semibold">
            로그인 후 키워드 소싱 챗봇을 사용해보세요
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            이 페이지는 키워드 소싱 레이더의 메인 워크스페이스입니다. 로그인하면 ChatGPT처럼
            대화형으로 제품명 추천과 키워드 인사이트를 받을 수 있습니다.
          </p>
          <a
            href="/login?redirect=/lab"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200/70 transition hover:bg-slate-800"
          >
            로그인하러 가기
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col text-slate-900">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/80">
            <Sparkles className="h-4 w-4" />
            키워드 소싱 레이더 · Lab
          </div>
          <span className="hidden text-xs text-slate-500 sm:inline">
            미래 키워드 + 니치 제품명 대화형 분석
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="hidden max-w-[200px] truncate rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200 sm:inline">
            {userEmail}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <LogOut className="h-3 w-3" />
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex flex-1 min-h-0 flex-col md:flex-row bg-gradient-to-br from-amber-50 via-white to-sky-50">
        {/* 채팅 영역 */}
        <section className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={`${message.role}-${idx}`}
                  className={`flex gap-3 ${
                    message.role === "assistant" ? "justify-start" : "justify-end"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">
                      K
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      message.role === "assistant"
                        ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                        : "bg-amber-500 text-slate-950 shadow-md"
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" && (
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-50">
                      U
                    </div>
                  )}
                </div>
              ))}
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  모델이 추천을 계산하고 있어요...
                </div>
              ) : null}
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="border-t border-slate-200 bg-white/90 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.04)] md:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="키워드 소싱 전문가에게 물어보세요. 예: '리유저블백으로 장보기용 니치 제품명 5개만 추천해줘'"
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-amber-300/60 transition hover:bg-amber-400 disabled:opacity-60"
                  >
                    {loading ? "생성 중..." : "보내기"}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  오른쪽 패널에서 설정한 기본 상품명과 강조 포인트, 분석 조건을 컨텍스트로
                  사용하고, 위 메시지를 기준으로 대화가 이어집니다.
                </p>
              </div>
              {error ? (
                <p className="text-[11px] font-medium text-red-500">{error}</p>
              ) : null}
            </div>
          </div>
        </section>

        {/* 오른쪽 컨텍스트/조건 패널 */}
        <aside className="hidden h-full min-h-0 w-full max-w-xs flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-white/90 p-4 text-xs text-slate-700 shadow-inner md:block">
          <div className="space-y-5">
            {/* 프로젝트 컨텍스트 */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sparkles className="h-3 w-3 text-amber-500" />
                프로젝트 컨텍스트
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                어떤 상품을, 어떤 포인트로 소싱/브랜딩할지 정의합니다.
              </p>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">
                    기본 상품명
                  </p>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="예: 리유저블백"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">
                    강조 포인트
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {focusTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleFocus(tag)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          selectedFocus.includes(tag)
                            ? "bg-slate-900 text-white shadow-md shadow-amber-200/50"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                        }`}
                      >
                        <span>{tag}</span>
                        <span
                          className="ml-0.5 text-[10px] opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFocusTag(tag);
                          }}
                        >
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
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
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
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
              </div>
            </div>

            {/* 분석 조건 */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sparkles className="h-3 w-3 text-amber-500" />
                분석 조건
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">
                    기간
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
                      />
                      <span className="text-[11px] text-slate-400">~</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">범위</p>
                  <div className="flex flex-wrap gap-1">
                    {deviceOptions.map((opt) => (
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
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">성별</p>
                  <div className="flex flex-wrap gap-1">
                    {genderOptions.map((opt) => (
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
                    {ageOptions.map((opt) => (
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

                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">
                    카테고리
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {categoryOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleCategory(opt)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          categories.includes(opt)
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAppendParamsToChat}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  조건을 대화에 추가
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 사용 팁 */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sparkles className="h-3 w-3 text-amber-500" />
                사용 팁
              </h2>
              <ul className="mt-2 space-y-2">
                <li>
                  • 기본 상품명은 가능한 구체적으로 입력하세요. 예:{" "}
                  <span className="font-semibold text-amber-500">
                    리유저블백 &gt; 대용량 장보기 리유저블백
                  </span>
                </li>
                <li>
                  • 타깃/상황에는 연령대, 라이프스타일, 사용 맥락을 포함하면 더 좋은 조합이
                  나옵니다.
                </li>
                <li>
                  • 강조 포인트는 2~4개 정도 선택하는 것이 가장 자연스러운 제품명이 나옵니다.
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
