"use client";

import { ArrowRight, LogOut, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const defaultFocusTags: string[] = [];

const CATEGORY_TO_CID: Record<string, string> = {
  패션의류: "50000000",
  패션잡화: "50000001",
  "화장품/미용": "50000002",
  "디지털/가전": "50000003",
  "가구/인테리어": "50000004",
  "출산/육아": "50000005",
  식품: "50000006",
  "생활/건강": "50000007",
  "스포츠/레저": "50000008",
  자동차용품: "50000009",
  도서: "50005542",
  "완구/취미": "50000011",
  "문구/오피스": "50000012",
  반려동물용품: "50000013",
  "여가/생활편의": "50000014",
  면세점: "50000015",
  // 이전 라벨 호환용
  생활잡화: "50000007",
  생활용품: "50000007",
};

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
const categoryOptions = [
  "패션의류",
  "패션잡화",
  "화장품/미용",
  "디지털/가전",
  "가구/인테리어",
  "출산/육아",
  "식품",
  "생활/건강",
  "스포츠/레저",
  "자동차용품",
  "도서",
  "완구/취미",
  "문구/오피스",
  "반려동물용품",
  "여가/생활편의",
  "면세점",
] as const;

export default function LabPage() {
  const [focusTags, setFocusTags] = useState<string[]>(defaultFocusTags);
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "키워드 소싱 레이더 Lab입니다. 오른쪽에서 분석 조건과 강조 포인트를 설정한 뒤, 아래 입력창에 궁금한 점을 물어보면 데이터 기반으로 니치 키워드와 제품명 아이디어를 추천해드릴게요.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [newFocusTag, setNewFocusTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // 네이버 데이터랩/마켓 분석용 파라미터
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [devices, setDevices] = useState<string[]>(["전체"]);
  const [gender, setGender] = useState<string>("전체");
  const [ageBuckets, setAgeBuckets] = useState<string[]>(["전체"]);
  const [categories, setCategories] = useState<string[]>(["생활/건강"]);

  const [topKeywords, setTopKeywords] = useState<string[] | null>(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

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

  const handleAddFocusFromTop = (tag: string) => {
    const value = tag.trim();
    if (!value) return;
    setFocusTags((prev) =>
      prev.includes(value) ? prev : [...prev, value],
    );
    setSelectedFocus((prev) =>
      prev.includes(value) ? prev : [...prev, value],
    );
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

  const buildDatalabSnippet = () => {
    const periodText =
      dateFrom && dateTo ? `${dateFrom} ~ ${dateTo}` : "기간 전체";
    const deviceText = devices.length ? devices.join("/") : "전체";
    const genderText = gender || "전체";
    const ageText = ageBuckets.length ? ageBuckets.join(", ") : "전체";
    const categoryText = categories.length ? categories.join(", ") : "전체";

    return `키워드 분석 조건: 기간 ${periodText}, 디바이스 ${deviceText}, 성별 ${genderText}, 연령 ${ageText}, 카테고리 ${categoryText}. 이 조건으로 네이버 검색 기준 인기 키워드 Top 10과 마켓 경쟁도를 기반으로 니치 키워드를 추천해줘.`;
  };

  const handleFetchTopKeywords = async () => {
    setTopError(null);
    setTopKeywords(null);

    if (!dateFrom || !dateTo) {
      setTopError("분석 기간을 먼저 선택해주세요.");
      return;
    }

    const primaryCategory = categories[0] ?? "생활잡화";
    const cid = CATEGORY_TO_CID[primaryCategory] ?? "50000007";

    setTopLoading(true);
    try {
      const params = new URLSearchParams({
        cid,
        timeUnit: "month",
        startDate: dateFrom,
        endDate: dateTo,
        device: mapDeviceToApi(),
        gender: mapGenderToApi(),
        age: mapAgesToApi().join(","),
        limit: "10",
      });

      const res = await fetch(`/api/datalab/top-keywords?${params.toString()}`);
      const data = (await res.json()) as {
        keywords?: { rank: number; keyword: string }[];
        error?: string;
      };

      if (!res.ok || !data.keywords) {
        throw new Error(
          data.error ||
            "Top 키워드 API 응답에서 키워드 목록을 찾지 못했습니다.",
        );
      }

      const kws = data.keywords.map((k) => k.keyword);
      setTopKeywords(kws);
    } catch (err) {
      setTopError(
        err instanceof Error
          ? err.message
          : "Top 키워드 조회 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setTopLoading(false);
    }
  };

  const handleAppendParamsToChat = () => {
    const snippet = buildDatalabSnippet();
    const marker = "키워드 분석 조건:";

    setInputMessage((prev) => {
      if (!prev) return snippet;

      const lines = prev.split(/\r?\n/);
      let replaced = false;

      const nextLines = lines.map((line) => {
        if (!replaced && line.includes(marker)) {
          replaced = true;
          return snippet;
        }
        return line;
      });

      if (!replaced) {
        nextLines.push(snippet);
      }

      return nextLines.join("\n");
    });
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

      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        datalabDebug?: {
          categoryId: string;
          startDate: string;
          endDate: string;
          timeUnit: string;
          keywords: string[];
          analysisRunId: number | null;
        } | null;
      };

      if (!res.ok || !data.reply) {
        throw new Error(data.error || "추천을 생성하지 못했습니다.");
      }

      const next: ChatMessage[] = [
        ...nextMessages,
        { role: "assistant", content: data.reply as string },
      ];

      // 개발 환경에서는 DataLab 트랜잭션이 실제로 실행됐는지
      // 작은 디버그 메시지로 확인할 수 있게 합니다.
      if (
        data.datalabDebug &&
        process.env.NODE_ENV !== "production"
      ) {
        const dbg = data.datalabDebug;
        const debugText = [
          "[디버그] 네이버 DataLab 분석 실행됨",
          `- 분석 기간: ${dbg.startDate} ~ ${dbg.endDate} (${dbg.timeUnit})`,
          `- 카테고리 ID: ${dbg.categoryId}`,
          `- Top 키워드: ${dbg.keywords.join(", ")}`,
        ].join("\n");
        next.push({ role: "assistant", content: debugText });
        // 콘솔에서도 확인 가능
        console.log("Datalab debug", dbg);
      }

      setMessages(next);
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
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      const el = e.target;
                      // 자동 리사이즈: 기본 높이에서 시작해 내용에 맞게 늘리되, 최대 높이를 제한
                      el.style.height = "0px";
                      const next = Math.min(el.scrollHeight, 140); // 약 5~6줄 정도까지
                      el.style.height = `${next}px`;
                    }}
                    placeholder="키워드 소싱 전문가에게 물어보세요. 예: '리유저블백으로 장보기용 니치 제품명 5개만 추천해줘'"
                    rows={2}
                    className="flex-1 max-h-36 min-h-[40px] resize-none overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
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
                  오른쪽 패널에서 설정한 강조 포인트와 분석 조건을 컨텍스트로 사용하고, 위
                  메시지를 기준으로 대화가 이어집니다.
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
            {/* 카테고리 선택 */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sparkles className="h-3 w-3 text-amber-500" />
                카테고리
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                네이버 쇼핑인사이트 1분류 기준 카테고리를 선택합니다. 이 카테고리에 맞춰 Top
                키워드와 키워드 트렌드 분석이 수행됩니다.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
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

            {/* 분석 키워드 섹션 */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sparkles className="h-3 w-3 text-amber-500" />
                분석 키워드
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                어떤 키워드를 중심으로 소싱/브랜딩할지 정의합니다. 분석 키워드는 필요할 때만
                선택적으로 사용해도 되고, 챗봇 프롬프트에 그대로 반영됩니다.
              </p>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">
                    분석 키워드 목록
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
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={handleFetchTopKeywords}
                      disabled={topLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700 disabled:opacity-60"
                    >
                      {topLoading
                        ? "네이버 Top 키워드 불러오는 중..."
                        : "네이버 Top 키워드 상위 10개 불러오기"}
                    </button>
                    <p className="text-[11px] text-slate-500">
                      현재 선택된 카테고리와 분석 조건(기간·범위·성별·연령)에 맞춰 네이버
                      쇼핑인사이트 Top 키워드 상위 10개를 불러와 아래 추천 키워드로 보여줍니다.
                    </p>
                    {topError ? (
                      <p className="text-[11px] font-medium text-red-500">
                        {topError}
                      </p>
                    ) : null}
                  </div>
                  {topKeywords && topKeywords.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500">
                        네이버 Top 키워드에서 가져온 추천 키워드
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {topKeywords.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => handleAddFocusFromTop(kw)}
                            className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
                          >
                            + {kw}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        클릭하면 분석 키워드에 추가되어 챗봇 프롬프트에 반영됩니다.
                      </p>
                    </div>
                  ) : null}
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
