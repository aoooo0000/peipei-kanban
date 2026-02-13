"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { CRON_JOBS } from "@/lib/cronJobs";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);

  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp text-white/95">
      <h1 className="text-xl font-bold mb-5">⚙️ 設定</h1>

      <section className="glass-card rounded-2xl border border-white/10 p-4 mb-4">
        <h2 className="font-semibold mb-3">🎨 主題</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="rounded-xl border border-[#667eea]/60 bg-[#667eea]/20 p-3 text-left">
            <p className="font-medium">深色主題（目前）</p>
            <p className="text-xs text-white/65 mt-1">符合 glass 介面風格</p>
          </button>
          <button disabled className="rounded-xl border border-white/10 bg-white/5 p-3 text-left opacity-50 cursor-not-allowed">
            <p className="font-medium">淺色主題（預留）</p>
            <p className="text-xs text-white/60 mt-1">即將推出</p>
          </button>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 p-4 mb-4">
        <h2 className="font-semibold mb-3">🔔 通知</h2>
        <button
          onClick={() => setNotifications((v) => !v)}
          className="w-full rounded-xl border border-white/10 p-3 flex items-center justify-between bg-white/5"
        >
          <span>啟用推播通知（UI 預覽）</span>
          <span className={`inline-flex h-6 w-11 rounded-full p-1 transition ${notifications ? "bg-emerald-500/70" : "bg-white/20"}`}>
            <span className={`h-4 w-4 rounded-full bg-white transition ${notifications ? "translate-x-5" : "translate-x-0"}`} />
          </span>
        </button>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 p-4">
        <h2 className="font-semibold mb-3">📱 關於</h2>
        <div className="space-y-2 text-sm text-white/80">
          <p>版本號：v0.6.0</p>
          <p>Agent 數量：{AGENTS.length}</p>
          <p>Cron Job 數量：{CRON_JOBS.length}</p>
          <p>
            GitHub：
            <Link href="https://github.com" target="_blank" className="text-[#9ab0ff] underline ml-1">
              專案連結
            </Link>
          </p>
          <p className="pt-2 text-pink-200">由霈霈豬 🐷 驅動</p>
        </div>
      </section>
    </main>
  );
}
