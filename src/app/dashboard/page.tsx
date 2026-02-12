"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AgentStatus {
  state: "idle" | "thinking" | "acting";
  activeAgent?: string;
  lastUpdate?: string;
}

interface TaskSummary {
  total: number;
  byStatus: Record<string, number>;
}

const STATUS_STYLES = {
  idle: { bg: "bg-green-500/20", text: "text-green-400", label: "閒置中" },
  thinking: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "思考中" },
  acting: { bg: "bg-blue-500/20", text: "text-blue-400", label: "執行中" },
};

export default function DashboardPage() {
  const { data: statusData } = useSWR<AgentStatus>("/api/status", fetcher, { refreshInterval: 3000 });
  const { data: tasksData } = useSWR<TaskSummary>("/api/dashboard/tasks", fetcher, { refreshInterval: 10000 });

  const status = statusData?.state ?? "idle";
  const style = STATUS_STYLES[status];

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📊 總覽</h1>

      {/* Agent 狀態燈 */}
      <section className="mb-6">
        <div className={`rounded-2xl p-6 border border-white/10 ${style.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm text-zinc-400 mb-2">Agent 狀態</h2>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${style.text.replace("text-", "bg-")} animate-pulse`} />
                <span className={`text-2xl font-bold ${style.text}`}>{style.label}</span>
              </div>
            </div>
            {statusData?.activeAgent && (
              <div className="text-right">
                <div className="text-xs text-zinc-400 mb-1">活躍 Agent</div>
                <div className="text-lg font-semibold">{statusData.activeAgent}</div>
              </div>
            )}
          </div>
          {statusData?.lastUpdate && (
            <div className="mt-4 text-xs text-zinc-400">
              最後更新：{new Date(statusData.lastUpdate).toLocaleString("zh-TW")}
            </div>
          )}
        </div>
      </section>

      {/* 任務摘要 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">任務概況</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
            <div className="text-3xl font-bold text-blue-400">{tasksData?.total ?? 0}</div>
            <div className="text-sm text-zinc-400 mt-1">總任務數</div>
          </div>
          {tasksData?.byStatus &&
            Object.entries(tasksData.byStatus).map(([status, count]) => (
              <div key={status} className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
                <div className="text-2xl font-bold text-zinc-200">{count}</div>
                <div className="text-xs text-zinc-400 mt-1">{status}</div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
