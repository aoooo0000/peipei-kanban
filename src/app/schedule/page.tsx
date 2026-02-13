"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import parser from "cron-parser";
import { CRON_JOBS, type CronJobDef } from "@/lib/cronJobs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type CategoryFilter = "all" | "trading" | "content" | "monitoring";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr: string;
    tz?: string;
  };
  description?: string;
  category?: CronJobDef["category"];
  payload?: Record<string, unknown>;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
  };
}

type ViewMode = "week" | "day";

const HOUR_HEIGHT = 52;

const AGENT_STYLES: Record<string, string> = {
  main: "bg-indigo-500/80 border-indigo-300",
  "trading-lab": "bg-emerald-500/80 border-emerald-300",
  coder: "bg-blue-500/80 border-blue-300",
};

const AGENT_EMOJI: Record<string, string> = {
  main: "🐷",
  "trading-lab": "📈",
  coder: "💻",
};

const AGENT_LABEL: Record<string, string> = {
  main: "Main / 霈霈豬",
  "trading-lab": "Trading Lab",
  coder: "Coder",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(date?: number) {
  if (!date) return "-";
  return new Date(date).toLocaleString("zh-TW");
}

function statusLamp(status?: string) {
  if (!status) return "⚪ 未執行";
  if (status.toLowerCase() === "ok") return "🟢 ok";
  if (status.toLowerCase() === "error") return "🔴 error";
  return `⚪ ${status}`;
}

function shortName(job: CronJob) {
  const prefix = AGENT_EMOJI[job.agentId] ?? "⚙️";
  const name = `${prefix} ${job.name}`;
  return name.length <= 10 ? name : `${name.slice(0, 10)}…`;
}

function fallbackJobs(): CronJob[] {
  return CRON_JOBS.map((job) => ({
    id: job.id,
    agentId: job.agentId,
    name: job.name,
    enabled: true,
    schedule: {
      kind: "cron",
      expr: job.schedule,
      tz: job.tz,
    },
    description: job.description,
    category: job.category,
    payload: {},
    state: {},
  }));
}

function getOccurrences(job: CronJob, rangeStart: Date, rangeEnd: Date) {
  if (!job.enabled || job.schedule.kind !== "cron") return [] as Date[];

  try {
    const it = parser.parse(job.schedule.expr, {
      currentDate: new Date(rangeStart.getTime() - 60 * 1000),
      endDate: rangeEnd,
      tz: job.schedule.tz,
    });

    const out: Date[] = [];
    for (let i = 0; i < 300; i += 1) {
      const next = it.next().toDate();
      if (next > rangeEnd) break;
      out.push(next);
    }
    return out;
  } catch {
    return [];
  }
}

export default function SchedulePage() {
  const { data } = useSWR<{ jobs: CronJob[] }>("/api/cron/jobs", fetcher, { refreshInterval: 10000 });
  const [mode, setMode] = useState<ViewMode>("week");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<{ job: CronJob; time: Date } | null>(null);

  const jobs = data?.jobs?.length ? data.jobs : fallbackJobs();
  const filteredJobs = useMemo(() => {
    if (category === "all") return jobs;
    return jobs.filter((job) => job.category === category);
  }, [jobs, category]);

  const now = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(now), [now]);

  const days = useMemo(() => {
    if (mode === "day") return [new Date(now.getFullYear(), now.getMonth(), now.getDate())];
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return d;
    });
  }, [mode, now, weekStart]);

  const rangeStart = useMemo(
    () => (mode === "day" ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) : weekStart),
    [mode, now, weekStart]
  );

  const rangeEnd = useMemo(() => {
    const end = new Date(rangeStart);
    end.setDate(end.getDate() + (mode === "day" ? 1 : 7));
    end.setMilliseconds(-1);
    return end;
  }, [rangeStart, mode]);

  const events = useMemo(() => {
    return filteredJobs.flatMap((job) =>
      getOccurrences(job, rangeStart, rangeEnd).map((time) => ({ job, time }))
    );
  }, [filteredJobs, rangeStart, rangeEnd]);

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 md:p-6 pb-24">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">🗓️ 排程</h1>
        <div className="flex gap-2">
          <button onClick={() => setMode("day")} className={`px-3 py-1.5 rounded-lg text-sm ${mode === "day" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>日視圖</button>
          <button onClick={() => setMode("week")} className={`px-3 py-1.5 rounded-lg text-sm ${mode === "week" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>週視圖</button>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#202033] p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "全部"],
            ["trading", "Trading"],
            ["content", "Content"],
            ["monitoring", "Monitoring"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setCategory(value as CategoryFilter)}
              className={`px-3 py-1.5 rounded-lg text-sm ${category === value ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-300">
          {Object.keys(AGENT_EMOJI).map((agentId) => (
            <div key={agentId} className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-1">
              <span>{AGENT_EMOJI[agentId]}</span>
              <span>{AGENT_LABEL[agentId] ?? agentId}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#202033] p-3 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className="text-xs text-zinc-500 p-2">時間</div>
            {days.map((day) => (
              <div key={day.toISOString()} className="text-xs text-zinc-300 p-2 text-center border-l border-white/10">
                {day.toLocaleDateString("en-US", { weekday: "short" })} {day.getMonth() + 1}/{day.getDate()}
              </div>
            ))}
          </div>

          <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="text-[10px] text-zinc-500 pr-2 text-right border-t border-white/10" style={{ height: HOUR_HEIGHT }}>
                    {h}:00
                  </div>
                ))}
              </div>
              {days.map((day) => (
                <div key={day.toISOString()} className="border-l border-white/10">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="border-t border-white/10" style={{ height: HOUR_HEIGHT }} />
                  ))}
                </div>
              ))}
            </div>

            <div className="absolute inset-0" style={{ left: 64 }}>
              {events.map(({ job, time }, idx) => {
                const dayIndex = mode === "day"
                  ? 0
                  : Math.floor((new Date(time.getFullYear(), time.getMonth(), time.getDate()).getTime() - new Date(weekStart).getTime()) / (24 * 60 * 60 * 1000));
                if (dayIndex < 0 || dayIndex >= days.length) return null;

                const minuteOfDay = time.getHours() * 60 + time.getMinutes();
                const top = (minuteOfDay / 60) * HOUR_HEIGHT + 2;
                const colWidth = `calc((100% - 0px) / ${days.length})`;
                const left = `calc(${colWidth} * ${dayIndex} + 4px)`;

                return (
                  <button
                    key={`${job.id}-${time.toISOString()}-${idx}`}
                    onClick={() => setSelected({ job, time })}
                    className={`absolute h-7 px-2 rounded border text-[10px] text-white text-left truncate ${AGENT_STYLES[job.agentId] ?? "bg-violet-500/80 border-violet-300"}`}
                    style={{ top, left, width: `calc(${colWidth} - 8px)` }}
                    title={`${job.name} @ ${time.toLocaleString("zh-TW")}`}
                  >
                    {shortName(job)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Jobs 列表</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-zinc-300">
              <tr>
                <th className="text-left p-3">名稱</th>
                <th className="text-left p-3">描述</th>
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">分類</th>
                <th className="text-left p-3">排程</th>
                <th className="text-left p-3">上次執行</th>
                <th className="text-left p-3">狀態</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id} className="border-t border-white/10">
                  <td className="p-3">{AGENT_EMOJI[job.agentId] ?? "⚙️"} {job.name}</td>
                  <td className="p-3 text-zinc-300">{job.description ?? "-"}</td>
                  <td className="p-3">{job.agentId}</td>
                  <td className="p-3">{job.category ?? "other"}</td>
                  <td className="p-3 font-mono text-xs">{job.schedule.expr}</td>
                  <td className="p-3">{fmtDate(job.state?.lastRunAtMs)}</td>
                  <td className="p-3">{statusLamp(job.state?.lastStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-xl bg-[#1f1f35] border border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{selected.job.name}</h3>
            <div className="space-y-2 text-sm text-zinc-300">
              <div><span className="text-zinc-500">描述：</span>{selected.job.description ?? "-"}</div>
              <div><span className="text-zinc-500">Schedule：</span>{selected.job.schedule.expr} ({selected.job.schedule.tz ?? "local"})</div>
              <div><span className="text-zinc-500">Last status：</span>{selected.job.state?.lastStatus ?? "-"}</div>
              <div><span className="text-zinc-500">Next run：</span>{fmtDate(selected.job.state?.nextRunAtMs)}</div>
              <div><span className="text-zinc-500">本次時間：</span>{selected.time.toLocaleString("zh-TW")}</div>
            </div>
            <button onClick={() => setSelected(null)} className="mt-4 px-3 py-1.5 rounded bg-blue-600 text-white text-sm">關閉</button>
          </div>
        </div>
      )}
    </main>
  );
}
