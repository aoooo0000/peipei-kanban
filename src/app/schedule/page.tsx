"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { CRON_JOBS, type CronJobDef } from "@/lib/cronJobs";
import { fetchJSON } from "@/lib/api";

const fetcher = <T,>(url: string) => fetchJSON<T>(url, 9000);

type AgentFilter = "all" | "main" | "trading-lab" | "coder";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz?: string };
  description?: string;
  category?: CronJobDef["category"];
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number; lastError?: string };
}

const AGENT_META: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  main: { emoji: "🐷", label: "霈霈豬", color: "text-indigo-300", bg: "bg-indigo-500/20", border: "border-indigo-400/40" },
  "trading-lab": { emoji: "📈", label: "Trading Lab", color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-400/40" },
  coder: { emoji: "💻", label: "Coder", color: "text-blue-300", bg: "bg-blue-500/20", border: "border-blue-400/40" },
};

const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const CRON_DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

interface ScheduleSlot {
  job: CronJobDef;
  liveJob?: CronJob;
  hour: number;
  minute: number;
  dayIndices: number[];
  isSpecialDate: boolean;
  specialDateDesc?: string;
}

function parseCronSchedule(job: CronJobDef): ScheduleSlot {
  const parts = job.schedule.split(" ");
  const minute = parseInt(parts[0]) || 0;
  const hour = (parts[1].split(",").map(Number))[0];
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

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

  let indices: number[] = [];
  if (dayOfWeek === "*") {
    indices = [0, 1, 2, 3, 4, 5, 6];
  } else {
    for (const p of dayOfWeek.split(",")) {
      if (p.includes("-")) {
        const [start, end] = p.split("-").map(Number);
        for (let i = start; i <= end; i++) if (CRON_DOW_TO_IDX[i] !== undefined) indices.push(CRON_DOW_TO_IDX[i]);
      } else {
        const n = parseInt(p);
        if (CRON_DOW_TO_IDX[n] !== undefined) indices.push(CRON_DOW_TO_IDX[n]);
      }
    }
  }

  return { job, hour, minute, dayIndices: indices, isSpecialDate: false };
}

function getAllSlots(job: CronJobDef): ScheduleSlot[] {
  const parts = job.schedule.split(" ");
  const hours = parts[1].split(",").map(Number);
  const minutes = parts[0].split(",").map(Number);

  if (hours.length <= 1 && minutes.length <= 1) return [parseCronSchedule(job)];

  const base = parseCronSchedule(job);
  const slots: ScheduleSlot[] = [];
  for (const h of hours) for (const m of minutes) slots.push({ ...base, hour: h, minute: m });
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

function getTaipeiNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
}

function getDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getTodayDowIndex(): number {
  const dow = getTaipeiNow().getDay();
  return CRON_DOW_TO_IDX[dow];
}

function getCurrentTimeLinePercent(timeSlots: Array<[string, ScheduleSlot[]]>) {
  if (!timeSlots.length) return null;
  const [minHour, minMinute] = timeSlots[0][0].split(":").map(Number);
  const [maxHour, maxMinute] = timeSlots[timeSlots.length - 1][0].split(":").map(Number);
  const startMin = minHour * 60 + minMinute;
  const endMin = maxHour * 60 + maxMinute;
  const now = getTaipeiNow();
  const current = now.getHours() * 60 + now.getMinutes();
  if (current < startMin || current > endMin || endMin === startMin) return null;
  return ((current - startMin) / (endMin - startMin)) * 100;
}

