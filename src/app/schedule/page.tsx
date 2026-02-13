"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import parser from "cron-parser";
import { CRON_JOBS, type CronJobDef } from "@/lib/cronJobs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type AgentFilter = "all" | "main" | "trading-lab" | "coder";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz?: string };
  description?: string;
  category?: CronJobDef["category"];
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number };
}

const AGENT_META: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  main: { emoji: "🐷", label: "霈霈豬", color: "text-indigo-300", bg: "bg-indigo-500/20", border: "border-indigo-400/40" },
  "trading-lab": { emoji: "📈", label: "Trading Lab", color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-400/40" },
  coder: { emoji: "💻", label: "Coder", color: "text-blue-300", bg: "bg-blue-500/20", border: "border-blue-400/40" },
};

const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
// cron day of week: 0=Sun, 1=Mon, ... 6=Sat
// Map to our display: 一(Mon=1), 二(Tue=2), ..., 日(Sun=0)
const CRON_DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

interface ScheduleSlot {
  job: CronJobDef;
  liveJob?: CronJob;
  hour: number;
  minute: number;
  dayIndices: number[]; // 0=Mon ... 6=Sun
  isSpecialDate: boolean;
  specialDateDesc?: string;
}

function parseCronSchedule(job: CronJobDef): ScheduleSlot {
  const parts = job.schedule.split(" ");
  const minute = parseInt(parts[0]) || 0;
  const hours = parts[1].split(",").map(Number);
  const hour = hours[0]; // primary hour for display
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  // Special date (specific day/month like "0 9 14 2 *")
  if (dayOfMonth !== "*" && month !== "*") {
    return {
      job,
      hour,
      minute,
      dayIndices: [],
      isSpecialDate: true,
      specialDateDesc: `${parseInt(month)}/${parseInt(dayOfMonth)} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    };
  }

  // Parse day of week
  let indices: number[] = [];
  if (dayOfWeek === "*") {
    indices = [0, 1, 2, 3, 4, 5, 6]; // every day
  } else {
    // Handle ranges like "1-5" and lists like "2-6"
    const dowParts = dayOfWeek.split(",");
    for (const p of dowParts) {
      if (p.includes("-")) {
        const [start, end] = p.split("-").map(Number);
        for (let i = start; i <= end; i++) {
          if (CRON_DOW_TO_IDX[i] !== undefined) indices.push(CRON_DOW_TO_IDX[i]);
        }
      } else {
        const n = parseInt(p);
        if (CRON_DOW_TO_IDX[n] !== undefined) indices.push(CRON_DOW_TO_IDX[n]);
      }
    }
  }

  // For multi-hour schedules like "0 10,14,18,22 * * *", create slots for each
  return { job, hour, minute, dayIndices: indices, isSpecialDate: false };
}

function getAllSlots(job: CronJobDef): ScheduleSlot[] {
  const parts = job.schedule.split(" ");
  const hours = parts[1].split(",").map(Number);
  const minuteStr = parts[0];
  const minutes = minuteStr.split(",").map(Number);

  if (hours.length <= 1 && minutes.length <= 1) {
    return [parseCronSchedule(job)];
  }

  // Multi-hour/minute: create a slot per combo
  const slots: ScheduleSlot[] = [];
  const base = parseCronSchedule(job);

  for (const h of hours) {
    for (const m of minutes) {
      slots.push({ ...base, hour: h, minute: m });
    }
  }
  return slots;
}

function fmtTime(h: number, m: number) {
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function fmtDate(ms?: number) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("zh-TW");
}

function fmtDuration(ms?: number) {
  if (!ms) return "-";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function todayRanInTz(): boolean {
  // Check if "today" in Asia/Taipei
  const now = new Date();
  const taipeiDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  return taipeiDate.getDay() >= 0; // always true, used for context
}

function getTodayDowIndex(): number {
  const now = new Date();
  const taipeiDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const dow = taipeiDate.getDay(); // 0=Sun
  return CRON_DOW_TO_IDX[dow];
}

function getExecutionStatus(slot: ScheduleSlot): { status: "ok" | "error" | "pending" | "skipped" | "unknown"; label: string } {
  const liveJob = slot.liveJob;
  if (!liveJob?.state?.lastRunAtMs) return { status: "unknown", label: "尚未執行" };

  const lastRun = new Date(liveJob.state.lastRunAtMs);
  const now = new Date();
  const taipeiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const taipeiLastRun = new Date(lastRun.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));

  const isToday = taipeiNow.toDateString() === taipeiLastRun.toDateString();
  const todayIdx = getTodayDowIndex();
  const shouldRunToday = slot.dayIndices.includes(todayIdx);

  if (!shouldRunToday) return { status: "skipped", label: "今日非執行日" };

  // Check if scheduled time has passed
  const scheduledMinutes = slot.hour * 60 + slot.minute;
  const currentMinutes = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();

  if (currentMinutes < scheduledMinutes) return { status: "pending", label: "等待執行" };

  if (isToday) {
    if (liveJob.state.lastStatus === "ok") return { status: "ok", label: "✅ 已執行" };
    return { status: "error", label: `❌ ${liveJob.state.lastStatus}` };
  }

  return { status: "skipped", label: "今日未執行（可能跳過）" };
}

export default function SchedulePage() {
  const { data } = useSWR<{ jobs: CronJob[] }>("/api/cron/jobs", fetcher, { refreshInterval: 30000 });
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);

  const liveJobs = data?.jobs ?? [];

  // Build all slots from static definitions
  const allSlots = useMemo(() => {
    const slots: ScheduleSlot[] = [];
    for (const jobDef of CRON_JOBS) {
      const jobSlots = getAllSlots(jobDef);
      // Match with live job data
      const liveJob = liveJobs.find(
        (lj) => lj.name === jobDef.name || lj.name.includes(jobDef.name) || lj.id === jobDef.id
      );
      for (const s of jobSlots) {
        s.liveJob = liveJob;
        slots.push(s);
      }
    }
    return slots;
  }, [liveJobs]);

  const filteredSlots = useMemo(() => {
    if (agentFilter === "all") return allSlots;
    return allSlots.filter((s) => s.job.agentId === agentFilter);
  }, [allSlots, agentFilter]);

  const regularSlots = filteredSlots.filter((s) => !s.isSpecialDate);
  const specialSlots = filteredSlots.filter((s) => s.isSpecialDate);

  // Group by time for the weekly grid
  const timeSlots = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();
    for (const slot of regularSlots) {
      const key = fmtTime(slot.hour, slot.minute);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    // Sort by time
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [regularSlots]);

  const todayIdx = getTodayDowIndex();

  return (
    <main className="min-h-screen text-zinc-100 p-4 md:p-6 pb-24">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">🗓️ 排程</h1>

      {/* Agent Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: "all" as AgentFilter, label: "全部", emoji: "📋" },
          { key: "main" as AgentFilter, label: "霈霈豬", emoji: "🐷" },
          { key: "trading-lab" as AgentFilter, label: "Trading Lab", emoji: "📈" },
          { key: "coder" as AgentFilter, label: "Coder", emoji: "💻" },
        ].map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setAgentFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              agentFilter === key
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "glass-card text-zinc-300 hover:bg-[#333350] border border-white/10"
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Weekly Schedule Grid */}
      <section className="rounded-2xl border border-white/10 glass-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-white/10">
          <div className="p-3 text-xs text-zinc-500 font-medium">時間</div>
          {DAYS.map((day, idx) => (
            <div
              key={day}
              className={`p-3 text-center text-sm font-semibold border-l border-white/10 ${
                idx === todayIdx ? "bg-blue-600/20 text-blue-300" : "text-zinc-300"
              }`}
            >
              週{day}
            </div>
          ))}
        </div>

        {/* Time rows */}
        {timeSlots.map(([time, slots]) => (
          <div key={time} className="grid grid-cols-8 border-b border-white/5 hover:bg-white/[0.02]">
            <div className="p-3 text-xs text-zinc-400 font-mono flex items-start">{time}</div>
            {DAYS.map((_, dayIdx) => {
              const daySlots = slots.filter((s) => s.dayIndices.includes(dayIdx));
              return (
                <div key={dayIdx} className={`p-1.5 border-l border-white/5 min-h-[52px] ${dayIdx === todayIdx ? "bg-blue-600/5" : ""}`}>
                  <div className="space-y-1">
                    {daySlots.map((slot, i) => {
                      const meta = AGENT_META[slot.job.agentId] || AGENT_META.main;
                      const execStatus = dayIdx === todayIdx ? getExecutionStatus(slot) : null;
                      return (
                        <button
                          key={`${slot.job.id}-${i}`}
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full text-left rounded-lg px-2 py-1.5 text-[11px] leading-tight border transition-all hover:scale-[1.02] hover:brightness-110 ${meta.bg} ${meta.border}`}
                        >
                          <div className="flex items-center gap-1">
                            <span>{meta.emoji}</span>
                            <span className={`font-medium ${meta.color} truncate`}>{slot.job.name}</span>
                          </div>
                          {execStatus && dayIdx === todayIdx && (
                            <div className={`mt-0.5 text-[9px] ${
                              execStatus.status === "ok" ? "text-green-400" :
                              execStatus.status === "error" ? "text-red-400" :
                              execStatus.status === "pending" ? "text-yellow-400" :
                              "text-zinc-500"
                            }`}>
                              {execStatus.label}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {timeSlots.length === 0 && (
          <div className="p-8 text-center text-zinc-500">無排程任務</div>
        )}
      </section>

      {/* Special Date Schedules */}
      {specialSlots.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">📌 特殊日期排程</h2>
          <div className="space-y-2">
            {specialSlots.map((slot) => {
              const meta = AGENT_META[slot.job.agentId] || AGENT_META.main;
              return (
                <button
                  key={slot.job.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full text-left rounded-xl p-4 border transition-all hover:brightness-110 ${meta.bg} ${meta.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.emoji}</span>
                      <div>
                        <div className={`font-semibold ${meta.color}`}>{slot.job.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{slot.job.description}</div>
                      </div>
                    </div>
                    <div className="text-sm font-mono text-zinc-300">{slot.specialDateDesc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Detail Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedSlot(null)}>
          <div className="w-full max-w-lg rounded-2xl glass-card-strong border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-4 ${AGENT_META[selectedSlot.job.agentId]?.bg || "bg-zinc-800"} border-b border-white/10`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{AGENT_META[selectedSlot.job.agentId]?.emoji || "⚙️"}</span>
                <div>
                  <h3 className="text-lg font-bold">{selectedSlot.job.name}</h3>
                  <span className={`text-sm ${AGENT_META[selectedSlot.job.agentId]?.color || "text-zinc-300"}`}>
                    {AGENT_META[selectedSlot.job.agentId]?.label || selectedSlot.job.agentId}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-zinc-500 mb-1">描述</div>
                <div className="text-sm text-zinc-200">{selectedSlot.job.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">排程</div>
                  <div className="text-sm font-mono text-zinc-200">{selectedSlot.job.schedule}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">執行時間</div>
                  <div className="text-sm text-zinc-200">
                    {selectedSlot.isSpecialDate
                      ? selectedSlot.specialDateDesc
                      : `${fmtTime(selectedSlot.hour, selectedSlot.minute)}`}
                  </div>
                </div>
              </div>

              {!selectedSlot.isSpecialDate && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">執行日</div>
                  <div className="flex gap-1.5">
                    {DAYS.map((day, idx) => (
                      <span
                        key={day}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                          selectedSlot.dayIndices.includes(idx)
                            ? "bg-blue-600/30 text-blue-300 border border-blue-400/40"
                            : "bg-zinc-800 text-zinc-600"
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Live execution status */}
              {selectedSlot.liveJob?.state && (
                <div className="rounded-xl bg-black/20 p-3 border border-white/5">
                  <div className="text-xs text-zinc-500 mb-2">執行狀態（即時）</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-zinc-500">上次執行：</span>
                      <span className="text-zinc-200">{fmtDate(selectedSlot.liveJob.state.lastRunAtMs)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">狀態：</span>
                      <span className={selectedSlot.liveJob.state.lastStatus === "ok" ? "text-green-400" : "text-red-400"}>
                        {selectedSlot.liveJob.state.lastStatus === "ok" ? "🟢 成功" : `🔴 ${selectedSlot.liveJob.state.lastStatus}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">耗時：</span>
                      <span className="text-zinc-200">{fmtDuration(selectedSlot.liveJob.state.lastDurationMs)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">下次執行：</span>
                      <span className="text-zinc-200">{fmtDate(selectedSlot.liveJob.state.nextRunAtMs)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Today's status */}
              {(() => {
                const todayStatus = getExecutionStatus(selectedSlot);
                return (
                  <div className={`rounded-xl p-3 border ${
                    todayStatus.status === "ok" ? "bg-green-500/10 border-green-400/20" :
                    todayStatus.status === "error" ? "bg-red-500/10 border-red-400/20" :
                    todayStatus.status === "pending" ? "bg-yellow-500/10 border-yellow-400/20" :
                    "bg-zinc-800/50 border-white/5"
                  }`}>
                    <div className="text-xs text-zinc-500 mb-1">今日狀態</div>
                    <div className={`text-sm font-medium ${
                      todayStatus.status === "ok" ? "text-green-300" :
                      todayStatus.status === "error" ? "text-red-300" :
                      todayStatus.status === "pending" ? "text-yellow-300" :
                      "text-zinc-400"
                    }`}>
                      {todayStatus.label}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-white/10">
              <button onClick={() => setSelectedSlot(null)} className="w-full rounded-xl bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
