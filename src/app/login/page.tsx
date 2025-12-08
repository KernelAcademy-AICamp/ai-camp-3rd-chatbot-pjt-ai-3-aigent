"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [redirect, setRedirect] = useState("/lab");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${redirect}`
              : undefined,
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

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-amber-100/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <Sparkles className="h-4 w-4" />
          Copaung Code Command
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          이메일로 로그인하고 소싱 레이더를 사용해보세요
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          입력한 이메일로 로그인 링크를 보내드립니다. 클릭하면 자동으로 로그인되며{" "}
          <span className="font-semibold text-slate-900">{redirect}</span> 으로 이동합니다.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
        </form>
        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          아직 계정이 없어도, 이 메일로 처음 로그인하면 자동으로 계정이 생성됩니다.
        </p>
      </div>
    </div>
  );
}
