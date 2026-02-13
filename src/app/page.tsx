"use client";

import Link from "next/link";
import useSWR from "swr";
import KanbanBoard from "@/components/KanbanBoard";
import { CRON_JOBS } from "@/lib/cronJobs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_META = {
  idle: { label: "idle", cls: "status-glow-idle" },
  thinking: { label: "thinking", cls: "status-glow-thinking" },
  acting: { label: "acting", cls: "status-glow-acting" },
};

type AgentState = keyof typeof STATUS_META;

interface AgentStatusItem {
  id: string;
  name: string;
  emoji: string;
  status: AgentState;
  lastActive: string;
}

interface StatusResponse {
  agents: AgentStatusItem[];
  uptime: string;
  version: string;
}

interface Reminder {
  type: "deadline" | "catalyst";
  title: string;
  date: string;
  urgency: "high" | "medium" | "low";
}

const QUICK_ACTIONS = [
  { href: "/", emoji: "📝", label: "新增任務" },
  { href: "/invest", emoji: "📊", label: "查持倉" },
  { href: "/schedule", emoji: "📅", label: "看排程" },
  { href: "/logs", emoji: "📋", label: "活動記錄" },
];

function countTodayJobs() {
  const dow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" })).getDay();
  return CRON_JOBS.filter((job) => {
    const parts = job.schedule.split(" ");
    const dayOfWeek = parts[4];
    if (dayOfWeek === "*") return true;
    return dayOfWeek.split(",").some((part) => {
      if (part.includes("-")) {
        const [s, e] = part.split("-").map(Number);
        return dow >= s && dow <= e;
      }
      return Number(part) === dow;
    });
  }).length;
}

function formatLastActive(iso: string) {
  const d = new Date(iso);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (diffMinutes < 1) return "剛剛";
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours} 小時前`;
}

export default function Home() {
  const { data: tasksData } = useSWR<{ tasks: Array<{ status: string }> }>("/api/tasks", fetcher, { refreshInterval: 15000 });
  const { data: logsData } = useSWR<{ logs: Array<{ id: string; title: string; timestamp: string; type: string }> }>("/api/logs", fetcher, { refreshInterval: 10000 });
  const { data: holdingsData } = useSWR<{ summary: { totalGainLossPercent: number } }>("/api/invest/holdings", fetcher, { refreshInterval: 60000 });
  const { data: statusData } = useSWR<StatusResponse>("/api/status", fetcher, { refreshInterval: 10000 });
  const { data: remindersData } = useSWR<Reminder[]>("/api/reminders", fetcher, { refreshInterval: 30000 });

  const todoCount = (tasksData?.tasks ?? []).filter((t) => t.status !== "完成").length;
  const todayScheduleCount = countTodayJobs();
  const pnl = holdingsData?.summary?.totalGainLossPercent;
  const recentLogs = (logsData?.logs ?? []).slice(0, 5);
  const reminders = remindersData ?? [];

  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp text-white/95">
      <section className="mb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold">Agent 狀態</h2>
          {statusData && <p className="text-xs text-white/70 shrink-0">v{statusData.version} · uptime {statusData.uptime}</p>}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {(statusData?.agents ?? []).map((agent, idx) => {
            const status = STATUS_META[agent.status] ?? STATUS_META.idle;
            return (
              <div
                key={agent.id}
                className="glass-card rounded-2xl p-3.5 min-w-[220px] sm:min-w-[240px] snap-start stagger-item"
                style={{ ["--stagger" as string]: `${idx * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{agent.name}</p>
                      <p className="text-xs text-white/75 truncate">{agent.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/90 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${status.cls}`} />
                    {status.label}
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/70">上次活動：{formatLastActive(agent.lastActive)}</p>
              </div>
            );
          })}
          {!statusData && <div className="glass-card rounded-2xl p-4 min-w-[220px] skeleton-glass" />}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-3">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, idx) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="glass-card rounded-2xl p-3.5 flex items-center gap-2.5 border border-white/10 hover:border-[#667eea]/45 transition-all stagger-item"
              style={{ ["--stagger" as string]: `${idx * 80}ms` }}
            >
              <span className="text-xl">{action.emoji}</span>
              <span className="text-sm font-medium text-white/95 truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-3">今日摘要</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/" className="glass-card rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-white/75">📋 待辦任務數</p>
            <p className="text-2xl font-bold mt-1">{todoCount}</p>
          </Link>
          <Link href="/dashboard" className="glass-card rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-white/75">⏰ 今日排程數</p>
            <p className="text-2xl font-bold mt-1">{todayScheduleCount}</p>
          </Link>
          <Link href="/invest" className="glass-card rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-white/75">📈 持倉概覽</p>
            <p className={`text-2xl font-bold mt-1 ${pnl !== undefined && pnl < 0 ? "text-red-300" : "text-emerald-300"}`}>
              {pnl === undefined ? "--" : `${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`}
            </p>
          </Link>
        </div>
      </section>

      {reminders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">📢 提醒</h2>
          <div className="space-y-2">
            {reminders.map((item) => (
              <div key={`${item.type}-${item.title}`} className="glass-card rounded-xl p-3 border border-amber-300/50 bg-amber-300/10">
                <p className="text-sm font-semibold text-amber-100 break-words">{item.type === "deadline" ? "⏰" : "📌"} {item.title}</p>
                <p className="text-xs text-amber-50/85 mt-1">{item.date} · {item.urgency === "high" ? "高" : item.urgency === "medium" ? "中" : "低"} 優先</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-xl font-bold">最近活動</h2>
          <Link href="/logs" className="text-sm text-[#9ab0ff] shrink-0">查看全部</Link>
        </div>
        <div className="space-y-2">
          {recentLogs.map((log) => (
            <Link key={log.id} href="/logs" className="glass-card rounded-xl p-3 border border-white/10 block">
              <p className="text-sm font-semibold text-white/95 break-words">{log.title}</p>
              <p className="text-xs text-white/70 mt-1">{new Date(log.timestamp).toLocaleString("zh-TW", { hour12: false })}</p>
            </Link>
          ))}
          {recentLogs.length === 0 && <div className="glass-card rounded-xl p-4 text-sm text-white/70">目前沒有活動資料</div>}
        </div>
      </section>

      <section>
        <KanbanBoard />
      </section>
    </main>
  );
}
