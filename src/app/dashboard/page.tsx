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
  idle: { bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "status-glow-idle", label: "閒置中" },
  thinking: { bg: "bg-amber-500/10", text: "text-amber-300", dot: "status-glow-thinking", label: "思考中" },
  acting: { bg: "bg-red-500/10", text: "text-red-300", dot: "status-glow-acting", label: "執行中" },
};

const TASK_STATUS_ORDER = ["Ideas", "To-do", "進行中", "Review", "完成", "未分類"];

export default function DashboardPage() {
  const { data: statusData } = useSWR<AgentStatus>("/api/status", fetcher, { refreshInterval: 3000 });
  const { data: tasksData } = useSWR<TaskSummary>("/api/dashboard/tasks", fetcher, { refreshInterval: 10000 });

  const status = statusData?.state ?? "idle";
  const style = STATUS_STYLES[status];

  const byStatus = tasksData?.byStatus ?? {};
  const normalizedByStatus = Object.entries(byStatus).reduce<Record<string, number>>((acc, [key, value]) => {
    const normalizedKey = key === "Backlog" ? "Ideas" : key;
    acc[normalizedKey] = (acc[normalizedKey] || 0) + value;
    return acc;
  }, {});

  const statusEntries = [
    ...TASK_STATUS_ORDER.filter((s) => s in normalizedByStatus).map((statusKey) => [statusKey, normalizedByStatus[statusKey]] as const),
    ...Object.entries(normalizedByStatus).filter(([key]) => !TASK_STATUS_ORDER.includes(key)),
  ];

  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📊 總覽</h1>

      <section className="mb-6">
        <div className={`glass-card rounded-2xl p-6 border ${style.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm text-white/60 mb-2">Agent 狀態</h2>
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${style.dot}`} />
                <span className={`text-2xl font-bold ${style.text}`}>{style.label}</span>
              </div>
            </div>
            {statusData?.activeAgent && (
              <div className="text-right">
                <div className="text-xs text-white/60 mb-1">活躍 Agent</div>
                <div className="text-lg font-semibold">{statusData.activeAgent}</div>
              </div>
            )}
          </div>
          {statusData?.lastUpdate && (
            <div className="mt-4 text-xs text-white/55">最後更新：{new Date(statusData.lastUpdate).toLocaleString("zh-TW")}</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">任務概況</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4">
            {tasksData ? <div className="text-3xl font-bold text-[#667eea]">{tasksData.total}</div> : <div className="h-8 rounded skeleton-glass" />}
            <div className="text-sm text-white/60 mt-1">總任務數</div>
          </div>
          {tasksData ? statusEntries.map(([statusKey, count], idx) => (
            <div key={statusKey} className="glass-card rounded-xl p-4 stagger-item" style={{ ["--stagger" as string]: `${idx * 65}ms` }}>
              <div className="text-2xl font-bold text-white/90">{count}</div>
              <div className="text-xs text-white/60 mt-1">{statusKey}</div>
            </div>
          )) : [0,1,2].map((i) => <div key={i} className="glass-card rounded-xl p-4"><div className="h-6 rounded skeleton-glass mb-2"/><div className="h-4 rounded skeleton-glass"/></div>)}
        </div>
        {tasksData && tasksData.total === 0 && <div className="mt-4 glass-card rounded-xl p-5 text-center text-white/65">🫧 還沒有任務，先新增一個小目標吧！</div>}
      </section>
    </main>
  );
}
