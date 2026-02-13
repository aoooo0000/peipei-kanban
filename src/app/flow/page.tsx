"use client";

import { useState } from "react";

type Tab = "architecture" | "workflow";

type NodeItem = {
  key: string;
  title: string;
  emoji: string;
  desc: string;
  status: string;
  cls: string;
  grid: string;
};

type FlowStep = {
  emoji: string;
  title: string;
  desc: string;
};

const nodes: NodeItem[] = [
  { key: "andy", title: "Andy", emoji: "👤", desc: "策略決策與指令來源", status: "online", cls: "border-amber-300/70 shadow-amber-400/20", grid: "col-start-3 row-start-1" },
  { key: "coder", title: "Coder", emoji: "💻", desc: "程式開發與維護", status: "ready", cls: "border-blue-300/70 shadow-blue-400/20", grid: "col-start-1 row-start-2" },
  { key: "research", title: "Deep Research", emoji: "🔬", desc: "深入資料研究", status: "ready", cls: "border-cyan-300/70 shadow-cyan-400/20", grid: "col-start-1 row-start-3" },
  { key: "main", title: "霈霈豬", emoji: "🐷", desc: "中央協調與任務派發", status: "active", cls: "border-purple-300 shadow-purple-500/40 ring-1 ring-purple-300/50", grid: "col-start-3 row-start-2 row-span-2 scale-105" },
  { key: "trading", title: "Trading Lab", emoji: "📈", desc: "交易流程執行", status: "active", cls: "border-emerald-300/70 shadow-emerald-400/20", grid: "col-start-5 row-start-2" },
  { key: "alpaca", title: "Alpaca", emoji: "📊", desc: "券商 API 交易介接", status: "linked", cls: "border-emerald-200/60 shadow-emerald-300/20", grid: "col-start-5 row-start-3" },
  { key: "notion", title: "Notion", emoji: "📝", desc: "知識庫與看板資料", status: "linked", cls: "border-zinc-300/40 shadow-zinc-300/10", grid: "col-start-2 row-start-4" },
  { key: "gmail", title: "Gmail", emoji: "📧", desc: "文章來源與通知", status: "linked", cls: "border-zinc-300/40 shadow-zinc-300/10", grid: "col-start-3 row-start-4" },
  { key: "browser", title: "Browser", emoji: "🌐", desc: "網頁檢索與操作", status: "linked", cls: "border-zinc-300/40 shadow-zinc-300/10", grid: "col-start-4 row-start-4" },
];

const timelines: { title: string; color: string; steps: FlowStep[] }[] = [
  {
    title: "MimiVsJames 整理",
    color: "indigo",
    steps: [
      { emoji: "📧", title: "Gmail 收信", desc: "抓取新文章" },
      { emoji: "🧭", title: "分類判斷", desc: "標註主題與類型" },
      { emoji: "🧱", title: "四道 Gate", desc: "結構、QA、關聯檢查" },
      { emoji: "📝", title: "寫入 Notion", desc: "建立可追蹤知識卡" },
      { emoji: "✅", title: "完成回報", desc: "更新看板與狀態" },
    ],
  },
  {
    title: "Trading Lab 每日循環",
    color: "emerald",
    steps: [
      { emoji: "🌅", title: "盤前準備", desc: "Watchlist + 風險檢查" },
      { emoji: "🚀", title: "開盤交易", desc: "掃描買點與執行" },
      { emoji: "👀", title: "盤中監控", desc: "持倉/停損/異動" },
      { emoji: "🌙", title: "收盤決策", desc: "過夜風險與部位調整" },
      { emoji: "📘", title: "盤後反思", desc: "回顧與策略優化" },
    ],
  },
  {
    title: "霈霈豬每日循環",
    color: "purple",
    steps: [
      { emoji: "☀️", title: "晨間整理", desc: "Mimi + NotebookLM" },
      { emoji: "📰", title: "監控更新", desc: "新聞與異動提示" },
      { emoji: "📊", title: "收盤總結", desc: "指數、持股與催化劑" },
      { emoji: "🧠", title: "盤前報告", desc: "交易前重點整合" },
      { emoji: "🔁", title: "看板同步", desc: "任務狀態持續更新" },
    ],
  },
];

