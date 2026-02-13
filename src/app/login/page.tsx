"use client";

import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const { status } = useSession();

  const handleGoogleLogin = () => {
    const callbackUrl =
      new URLSearchParams(window.location.search).get("callbackUrl") || "/";
    signIn("google", { callbackUrl });
  };

  return (
    <main className="min-h-screen text-zinc-100 flex items-center justify-center p-6 animate-fadeInUp">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/15 p-8 shadow-2xl shadow-pink-500/10">
        <p className="text-sm text-pink-200/80 mb-2">🐷 霈霈豬看板</p>
        <h1 className="text-xl font-bold mb-3">歡迎回來</h1>
        <p className="text-zinc-300 mb-6 leading-relaxed">
          這裡是霈霈豬的工作基地，請使用 Google 帳號登入後繼續。
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={status === "loading"}
          className="w-full rounded-xl bg-white text-zinc-900 px-4 py-3 font-medium hover:bg-zinc-100 transition disabled:opacity-60"
        >
          {status === "loading" ? "登入中..." : "使用 Google 登入"}
        </button>

        <p className="mt-4 text-xs text-zinc-400">
          僅授權帳號可存取此看板。
        </p>
      </div>
    </main>
  );
}
