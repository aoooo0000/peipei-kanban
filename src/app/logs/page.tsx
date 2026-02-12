"use client";

import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LogEntry {
  id: string;
  timestamp: string;
  type: "agent" | "task" | "document" | "system";
  message: string;
  details?: string;
}

const TYPE_STYLES = {
  agent: { bg: "bg-blue-600/20", text: "text-blue-300", label: "Agent" },
  task: { bg: "bg-green-600/20", text: "text-green-300", label: "任務" },
  document: { bg: "bg-purple-600/20", text: "text-purple-300", label: "文件" },
  system: { bg: "bg-zinc-600/20", text: "text-zinc-300", label: "系統" },
};

export default function LogsPage() {
  const { data } = useSWR<{ logs: LogEntry[] }>("/api/logs", fetcher, { refreshInterval: 5000 });
  const [filter, setFilter] = useState<"all" | LogEntry["type"]>("all");

  const logs = data?.logs ?? [];
  const filteredLogs = filter === "all" ? logs : logs.filter((log) => log.type === filter);

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📝 日誌</h1>

      {/* 類型篩選 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          全部
        </button>
        {(Object.keys(TYPE_STYLES) as Array<keyof typeof TYPE_STYLES>).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === type
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {TYPE_STYLES[type].label}
          </button>
        ))}
      </div>

      {/* 日誌時間軸 */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            {data ? "沒有日誌記錄" : "載入中..."}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const style = TYPE_STYLES[log.type];
            return (
              <div
                key={log.id}
                className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(log.timestamp).toLocaleString("zh-TW")}
                  </span>
                </div>
                <p className="text-sm text-zinc-200">{log.message}</p>
                {log.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                      詳細資訊
                    </summary>
                    <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-x-auto">
                      {log.details}
                    </pre>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
