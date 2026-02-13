"use client";

import { signIn, useSession } from "next-auth/react";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "2.6.3";

export default function LoginPage() {
  const { status } = useSession();
  const now = new Date().toLocaleString("zh-TW", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleGoogleLogin = () => {
    const callbackUrl =
      new URLSearchParams(window.location.search).get("callbackUrl") || "/";
    signIn("google", { callbackUrl });
  };

  return (
    <main className="login-particles relative min-h-screen text-zinc-100 flex items-center justify-center p-6 animate-fadeInUp overflow-hidden">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/15 p-8 shadow-2xl shadow-pink-500/10 relative">
        <div className="text-center mb-4">
          <p className="text-6xl leading-none">🐷</p>
          <p className="text-sm text-pink-200/80 mt-2">霈霈豬看板</p>
        </div>

        <h1 className="text-xl font-bold mb-3 text-center">歡迎回來</h1>
        <p className="text-zinc-300 mb-6 leading-relaxed text-center">
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

        <p className="mt-4 text-xs text-zinc-400 text-center">僅授權帳號可存取此看板。</p>
        <p className="mt-2 text-[11px] text-zinc-500 text-center">v{APP_VERSION} · {now}</p>
      </div>
    </main>
  );
}
