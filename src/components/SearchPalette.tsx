"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJSON } from "@/lib/api";

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
}

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  type: "task" | "page" | "action";
  run: () => void;
};

const PAGES = [
  { path: "/", label: "首頁" },
  { path: "/dashboard", label: "看板" },
  { path: "/schedule", label: "分析" },
  { path: "/logs", label: "日誌" },
  { path: "/flow", label: "流程" },
  { path: "/settings", label: "設定" },
];

export default function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON<{ tasks: TaskItem[] }>("/api/tasks", 8000);
      setTasks(data.tasks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "無法讀取任務");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadTasks();
  }, [open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const pageItems: PaletteItem[] = PAGES
      .filter((p) => (q ? p.label.toLowerCase().includes(q) : true))
      .map((p) => ({
        id: `page-${p.path}`,
        label: p.label,
        hint: p.path,
        icon: "📄",
        type: "page",
        run: () => {
          router.push(p.path);
          onClose();
        },
      }));

    const taskItems: PaletteItem[] = tasks
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .slice(0, 8)
      .map((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        hint: `狀態：${t.status}`,
        icon: "🔍",
        type: "task",
        run: () => {
          router.push("/");
          onClose();
        },
      }));

    const actionItems: PaletteItem[] = [
      {
        id: "action-new",
        label: "新增任務",
        hint: "前往首頁看板",
        icon: "⚡",
        type: "action" as const,
        run: () => {
          router.push("/");
          onClose();
        },
      },
      {
        id: "action-refresh",
        label: "刷新數據",
        hint: "重新載入目前頁面",
        icon: "⚡",
        type: "action" as const,
        run: () => {
          router.refresh();
          onClose();
        },
      },
    ].filter((a) => (q ? a.label.toLowerCase().includes(q) : true));

    return [...taskItems, ...pageItems, ...actionItems];
  }, [tasks, query, router, onClose]);

  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((v) => Math.min(v + 1, Math.max(items.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((v) => Math.max(v - 1, 0));
      }
      if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm p-4 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-2xl glass-card-strong rounded-2xl border border-white/20 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
          <span className="text-white/70 text-lg">🔎</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋任務、頁面、快捷動作..."
            className="w-full bg-transparent outline-none text-base"
          />
          <span className="text-xs text-white/55">ESC</span>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/15 p-3">
            <p className="text-sm text-red-100 mb-2">⚠️ {error}</p>
            <button onClick={loadTasks} className="text-xs rounded bg-red-500/35 px-2 py-1 hover:bg-red-500/50">重試</button>
          </div>
        )}

        <div className="mt-3 max-h-[52vh] overflow-y-auto space-y-2">
          {loading && <div className="h-16 rounded-xl skeleton-glass" />}
          {!loading && items.length === 0 && <div className="text-sm text-white/65 p-3">找不到結果</div>}
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={item.run}
              className={`w-full text-left rounded-xl border p-3 transition-all ${idx === activeIndex ? "border-[#667eea]/70 bg-[#667eea]/20" : "border-white/10 bg-white/5 hover:border-white/25"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{item.icon} {item.label}</p>
                <span className="text-[11px] text-white/60 uppercase">{item.type}</span>
              </div>
              {item.hint && <p className="text-xs text-white/65 mt-1 truncate">{item.hint}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
