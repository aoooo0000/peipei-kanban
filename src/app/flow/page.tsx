"use client";

import { useState } from "react";

type Tab = "architecture" | "workflow";

interface AgentNode {
  key: string;
  emoji: string;
  title: string;
  desc: string;
  role: "user" | "core" | "agent" | "service";
}

const CORE: AgentNode = { key: "main", emoji: "🐷", title: "霈霈豬", desc: "中央協調 · 任務派發 · 投資分析", role: "core" };
const USER: AgentNode = { key: "andy", emoji: "👤", title: "Andy", desc: "Telegram 直接對話", role: "user" };

const AGENTS: AgentNode[] = [
  { key: "trading", emoji: "📈", title: "Trading Lab", desc: "Paper Trading · 盤中監控 · 策略學習", role: "agent" },
  { key: "coder", emoji: "💻", title: "Coder", desc: "程式開發 · 功能實作 · Bug 修復", role: "agent" },
  { key: "research", emoji: "🔬", title: "Deep Research", desc: "OpenAI o4-mini · 深度報告", role: "agent" },
];

const SERVICES: AgentNode[] = [
  { key: "notion", emoji: "📝", title: "Notion", desc: "知識庫 · 看板 · 文章", role: "service" },
  { key: "gmail", emoji: "📧", title: "Gmail", desc: "MimiVsJames 來源", role: "service" },
  { key: "browser", emoji: "🌐", title: "Browser", desc: "網頁抓取 · 登入操作", role: "service" },
  { key: "alpaca", emoji: "📊", title: "Alpaca", desc: "Paper Trading API", role: "service" },
];

const CONNECTIONS: { from: string; to: string; label: string; bidirectional?: boolean }[] = [
  { from: "andy", to: "main", label: "直接對話", bidirectional: true },
  { from: "main", to: "trading", label: "sessions_send" },
  { from: "main", to: "coder", label: "spawn 任務" },
  { from: "main", to: "research", label: "腳本呼叫" },
  { from: "trading", to: "main", label: "求助升級" },
  { from: "coder", to: "main", label: "回報結果" },
  { from: "main", to: "notion", label: "讀寫" },
  { from: "main", to: "gmail", label: "收信" },
  { from: "main", to: "browser", label: "操作" },
  { from: "trading", to: "alpaca", label: "交易" },
];

interface FlowStep {
  emoji: string;
  title: string;
  desc: string;
  time?: string;
}

interface WorkflowDef {
  title: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  steps: FlowStep[];
}

const WORKFLOWS: WorkflowDef[] = [
  {
    title: "MimiVsJames 整理",
    emoji: "📰",
    gradientFrom: "from-indigo-500/20",
    gradientTo: "to-indigo-900/5",
    cardBg: "bg-indigo-500/10",
    cardBorder: "border-indigo-400/30",
    accentText: "text-indigo-300",
    steps: [
      { emoji: "📧", title: "Gmail 收信", desc: "IMAP 抓取 MimiVsJames 新郵件", time: "05:30 / 15:00" },
      { emoji: "🏷️", title: "分類判斷", desc: "依寄件人分到 4 個 Notion DB" },
      { emoji: "📋", title: "Gate 1: 盤點", desc: "完整抓取文字 + 圖片 + 數據" },
      { emoji: "📐", title: "Gate 2: 結構", desc: "規劃章節、callout、圖片位置" },
      { emoji: "📤", title: "Gate 3: 寫入", desc: "分批上傳 Notion blocks + 圖片" },
      { emoji: "🔗", title: "關聯連結", desc: "自動連結相同標的的舊文章" },
      { emoji: "✅", title: "Gate 4: QA", desc: "COMPLIANCE MATRIX 自檢交付" },
    ],
  },
  {
    title: "Trading Lab 每日循環",
    emoji: "📈",
    gradientFrom: "from-emerald-500/20",
    gradientTo: "to-emerald-900/5",
    cardBg: "bg-emerald-500/10",
    cardBorder: "border-emerald-400/30",
    accentText: "text-emerald-300",
    steps: [
      { emoji: "🎯", title: "盤前準備", desc: "同步 Notion、掃描 Watchlist、風險檢查", time: "21:00" },
      { emoji: "🚀", title: "開盤交易", desc: "開盤 15 分後掃描買點、自動下單", time: "22:45" },
      { emoji: "👁️", title: "盤中監控", desc: "持倉/停損/異動，每小時檢查", time: "23:30-04:00" },
      { emoji: "🌙", title: "收盤決策", desc: "過夜風險評估、部位調整", time: "04:30" },
      { emoji: "📖", title: "盤後反思", desc: "回顧交易、Mimi 學習、策略優化", time: "06:00" },
      { emoji: "📊", title: "週末總結", desc: "績效、勝率、下週計畫", time: "週六 10:00" },
    ],
  },
  {
    title: "霈霈豬每日循環",
    emoji: "🐷",
    gradientFrom: "from-purple-500/20",
    gradientTo: "to-purple-900/5",
    cardBg: "bg-purple-500/10",
    cardBorder: "border-purple-400/30",
    accentText: "text-purple-300",
    steps: [
      { emoji: "📰", title: "Mimi 整理", desc: "Gmail → Notion（4 Gate 流程）", time: "05:30" },
      { emoji: "🎙️", title: "NotebookLM", desc: "Mimi + 游庭皓簡報生成", time: "06:00" },
      { emoji: "☀️", title: "收盤總結", desc: "三大指數、Top5 漲跌、催化劑", time: "07:00" },
      { emoji: "📡", title: "新聞監控", desc: "每 4hr 掃描持股新聞+異動", time: "10/14/18/22" },
      { emoji: "📊", title: "盤前報告", desc: "期指、技術面、Watchlist", time: "21:00" },
      { emoji: "✅", title: "任務看板", desc: "Heartbeat 檢查 Notion 待辦", time: "持續" },
    ],
  },
];