const colorStyles: Record<string, string> = {
  indigo: "border-indigo-300/60 bg-indigo-500/10",
  emerald: "border-emerald-300/60 bg-emerald-500/10",
  purple: "border-purple-300/60 bg-purple-500/10",
};

function statusLamp(status: string) {
  if (status === "active") return "🟢";
  if (status === "online") return "🟡";
  return "⚪";
}

function NodeCard({ node }: { node: NodeItem }) {
  return (
    <div
      className={`rounded-2xl border bg-white/5 backdrop-blur-sm p-3 md:p-4 shadow-lg transition-all duration-200 hover:scale-[1.03] hover:shadow-xl ${node.cls} ${node.grid}`}
    >
      <div className="font-semibold">{node.emoji} {node.title}</div>
      <div className="text-xs text-zinc-300 mt-1">{node.desc}</div>
      <div className="text-xs mt-2 text-zinc-200">{statusLamp(node.status)} {node.status}</div>
    </div>
  );
}

function FlowTimeline({ title, color, steps }: { title: string; color: string; steps: FlowStep[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#202033]/90 p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="overflow-x-auto">
        <div className="flex items-stretch min-w-max gap-2 md:gap-3 pb-2">
          {steps.map((step, idx) => (
            <div key={`${title}-${step.title}`} className="flex items-center">
              <div className={`w-48 rounded-xl border px-3 py-3 shadow-md transition-all duration-200 hover:scale-[1.03] ${colorStyles[color] ?? "border-zinc-300/50 bg-zinc-500/10"}`}>
                <div className="font-medium">{step.emoji} {step.title}</div>
                <div className="text-xs text-zinc-300 mt-1">{step.desc}</div>
              </div>
              {idx < steps.length - 1 && <span className="mx-2 text-lg text-zinc-300">→</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#202033]/90 p-4 md:p-6 overflow-x-auto">
      <div className="relative min-w-[880px] h-[560px]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 880 560" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(244,244,245,0.7)" />
            </marker>
          </defs>
          <path d="M440 140 L440 190" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M260 250 L370 250" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M620 250 L510 250" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M260 350 L370 300" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M620 350 L510 300" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M440 330 L440 430" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M410 430 L320 470" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M440 430 L440 470" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <path d="M470 430 L560 470" stroke="rgba(244,244,245,0.65)" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="446" y="166" fill="rgba(244,244,245,0.75)" fontSize="11">指令</text>
          <text x="300" y="244" fill="rgba(244,244,245,0.75)" fontSize="11">spawn</text>
          <text x="535" y="244" fill="rgba(244,244,245,0.75)" fontSize="11">sessions_send</text>
        </svg>

        <div className="absolute inset-0 grid grid-cols-5 grid-rows-4 gap-4">
          {nodes.map((node) => <NodeCard key={node.key} node={node} />)}
        </div>
      </div>
    </div>
  );
}

export default function FlowPage() {
  const [tab, setTab] = useState<Tab>("architecture");

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 md:p-6 pb-24">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">🔄 流程</h1>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("architecture")}
          className={`px-4 py-2 rounded-lg text-sm ${tab === "architecture" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300"}`}
        >
          架構圖
        </button>
        <button
          onClick={() => setTab("workflow")}
          className={`px-4 py-2 rounded-lg text-sm ${tab === "workflow" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300"}`}
        >
          工作流程
        </button>
      </div>

      {tab === "architecture" ? (
        <ArchitectureDiagram />
      ) : (
        <div className="space-y-6">
          {timelines.map((item) => (
            <FlowTimeline key={item.title} title={item.title} color={item.color} steps={item.steps} />
          ))}
        </div>
      )}
    </main>
  );
}
