"use client";

import useSWR from "swr";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextSelectionToolbar from "@/components/TextSelectionToolbar";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Doc {
  name: string;
  path: string;
  category: "System" | "Docs";
  size: number;
  modified: string;
}

interface SearchMatch {
  line: number;
  text: string;
  context: string;
}

interface SearchResult {
  path: string;
  name: string;
  matches: SearchMatch[];
}

export default function DocsPage() {
  const { data } = useSWR<{ docs: Doc[] }>("/api/docs", fetcher);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "System" | "Docs">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const docs = data?.docs ?? [];
  const filteredDocs = filter === "all" ? docs : docs.filter((d) => d.category === filter);

  const loadDoc = async (doc: Doc) => {
    setSelectedDoc(doc);
    const res = await fetch(`/api/docs/${encodeURIComponent(doc.path)}`);
    const text = await res.text();
    setDocContent(text);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/docs/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const loadDocByPath = async (docPath: string) => {
    const res = await fetch(`/api/docs/${encodeURIComponent(docPath)}`);
    const text = await res.text();
    setDocContent(text);
    setSelectedDoc({ name: docPath.split("/").pop() || docPath, path: docPath, category: "Docs", size: 0, modified: "" });
    setSearchQuery("");
    setSearchResults([]);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="bg-yellow-400/30 text-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <main className="min-h-screen text-zinc-100 p-4 md:p-6 pb-24 animate-fadeInUp">
      <TextSelectionToolbar />
      <h1 className="text-xl font-bold mb-6">📄 文件</h1>

      {!selectedDoc ? (
        <>
          {/* 搜尋框 */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜尋所有 .md 文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {searching ? "..." : "搜尋"}
            </button>
          </div>

          {/* 搜尋結果 */}
          {searchResults.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">
                搜尋結果 ({searchResults.length})
              </h2>
              <div className="space-y-2">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadDocByPath(result.path)}
                    className="w-full text-left rounded-xl bg-[#2a2a3e] p-4 border border-blue-400/30 hover:bg-[#333346] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white">{result.name}</h3>
                      <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                        {result.matches.length} 筆
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{result.path}</p>
                    {result.matches.slice(0, 2).map((match, mIdx) => (
                      <div key={mIdx} className="text-xs text-zinc-300 bg-zinc-800/50 rounded p-2 mb-1 font-mono">
                        <span className="text-zinc-500">L{match.line}:</span>{" "}
                        {highlightMatch(match.text.trim(), searchQuery)}
                      </div>
                    ))}
                  </button>
                ))}
              </div>
            </div>
          )}

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