function getExecutionStatus(slot: ScheduleSlot): { status: "ok" | "error" | "pending" | "skipped" | "unknown"; label: string } {
  const liveJob = slot.liveJob;
  if (!liveJob?.state?.lastRunAtMs) return { status: "unknown", label: "尚未執行" };

  const lastRun = new Date(liveJob.state.lastRunAtMs);
  const taipeiNow = getTaipeiNow();
  const taipeiLastRun = new Date(lastRun.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const isToday = taipeiNow.toDateString() === taipeiLastRun.toDateString();
  const todayIdx = getTodayDowIndex();
  const shouldRunToday = slot.dayIndices.includes(todayIdx);

  if (!shouldRunToday) return { status: "skipped", label: "今日非執行日" };

  const scheduledMinutes = slot.hour * 60 + slot.minute;
  const currentMinutes = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();
  if (currentMinutes < scheduledMinutes) return { status: "pending", label: "等待執行" };

  if (isToday) {
    if (liveJob.state.lastStatus === "ok") return { status: "ok", label: "✅ 已執行" };
    // Announce failures (thread not found etc) = task itself succeeded
    const errMsg = liveJob.state.lastError || "";
    if (errMsg.includes("thread not found") || errMsg.includes("sendMessage")) return { status: "ok", label: "✅ 已執行" };
    return { status: "error", label: `❌ ${liveJob.state.lastStatus}` };
  }
  return { status: "skipped", label: "今日未執行" };
}

function getStatusForDate(slot: ScheduleSlot, selectedDate: Date, todayKey: string): { status: "ok" | "pending" | "skipped" | "error"; label: string; className: string } {
  const dow = CRON_DOW_TO_IDX[selectedDate.getDay()];
  const shouldRun = slot.dayIndices.includes(dow);
  if (!shouldRun) return { status: "skipped", label: "⚪ 非執行日", className: "bg-zinc-500/20 text-zinc-300 border-zinc-400/30" };

  if (getDateKey(selectedDate) !== todayKey) {
    return { status: "pending", label: "⏳ 等待", className: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30" };
  }

  const s = getExecutionStatus(slot);
  if (s.status === "ok") return { status: "ok", label: "✅ 已執行", className: "bg-green-500/20 text-green-300 border-green-400/30" };
  if (s.status === "error") return { status: "error", label: "⚠️ 異常", className: "bg-orange-500/20 text-orange-300 border-orange-400/30" };
  if (s.status === "pending") return { status: "pending", label: "⏳ 等待", className: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30" };
  return { status: "pending", label: "⏳ 等待", className: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30" };
}

export default function SchedulePage() {
  const { data, error, mutate } = useSWR<{ jobs: CronJob[] }>("/api/cron/jobs", fetcher, { refreshInterval: 30000 });
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);

  const taipeiToday = getTaipeiNow();
  const [selectedDateKey, setSelectedDateKey] = useState(getDateKey(taipeiToday));

  const mobileDateOptions = useMemo(() => {
    const today = getTaipeiNow();
    return Array.from({ length: 14 }, (_, idx) => {
      const date = addDays(today, idx - 6);
      return {
        key: getDateKey(date),
        date,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        weekLabel: `週${DAYS[CRON_DOW_TO_IDX[date.getDay()]]}`,
      };
    });
  }, []);

  const selectedDate = useMemo(() => {
    const found = mobileDateOptions.find((d) => d.key === selectedDateKey);
    return found?.date ?? getTaipeiNow();
  }, [mobileDateOptions, selectedDateKey]);

  const allSlots = useMemo(() => {
    const liveJobs = data?.jobs ?? [];
    const slots: ScheduleSlot[] = [];
    for (const jobDef of CRON_JOBS) {
      const jobSlots = getAllSlots(jobDef);
      const liveJob = liveJobs.find((lj) => {
          const ln = lj.name?.toLowerCase() ?? "";
          const dn = jobDef.name?.toLowerCase() ?? "";
          return lj.id === jobDef.id || lj.name === jobDef.name ||
            ln.includes(dn) || dn.includes(ln) ||
            (jobDef.id === "pp-mimi-check" && ln.includes("mimivsjames")) ||
            (jobDef.id === "pp-mimi-nb-06" && ln.includes("notebooklm") && ln.includes("06")) ||
            (jobDef.id === "pp-mimi-nb-15" && ln.includes("notebooklm") && ln.includes("15")) ||
            (jobDef.id === "pp-yu-nb" && ln.includes("yu-notebooklm")) ||
            (jobDef.id === "pp-close-summary" && ln.includes("收盤總結")) ||
            (jobDef.id === "pp-news" && ln.includes("新聞")) ||
            (jobDef.id === "pp-premarket" && ln.includes("盤前報告")) ||
            (jobDef.id === "pp-nak-doj" && ln.includes("nak")) ||
            (ln.includes("盤前準備") && dn.includes("盤前準備")) ||
            (ln.includes("週末總結") && dn.includes("週末總結")) ||
            (ln.includes("盤後反思") && dn.includes("盤後反思")) ||
            (lj.schedule?.expr === jobDef.schedule && lj.agentId === jobDef.agentId);
        });
      for (const s of jobSlots) {
        s.liveJob = liveJob;
        slots.push(s);
      }
    }
    return slots;
  }, [data?.jobs]);

  const filteredSlots = useMemo(() => {
    if (agentFilter === "all") return allSlots;
    return allSlots.filter((s) => s.job.agentId === agentFilter);
  }, [allSlots, agentFilter]);

  const regularSlots = filteredSlots.filter((s) => !s.isSpecialDate);
  const specialSlots = filteredSlots.filter((s) => s.isSpecialDate);

  const timeSlots = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();
    for (const slot of regularSlots) {
      const key = fmtTime(slot.hour, slot.minute);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [regularSlots]);

  const mobileDaySlots = useMemo(() => {
    const dayIdx = CRON_DOW_TO_IDX[selectedDate.getDay()];
    return regularSlots
      .filter((slot) => slot.dayIndices.includes(dayIdx))
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  }, [regularSlots, selectedDate]);

  const todayIdx = getTodayDowIndex();
  const nowLinePercent = getCurrentTimeLinePercent(timeSlots);

  return (
    <main className="min-h-screen text-zinc-100 p-4 md:p-6 pb-24 animate-fadeInUp">
      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 p-4">
          <p className="text-sm text-red-100">排程資料載入失敗。</p>
          <button onClick={() => mutate()} className="mt-2 rounded bg-red-500/35 px-3 py-1 text-xs">重試</button>
        </div>
      )}
      <h1 className="text-xl font-bold mb-4">🗓️ 排程</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: "all" as AgentFilter, label: "全部", emoji: "📋" },
          { key: "main" as AgentFilter, label: "霈霈豬", emoji: "🐷" },
          { key: "trading-lab" as AgentFilter, label: "Trading Lab", emoji: "📈" },
          { key: "coder" as AgentFilter, label: "Coder", emoji: "💻" },
        ].map(({ key, label, emoji }, idx) => (
          <button
            key={key}
            onClick={() => setAgentFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all stagger-item ${
              agentFilter === key
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "glass-card text-zinc-300 hover:bg-[#333350] border border-white/10"
            }`}
            style={{ ["--stagger" as string]: `${idx * 60}ms` }}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="rounded-2xl border border-white/10 glass-card p-5 space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded skeleton-glass" />)}
        </div>
      ) : (
        <>
          <section className="sm:hidden space-y-3">
            <div className="rounded-2xl border border-white/10 glass-card p-3">
              <div className="mb-2 text-xs text-zinc-400">選擇日期</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mobileDateOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedDateKey(opt.key)}
                    className={`shrink-0 rounded-xl px-3 py-2 border text-xs ${
                      selectedDateKey === opt.key
                        ? "bg-blue-600/30 border-blue-400/40 text-blue-200"
                        : "bg-black/20 border-white/10 text-zinc-300"
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-80">{opt.weekLabel}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {mobileDaySlots.map((slot, idx) => {
                const meta = AGENT_META[slot.job.agentId] || AGENT_META.main;
                const badge = getStatusForDate(slot, selectedDate, getDateKey(taipeiToday));
                return (
                  <button
                    key={`${slot.job.id}-${slot.hour}-${slot.minute}-${idx}`}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full text-left rounded-xl border p-3 ${meta.bg} ${meta.border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-mono text-zinc-200">{fmtTime(slot.hour, slot.minute)}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span>{meta.emoji}</span>
                          <span className={`text-sm font-medium ${meta.color}`}>{slot.job.name}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </button>
                );
              })}

              {mobileDaySlots.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-400">當天無排程任務</div>
              )}
            </div>
          </section>

          <section className="hidden sm:block rounded-2xl border border-white/10 glass-card overflow-hidden relative">
            {nowLinePercent !== null && (
              <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: `calc(${nowLinePercent}% + 46px)` }}>
                <div className="h-[2px] bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]" />
              </div>
            )}

            <div className="grid grid-cols-8 border-b border-white/10 bg-black/10">
              <div className="p-3 text-xs text-zinc-500 font-medium">時間軸</div>
              {DAYS.map((day, idx) => (
                <div key={day} className={`p-3 text-center text-sm font-semibold border-l border-white/10 ${idx === todayIdx ? "bg-blue-600/20 text-blue-300" : "text-zinc-300"}`}>
                  週{day}
                </div>
              ))}
            </div>

            {timeSlots.map(([time, slots], rowIdx) => (
              <div key={time} className="grid grid-cols-8 border-b border-white/5 hover:bg-white/[0.02]">
                <div className="p-3 text-xs text-zinc-400 font-mono flex items-start gap-2">
                  <span className="text-zinc-600">{rowIdx + 1}</span>
                  <span>{time}</span>
                </div>
                {DAYS.map((_, dayIdx) => {
                  const daySlots = slots.filter((s) => s.dayIndices.includes(dayIdx));
                  return (
                    <div key={dayIdx} className={`p-1.5 border-l border-white/5 min-h-[56px] ${dayIdx === todayIdx ? "bg-blue-600/5" : ""}`}>
                      <div className="space-y-1">
                        {daySlots.map((slot, i) => {
                          const meta = AGENT_META[slot.job.agentId] || AGENT_META.main;
                          const execStatus = dayIdx === todayIdx ? getExecutionStatus(slot) : null;
                          return (
                            <button
                              key={`${slot.job.id}-${i}`}
                              onClick={() => setSelectedSlot(slot)}
                              className={`group relative w-full text-left rounded-lg px-2 py-1.5 text-[11px] leading-tight border transition-all ${meta.bg} ${meta.border}`}
                            >
                              <span className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-white/40" />
                              <div className="pl-1.5">
                                <div className="flex items-center gap-1">
                                  <span>{meta.emoji}</span>
                                  <span className={`font-medium ${meta.color} truncate`}>{slot.job.name}</span>
                                </div>
                                {execStatus && (
                                  <div className={`mt-0.5 text-[9px] ${
                                    execStatus.status === "ok" ? "text-green-400" :
                                    execStatus.status === "error" ? "text-red-400" :
                                    execStatus.status === "pending" ? "text-yellow-400" : "text-zinc-500"
                                  }`}>
                                    {execStatus.label}
                                  </div>
                                )}
                              </div>
                              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:block rounded-md bg-black/85 border border-white/15 px-2 py-1 text-[10px] whitespace-nowrap">
                                {slot.job.description || slot.job.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {timeSlots.length === 0 && <div className="p-8 text-center text-zinc-500">🗂️ 無排程任務</div>}
          </section>
        </>
      )}

      {specialSlots.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">📌 特殊日期排程</h2>
          <div className="space-y-2">
            {specialSlots.map((slot) => {
              const meta = AGENT_META[slot.job.agentId] || AGENT_META.main;
              return (
                <button key={slot.job.id} onClick={() => setSelectedSlot(slot)} className={`w-full text-left rounded-xl p-4 border transition-all ${meta.bg} ${meta.border}`}>
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

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedSlot(null)}>
          <div className="w-full max-w-lg rounded-2xl glass-card-strong border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                  <div className="text-sm text-zinc-200">{selectedSlot.isSpecialDate ? selectedSlot.specialDateDesc : fmtTime(selectedSlot.hour, selectedSlot.minute)}</div>
                </div>
              </div>

              {selectedSlot.liveJob?.state && (
                <div className="rounded-xl bg-black/20 p-3 border border-white/5">
                  <div className="text-xs text-zinc-500 mb-2">執行狀態（即時）</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-zinc-500">上次執行：</span><span className="text-zinc-200">{fmtDate(selectedSlot.liveJob.state.lastRunAtMs)}</span></div>
                    <div><span className="text-zinc-500">狀態：</span><span className={selectedSlot.liveJob.state.lastStatus === "ok" ? "text-green-400" : "text-red-400"}>{selectedSlot.liveJob.state.lastStatus === "ok" ? "🟢 成功" : `🔴 ${selectedSlot.liveJob.state.lastStatus}`}</span></div>
                    <div><span className="text-zinc-500">耗時：</span><span className="text-zinc-200">{fmtDuration(selectedSlot.liveJob.state.lastDurationMs)}</span></div>
                    <div><span className="text-zinc-500">下次執行：</span><span className="text-zinc-200">{fmtDate(selectedSlot.liveJob.state.nextRunAtMs)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <button onClick={() => setSelectedSlot(null)} className="w-full rounded-xl bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500">關閉</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