function nodeStyle(role: string) {
  switch (role) {
    case "user": return "border-amber-400/60 bg-amber-500/10 shadow-amber-500/10";
    case "core": return "border-purple-400/70 bg-purple-500/15 shadow-purple-500/20 ring-1 ring-purple-400/30";
    case "agent": return "border-blue-400/50 bg-blue-500/10 shadow-blue-500/10";
    default: return "border-zinc-500/40 bg-zinc-500/5 shadow-zinc-500/5";
  }
}

function roleBadge(role: string) {
  switch (role) {
    case "user": return { label: "用戶", cls: "bg-amber-500/20 text-amber-300" };
    case "core": return { label: "主管", cls: "bg-purple-500/20 text-purple-300" };
    case "agent": return { label: "Agent", cls: "bg-blue-500/20 text-blue-300" };
    default: return { label: "服務", cls: "bg-zinc-500/20 text-zinc-300" };
  }
}

function ArchitectureDiagram() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2"><NodeCard node={USER} size="md" /><ConnectionArrow label="直接對話" bidirectional /><NodeCard node={CORE} size="lg" /></div>
      <div className="flex flex-col items-center gap-2"><div className="flex items-center gap-2 text-zinc-500"><div className="h-px w-8 bg-zinc-600" /><span className="text-xs">派發任務</span><div className="h-px w-8 bg-zinc-600" /></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">{AGENTS.map((agent) => <NodeCard key={agent.key} node={agent} size="md" />)}</div></div>
      <div className="flex flex-col items-center gap-2"><div className="flex items-center gap-2 text-zinc-500"><div className="h-px w-8 bg-zinc-600" /><span className="text-xs">外部服務</span><div className="h-px w-8 bg-zinc-600" /></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">{SERVICES.map((svc) => <NodeCard key={svc.key} node={svc} size="sm" />)}</div></div>
      <div className="rounded-xl border border-white/10 glass-card p-4"><h3 className="text-sm font-semibold text-zinc-400 mb-3">連線關係</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">{CONNECTIONS.map((conn) => <div key={`${conn.from}-${conn.to}`} className="flex items-center gap-2 text-zinc-300"><span className="text-zinc-500">{conn.from === "andy" ? "👤" : conn.from === "main" ? "🐷" : conn.from === "trading" ? "📈" : "💻"}</span><span className="text-zinc-500">{conn.bidirectional ? "↔" : "→"}</span><span className="text-zinc-500">{conn.to === "main" ? "🐷" : conn.to === "trading" ? "📈" : conn.to === "coder" ? "💻" : conn.to === "research" ? "🔬" : conn.to === "notion" ? "📝" : conn.to === "gmail" ? "📧" : conn.to === "browser" ? "🌐" : "📊"}</span><span className="text-zinc-400 ml-1">{conn.label}</span></div>)}</div></div>
    </div>
  );
}

function NodeCard({ node, size = "md" }: { node: AgentNode; size?: "sm" | "md" | "lg" }) {
  const badge = roleBadge(node.role);
  const sizeClasses = { sm: "p-3", md: "p-4", lg: "p-5 sm:p-6" };
  const emojiSize = { sm: "text-xl", md: "text-2xl", lg: "text-3xl sm:text-4xl" };
  const titleSize = { sm: "text-sm", md: "text-base", lg: "text-lg sm:text-xl" };
  return (
    <div className={`rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${nodeStyle(node.role)} ${sizeClasses[size]} ${size === "lg" ? "w-full max-w-xs mx-auto" : ""}`}>
      <div className="flex items-start gap-3"><span className={emojiSize[size]}>{node.emoji}</span><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className={`font-bold ${titleSize[size]}`}>{node.title}</h3><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span></div><p className="text-xs text-zinc-400 mt-1">{node.desc}</p></div></div>
    </div>
  );
}

