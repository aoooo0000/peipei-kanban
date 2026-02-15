"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchApiJSON } from "@/lib/apiClient";

interface DocFile {
  name: string;
  path: string;
  content: string;
  updatedAt: string;
  size: number;
}

interface DocsResponse {
  files: DocFile[];
  syncedAt: string | null;
}

const CATEGORY_ORDER = ["系統設定", "記憶", "學習", "投資", "其他"] as const;

function getCategory(file: DocFile): (typeof CATEGORY_ORDER)[number] {
  const n = file.name.toUpperCase();
  const p = file.path.toLowerCase();

  if (["AGENTS.MD", "SOUL.MD", "HEARTBEAT.MD"].includes(n)) return "系統設定";
  if (["MEMORY.MD", "LESSONS.MD", "COMMITMENTS.MD", "OVERNIGHT_REPORT.MD", "TODO_QUEUE.MD"].includes(n)) return "記憶";
  if (p.includes("learning/") || p.includes("learning\\")) return "學習";
  if (n === "STOCK_TRACKER.MD" || p.includes("investing/")) return "投資";
  return "其他";
}

export default function DocsPage() {
  const { data: docsWrap, error, mutate } = useSWR<{ data: DocsResponse; source: "local" | "fallback" }>(
    "docs-hybrid",
    () => fetchApiJSON<DocsResponse>("/api/docs", "/api/docs"),
    { refreshInterval: 30000 },
  );
  const data = docsWrap?.data;
  const connectionSource = docsWrap?.source;
  const files = useMemo(() => data?.files ?? [], [data?.files]);

  const [selectedName, setSelectedName] = useState<string>("MEMORY.md");

  const selected = useMemo(() => {
    if (!files.length) return null;
    return files.find((f) => f.name === selectedName || f.path === selectedName) ?? files[0];
  }, [files, selectedName]);

  const grouped = useMemo(() => {
    const map: Record<string, DocFile[]> = {};
    for (const cat of CATEGORY_ORDER) map[cat] = [];
    for (const file of files) {
      map[getCategory(file)].push(file);
    }
    return map;
  }, [files]);

  return (
    <main className="min-h-screen text-zinc-100 p-4 md:p-6 pb-24 animate-fadeInUp">
      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 p-4">
          <p className="text-sm text-red-100">文件資料載入失敗。</p>
          <button onClick={() => mutate()} className="mt-2 rounded bg-red-500/35 px-3 py-1 text-xs">重試</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-bold">📚 Docs 文件瀏覽器</h1>
        <div className="flex items-center gap-2">
          {connectionSource && (
            <span className="text-xs rounded-full border border-white/15 px-2 py-1 bg-black/20">
              {connectionSource === "local" ? "🟢 Real-time" : "🟡 Cached"}
            </span>
          )}
          {data?.syncedAt && <span className="text-xs text-zinc-400">同步：{new Date(data.syncedAt).toLocaleString("zh-TW", { hour12: false })}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <aside className="rounded-2xl border border-white/10 glass-card p-3 max-h-[75vh] overflow-y-auto">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={cat} className="mb-4 last:mb-0">
                <h2 className="text-xs font-semibold text-zinc-400 mb-2">{cat}</h2>
                <div className="space-y-1">
                  {items.map((f) => {
                    const active = selected?.path === f.path;
                    return (
                      <button
                        key={f.path}
                        onClick={() => setSelectedName(f.path)}
                        className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                          active
                            ? "bg-blue-600/25 border-blue-400/40 text-blue-200"
                            : "bg-black/20 border-white/10 text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="truncate">{f.name}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{f.path}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </aside>

        <section className="rounded-2xl border border-white/10 glass-card p-5 max-h-[75vh] overflow-y-auto">
          {!selected ? (
            <div className="text-zinc-400">尚無文件資料</div>
          ) : (
            <>
              <div className="mb-4 pb-3 border-b border-white/10">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-xs text-zinc-500 mt-1">{selected.path} · {selected.size} bytes · {new Date(selected.updatedAt).toLocaleString("zh-TW", { hour12: false })}</p>
              </div>
              <article className="prose prose-invert prose-sm max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>{selected.content || ""}</Markdown>
              </article>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
