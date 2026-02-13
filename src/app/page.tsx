import Link from "next/link";
import KanbanBoard from "@/components/KanbanBoard";
import { AGENTS } from "@/lib/agents";

const STATUS_META = {
  idle: { label: "idle", cls: "status-glow-idle" },
  thinking: { label: "thinking", cls: "status-glow-thinking" },
  acting: { label: "acting", cls: "status-glow-acting" },
};

const LAST_ACTIVE: Record<string, string> = {
  peipei: "剛剛",
  "trading-lab": "2 分鐘前",
  coder: "5 分鐘前",
};

const QUICK_ACTIONS = [
  { href: "/", emoji: "📝", label: "新增任務" },
  { href: "/invest", emoji: "📊", label: "查持倉" },
  { href: "/schedule", emoji: "📅", label: "看排程" },
  { href: "/logs", emoji: "📋", label: "活動記錄" },
];

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-6 pb-24">
      <section className="mb-5">
        <h2 className="text-sm md:text-base font-semibold text-white/80 mb-3">Agent 狀態</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
          {AGENTS.map((agent) => {
            const status = STATUS_META[agent.status];
            return (
              <div
                key={agent.id}
                className="glass-card rounded-2xl p-3.5 min-w-[220px] sm:min-w-[240px] snap-start"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{agent.name}</p>
                      <p className="text-xs text-white/60 truncate">{agent.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className={`w-2.5 h-2.5 rounded-full ${status.cls}`} />
                    {status.label}
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/55">上次活動：{LAST_ACTIVE[agent.id] ?? "剛剛"}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm md:text-base font-semibold text-white/80 mb-3">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="glass-card rounded-2xl p-3.5 flex items-center gap-2.5 border border-white/10 hover:border-[#667eea]/45 hover:shadow-[0_0_24px_rgba(102,126,234,0.25)] transition-all"
            >
              <span className="text-xl">{action.emoji}</span>
              <span className="text-sm font-medium text-white/90">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <KanbanBoard />
    </main>
  );
}
