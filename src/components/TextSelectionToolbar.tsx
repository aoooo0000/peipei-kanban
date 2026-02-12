"use client";

import { useState, useEffect } from "react";

interface Position {
  top: number;
  left: number;
}

export default function TextSelectionToolbar() {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setPosition({
          top: rect.top + window.scrollY - 60,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      } else {
        setSelectedText("");
        setPosition(null);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, []);

  const handleAction = async (action: "research" | "task" | "watchlist" | "note") => {
    if (!selectedText) return;

    setLoading(action);
    try {
      let endpoint = "";
      let body: Record<string, string> = {};

      switch (action) {
        case "research":
          endpoint = "/api/actions/research";
          body = { text: selectedText };
          break;
        case "task":
          endpoint = "/api/actions/create-task";
          body = { text: selectedText };
          break;
        case "watchlist":
          // Extract potential stock symbol
          const symbolMatch = selectedText.match(/\b[A-Z]{1,5}\b/);
          if (!symbolMatch) {
            alert("無法辨識股票代碼");
            setLoading(null);
            return;
          }
          endpoint = "/api/actions/watchlist";
          body = { symbol: symbolMatch[0] };
          break;
        case "note":
          endpoint = "/api/actions/note";
          body = { text: selectedText };
          break;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelectedText("");
        setPosition(null);
        
        // Show success toast (simple alert for now)
        const actionNames = {
          research: "深度研究",
          task: "任務",
          watchlist: "Watchlist",
          note: "筆記",
        };
        alert(`✅ 已加入${actionNames[action]}`);
      } else {
        alert("❌ 操作失敗");
      }
    } catch (error) {
      console.error("Action error:", error);
      alert("❌ 操作失敗");
    } finally {
      setLoading(null);
    }
  };

  if (!position || !selectedText) return null;

  return (
    <div
      className="fixed z-50 flex gap-2 p-2 rounded-lg bg-[#232336] border border-blue-400/50 shadow-2xl"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      <button
        onClick={() => handleAction("research")}
        disabled={loading !== null}
        className="flex items-center gap-1 px-3 py-1.5 rounded bg-purple-600/80 hover:bg-purple-500 text-xs font-medium disabled:opacity-50"
        title="深度研究"
      >
        🔬 研究
      </button>
      <button
        onClick={() => handleAction("task")}
        disabled={loading !== null}
        className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600/80 hover:bg-blue-500 text-xs font-medium disabled:opacity-50"
        title="建任務"
      >
        📋 任務
      </button>
      <button
        onClick={() => handleAction("watchlist")}
        disabled={loading !== null}
        className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600/80 hover:bg-green-500 text-xs font-medium disabled:opacity-50"
        title="加入 Watchlist"
      >
        📊 Watch
      </button>
      <button
        onClick={() => handleAction("note")}
        disabled={loading !== null}
        className="flex items-center gap-1 px-3 py-1.5 rounded bg-yellow-600/80 hover:bg-yellow-500 text-xs font-medium disabled:opacity-50"
        title="存為筆記"
      >
        📝 筆記
      </button>
    </div>
  );
}
