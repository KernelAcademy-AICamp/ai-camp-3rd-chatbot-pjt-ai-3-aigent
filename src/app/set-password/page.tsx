"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function SetPasswordPage() {
  const router = useRouter();
  const [redirect, setRedirect] = useState("/lab");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
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
    if (!supabase) {
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const user = data.user;
        if (!user) {
          router.replace(`/login?redirect=/set-password`);
          return;
        }

        const passwordSet =
          (user.user_metadata as { password_set?: boolean } | null)
            ?.password_set === true;

        if (passwordSet) {
          router.replace(redirect);
        }
      })
      .finally(() => setLoadingUser(false));
  }, [supabase, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("설정 정보를 찾을 수 없습니다. 환경변수를 확인해주세요.");
      return;
    }

    if (!password.trim() || !confirm.trim()) {
      setError("비밀번호와 확인 값을 모두 입력해주세요.");
      return;
    }

    if (password !== confirm) {
      setError("비밀번호와 확인 값이 일치하지 않습니다.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (!data.user) {
        setError("사용자 정보를 찾을 수 없습니다. 다시 로그인 후 시도해주세요.");
        return;
      }

      setMessage("비밀번호를 safely 설정했습니다. 이제 이메일+비밀번호로 로그인할 수 있습니다.");
      router.replace(redirect);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "비밀번호 설정 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/85 p-6 text-slate-900 shadow-xl shadow-amber-100/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Sparkles className="h-4 w-4" />
            Copaung Code Command
          </div>
          <h1 className="mt-4 text-xl font-semibold">
            로그인 상태를 확인하는 중입니다...
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            처음 이메일로 가입하신 경우라면, 비밀번호를 한 번 설정한 뒤에 이메일+비밀번호
            로그인으로 사용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-amber-100/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <Sparkles className="h-4 w-4" />
          Copaung Code Command
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          처음 사용할 비밀번호를 설정하세요
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          이 단계에서 설정한 비밀번호는 다음번부터 이메일+비밀번호 로그인에 사용됩니다. 한 번만
          설정하면 이후에는 바로{" "}
          <span className="font-semibold text-slate-900">{redirect}</span> 로 로그인할 수
          있습니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            새 비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호를 입력하세요"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
          />
          <label className="mt-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            비밀번호 확인
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="다시 한 번 입력하세요"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200/70 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "비밀번호 설정 중..." : "비밀번호 설정하고 계속하기"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <Lock className="h-3 w-3" />
            비밀번호는 Supabase Auth에서 안전하게 암호화되어 저장되며, 우리 서비스 DB에는
            원문이 저장되지 않습니다.
          </p>
        </form>

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>
        ) : null}
      </div>
    </div>
  );
}

