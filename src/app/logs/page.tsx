"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type LogType = "agent" | "task" | "system";

interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  title: string;
  description: string;
}

const TYPE_META: Record<LogType | "all", { label: string; color: string; soft: string }> = {
  all: { label: "全部", color: "text-white", soft: "bg-white/10 border-white/20" },
  agent: { label: "Agent", color: "text-[#3b82f6]", soft: "bg-[#3b82f6]/20 border-[#3b82f6]/35" },
  task: { label: "Task", color: "text-[#10b981]", soft: "bg-[#10b981]/20 border-[#10b981]/35" },
  system: { label: "System", color: "text-[#8b5cf6]", soft: "bg-[#8b5cf6]/20 border-[#8b5cf6]/35" },
};

export default function LogsPage() {
  const { data } = useSWR<{ logs: LogEntry[] }>("/api/logs", fetcher, { refreshInterval: 10000 });
  const [filter, setFilter] = useState<"all" | LogType>("all");

  const filteredLogs = useMemo(() => {
    const logs = data?.logs ?? [];
    return filter === "all" ? logs : logs.filter((log) => log.type === filter);
  }, [filter, data?.logs]);

  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp">
      <h1 className="text-xl font-bold mb-5">📋 Activity Log</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((type) => {
          const active = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                active
                  ? `${TYPE_META[type].soft} ${TYPE_META[type].color} shadow-[0_0_20px_rgba(102,126,234,0.18)]`
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {TYPE_META[type].label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent" />

        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            data ? (
              <div className="glass-card rounded-2xl p-6 text-sm text-white/60">📭 目前沒有符合條件的紀錄</div>
            ) : (
              <div className="space-y-3">
                {[0,1,2].map((i) => <div key={i} className="h-20 rounded-2xl skeleton-glass" />)}
              </div>
            )
          ) : (
            filteredLogs.map((log, idx) => (
              <article key={log.id} className="relative pl-8 stagger-item" style={{ ["--stagger" as string]: `${idx * 60}ms` }}>
                <span className={`absolute left-0 top-4 h-4 w-4 rounded-full border ${TYPE_META[log.type].soft}`} />
                <div className="glass-card rounded-2xl border border-white/10 p-4 md:p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${TYPE_META[log.type].soft} ${TYPE_META[log.type].color}`}>
                      {TYPE_META[log.type].label}
                    </span>
                    <time className="text-xs text-white/50">
                      {new Date(log.timestamp).toLocaleString("zh-TW", { hour12: false })}
                    </time>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">{log.title}</h3>
                  <p className="mt-1 text-sm text-white/70 leading-relaxed">{log.description}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
