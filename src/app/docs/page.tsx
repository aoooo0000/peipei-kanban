"use client";

import useSWR from "swr";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Doc {
  name: string;
  path: string;
  category: "System" | "Docs";
  size: number;
  modified: string;
}

export default function DocsPage() {
  const { data } = useSWR<{ docs: Doc[] }>("/api/docs", fetcher);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "System" | "Docs">("all");

  const docs = data?.docs ?? [];
  const filteredDocs = filter === "all" ? docs : docs.filter((d) => d.category === filter);

  const loadDoc = async (doc: Doc) => {
    setSelectedDoc(doc);
    const res = await fetch(`/api/docs/${encodeURIComponent(doc.path)}`);
    const text = await res.text();
    setDocContent(text);
  };

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📄 文件</h1>

      {!selectedDoc ? (
        <>
          {/* 分類篩選 */}
          <div className="flex gap-2 mb-4">
            {(["all", "System", "Docs"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {f === "all" ? "全部" : f}
              </button>
            ))}
          </div>

          {/* 文件列表 */}
          <div className="space-y-2">
            {filteredDocs.length === 0 ? (
              <div className="text-center text-zinc-500 py-12">
                {data ? "沒有找到文件" : "載入中..."}
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <button
                  key={doc.path}
                  onClick={() => loadDoc(doc)}
                  className="w-full text-left rounded-xl bg-[#2a2a3e] p-4 border border-white/10 hover:bg-[#333346] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{doc.name}</h3>
                      <p className="text-xs text-zinc-400">{doc.path}</p>
                    </div>
                    <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                      {doc.category}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {new Date(doc.modified).toLocaleString("zh-TW")}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* 返回按鈕 */}
          <button
            onClick={() => setSelectedDoc(null)}
            className="mb-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            ← 返回列表
          </button>

          {/* 文件內容 */}
          <div className="rounded-2xl bg-[#2a2a3e] p-6 border border-white/10">
            <h2 className="text-xl font-bold mb-4">{selectedDoc.name}</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>{docContent}</Markdown>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
