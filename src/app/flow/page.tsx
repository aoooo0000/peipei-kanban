"use client";

import { useEffect, useState } from "react";
import mermaid from "mermaid";

type Tab = "architecture" | "workflow";

const architectureChart = `graph TD
    Andy["👤 Andy (Telegram)"] <-->|直接對話| PP["🐷 霈霈豬 (主管)"]
    PP -->|spawn 任務| Coder["💻 Coder"]
    PP -->|sessions_send| TL["📈 Trading Lab"]
    PP -->|腳本呼叫| DR["🔬 Deep Research (o4-mini)"]
    Coder -->|回報結果| PP
    TL -->|求助升級| PP
    TL -->|paper trading| Alpaca["📊 Alpaca"]
    PP -->|讀寫| Notion["📝 Notion"]
    PP -->|整理文章| Gmail["📧 Gmail"]
    PP -->|瀏覽器| Browser["🌐 Browser"]`;

const workflowCharts = [
  {
    title: "MimiVsJames 整理",
    chart: `graph LR
    subgraph MimiVsJames整理
        M1["📧 Gmail 收信"] --> M2["📋 分類判斷"]
        M2 --> M3["📝 完整抓取"]
        M3 --> M4["📐 結構規劃"]
        M4 --> M5["📤 寫入 Notion"]
        M5 --> M6["🔗 關聯舊文"]
        M6 --> M7["✅ QA 檢查"]
    end`,
  },
  {
    title: "Trading Lab 每日循環",
    chart: `graph LR
    subgraph Trading Lab 每日循環
        T1["21:00 盤前準備"] --> T2["22:45 開盤交易"]
        T2 --> T3["23:30-04:00 盤中監控"]
        T3 --> T4["04:30 收盤決策"]
        T4 --> T5["06:00 盤後反思"]
        T5 --> T6["週六 週末總結"]
    end`,
  },
  {
    title: "霈霈豬每日循環",
    chart: `graph LR
    subgraph 霈霈豬每日循環
        P1["05:30 Mimi 整理"] --> P2["06:00 NotebookLM"]
        P2 --> P3["07:00 收盤總結"]
        P3 --> P4["10/14/18/22 新聞監控"]
        P4 --> P5["21:00 盤前報告"]
        P5 --> P6["Heartbeat 任務看板"]
    end`,
  },
];

export default function FlowPage() {
  const [tab, setTab] = useState<Tab>("architecture");

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
    });
    mermaid.run({ querySelector: ".mermaid" });
  }, [tab]);

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
        <div className="rounded-xl border border-white/10 bg-[#202033] p-4 overflow-x-auto">
          <div className="min-w-[760px]">
            <pre className="mermaid">{architectureChart}</pre>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {workflowCharts.map((item, idx) => (
            <section key={item.title} className="rounded-xl border border-white/10 bg-[#202033] p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">{item.title}</h2>
              <div className="min-w-[760px]">
                <pre className="mermaid" id={`workflow-${idx}`}>{item.chart}</pre>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
