"use client";

import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const STATUS_ORDER = ["Ideas", "To-do", "進行中", "Review", "完成", "未分類"];

interface Task {
  id: string;
  title: string;
  status: string;
}

function CompletionRing({ percent }: { percent: number }) {
  return (
    <div
      className="relative h-36 w-36 rounded-full"
      style={{
        background: `conic-gradient(#667eea ${percent * 3.6}deg, rgba(255,255,255,0.14) 0deg)`,
      }}
    >
      <div className="absolute inset-3 rounded-full bg-[#101827] glass-card flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold">{percent}%</p>
          <p className="text-xs text-white/70">完成率</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: tasksData } = useSWR<{ tasks: Task[] }>("/api/tasks", fetcher, { refreshInterval: 10000 });
  const tasks = tasksData?.tasks ?? [];

  const byStatus = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  const done = byStatus["完成"] || 0;
  const total = tasks.length;
  const completion = total === 0 ? 0 : Math.round((done / total) * 100);
  const recentDone = tasks.filter((t) => t.status === "完成").slice(0, 6);
  const todaySchedules = 2; // 內容類：Mimi + NotebookLM
  const flowStages = 4; // Gate 1~4

  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp text-white/95">
      <h1 className="text-xl font-bold mb-4">📊 分析</h1>

      <section className="mb-6 glass-card rounded-2xl p-4 md:p-5">
        <h2 className="text-xl font-bold mb-4">任務統計</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STATUS_ORDER.filter((status) => byStatus[status] !== undefined).map((status) => (
            <div key={status} className="glass-card rounded-xl p-3 border border-white/10">
              <p className="text-xs text-white/75">{status}</p>
              <p className="text-2xl font-bold mt-1">{byStatus[status]}</p>
            </div>
          ))}
          <div className="glass-card rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/75">總任務</p>
            <p className="text-2xl font-bold mt-1">{total}</p>
          </div>
        </div>
      </section>

      <section className="mb-6 glass-card rounded-2xl p-4 md:p-5">
        <h2 className="text-xl font-bold mb-4">完成率</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <CompletionRing percent={completion} />
          <div className="space-y-2 text-sm text-white/80">
            <p>✅ 已完成：{done}</p>
            <p>📋 全部任務：{total}</p>
            <p>🚧 未完成：{Math.max(total - done, 0)}</p>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/schedule" className="glass-card rounded-2xl p-4 border border-white/10">
          <h3 className="text-xl font-bold">🗓️ 排程摘要</h3>
          <p className="text-sm text-white/75 mt-2">今日內容排程：{todaySchedules} 項</p>
          <p className="text-xs text-[#9ab0ff] mt-2">前往排程頁 →</p>
        </Link>
        <Link href="/flow" className="glass-card rounded-2xl p-4 border border-white/10">
          <h3 className="text-xl font-bold">🔄 流程摘要</h3>
          <p className="text-sm text-white/75 mt-2">Mimi Gate 流程：{flowStages} 階段</p>
          <p className="text-xs text-[#9ab0ff] mt-2">前往流程頁 →</p>
        </Link>
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5">
        <h2 className="text-xl font-bold mb-3">最近完成任務</h2>
        <div className="space-y-2">
          {recentDone.length === 0 ? (
            <div className="text-sm text-white/70">尚無已完成任務</div>
          ) : (
            recentDone.map((task) => (
              <div key={task.id} className="rounded-xl border border-white/10 p-3 text-sm text-white/90 bg-white/5">
                ✅ {task.title}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