function ConnectionArrow({ label, bidirectional }: { label: string; bidirectional?: boolean }) {
  return <div className="flex flex-col items-center gap-0.5 py-1">{bidirectional && <span className="text-zinc-500 text-xs">▲</span>}<div className="w-px h-6 bg-gradient-to-b from-zinc-500 to-zinc-600" /><span className="text-[10px] text-zinc-400 bg-transparent px-2">{label}</span><div className="w-px h-6 bg-gradient-to-b from-zinc-600 to-zinc-500" /><span className="text-zinc-500 text-xs">▼</span></div>;
}

function WorkflowSection({ workflow }: { workflow: WorkflowDef }) {
  return (
    <section className={`group rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${workflow.gradientFrom} ${workflow.gradientTo}`}>
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-white/10"><h2 className="text-base sm:text-lg font-bold flex items-center gap-2"><span className="text-xl">{workflow.emoji}</span>{workflow.title}</h2></div>

      <div className="p-4 sm:p-5">
        <div className="hidden sm:flex flex-wrap gap-3 items-stretch">
          {workflow.steps.map((step, idx) => (
            <div key={step.title} className="flex items-center">
              <StepCard step={step} workflow={workflow} idx={idx + 1} />
              {idx < workflow.steps.length - 1 && (
                <svg width="36" height="16" viewBox="0 0 36 16" className="mx-1.5 text-white/40 group-hover:text-white/70 transition-colors">
                  <line x1="1" y1="8" x2="30" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "dashFlow 1.2s linear infinite" }} />
                  <path d="M30 8l-4-3m4 3l-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
          ))}
        </div>

        <div className="sm:hidden space-y-0">
          {workflow.steps.map((step, idx) => (
            <div key={step.title} className="group/step">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${workflow.cardBg} ${workflow.cardBorder} border`}>{idx + 1}</div>
                  {idx < workflow.steps.length - 1 && (
                    <svg width="2" height="28" viewBox="0 0 2 28" className="text-white/40 group-hover:text-white/70">
                      <line x1="1" y1="0" x2="1" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" style={{ animation: "dashFlow 1.2s linear infinite" }} />
                    </svg>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 flex-wrap"><span className="text-lg">{step.emoji}</span><h4 className="font-semibold text-sm">{step.title}</h4>{step.time && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${workflow.cardBg} ${workflow.accentText}`}>{step.time}</span>}</div>
                  <p className="text-xs text-zinc-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, workflow, idx }: { step: FlowStep; workflow: WorkflowDef; idx: number }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 w-[152px] lg:w-[166px] transition-all duration-200 hover:shadow-lg group-hover:brightness-110 ${workflow.cardBg} ${workflow.cardBorder}`}>
      <div className="flex items-center justify-between mb-1"><span className="text-lg">{step.emoji}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">#{idx}</span></div>
      <h4 className="font-semibold text-sm leading-tight">{step.title}</h4>
      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{step.desc}</p>
      {step.time && <div className={`mt-1.5 text-[10px] font-mono ${workflow.accentText}`}>{step.time}</div>}
    </div>
  );
}

export default function FlowPage() {
  const [tab, setTab] = useState<Tab>("architecture");

  return (
    <main className="min-h-screen text-zinc-100 p-4 md:p-6 pb-24 animate-fadeInUp">
      <h1 className="text-xl font-bold mb-4">🔄 流程</h1>
      <div className="flex gap-2 mb-5">{[{ key: "architecture" as Tab, label: "🏗️ 架構圖" }, { key: "workflow" as Tab, label: "⚡ 工作流程" }].map(({ key, label }, idx) => <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all stagger-item ${tab === key ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "glass-card text-zinc-300 hover:bg-[#333350] border border-white/10"}`} style={{ ["--stagger" as string]: `${idx * 70}ms` }}>{label}</button>)}</div>
      {tab === "architecture" ? <ArchitectureDiagram /> : <div className="space-y-6">{WORKFLOWS.map((wf, i) => <div key={wf.title} className="stagger-item" style={{ ["--stagger" as string]: `${i * 90}ms` }}><WorkflowSection workflow={wf} /></div>)}</div>}
    </main>
  );
}
