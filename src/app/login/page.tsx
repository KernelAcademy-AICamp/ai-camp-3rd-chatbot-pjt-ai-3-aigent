"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [redirect, setRedirect] = useState("/lab");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "magic">("password");

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("redirect");
      if (fromQuery) {
        setRedirect(fromQuery);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace(redirect);
      }
    });
  }, [supabase, router, redirect]);

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("로그인 설정을 찾을 수 없습니다. 환경변수를 확인해주세요.");
      return;
    }
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const redirectTo =
        origin != null
          ? `${origin}/set-password?redirect=${encodeURIComponent(redirect)}`
          : undefined;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setMessage("로그인 링크를 이메일로 보냈어요. 메일함을 확인해주세요.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "로그인 요청 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("로그인 설정을 찾을 수 없습니다. 환경변수를 확인해주세요.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password: password,
        },
      );

      if (signInError) {
        setError(signInError.message);
      } else if (data.user) {
        router.replace(redirect);
      } else {
        setError("로그인에 실패했습니다. 이메일/비밀번호를 다시 확인해주세요.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "로그인 요청 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-amber-100/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <Sparkles className="h-4 w-4" />
          Copaung Code Command
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          로그인하고 소싱 레이더를 사용해보세요
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          기본적으로는 이메일 + 비밀번호로 바로 로그인하고, 필요할 때만 이메일 링크 로그인을
          사용할 수 있습니다.
        </p>

        <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 rounded-full px-3 py-1 ${
              mode === "password"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            이메일 + 비밀번호 로그인
          </button>
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={`flex-1 rounded-full px-3 py-1 ${
              mode === "magic"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            이메일 링크 로그인
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
            <label className="mt-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200/70 transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "로그인 중..." : "로그인"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-2 text-[11px] text-slate-500">
              이미 Supabase Auth에서 이메일/비밀번호로 생성된 계정이 있는 경우에 사용하세요.
              비밀번호를 설정하지 않은 기존 계정은 아래 이메일 링크 로그인 방식을 사용할 수
              있습니다.
            </p>
          </form>
        ) : (
          <form onSubmit={handleMagicSubmit} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200/70 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "로그인 링크 전송 중..." : "로그인 링크 보내기"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-2 text-[11px] text-slate-500">
            비밀번호를 아직 설정하지 않았거나, 메일 링크로 로그인하는 방식이 더 편하다면 이
            옵션을 사용하세요. 입력한 이메일로 로그인 링크를 보내드립니다.
          </p>
        </form>
        )}
        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          아직 계정이 없어도, 이메일 링크 로그인 방식을 사용하면 자동으로 계정이 생성됩니다.
          이후에는 필요하면 관리자 화면이나 별도 기능을 통해 비밀번호를 설정해 둘 수 있습니다.
        </p>
      </div>
    </div>
  );
}
