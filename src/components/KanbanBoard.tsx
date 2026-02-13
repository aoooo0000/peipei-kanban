"use client";

import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Assignee, Priority, Task, TaskStatus } from "@/lib/notion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const STATUSES: TaskStatus[] = ["Ideas", "To-do", "進行中", "Review", "完成"];
const STATUS_META: Record<TaskStatus, { emoji: string; label: string }> = {
  Ideas: { emoji: "💡", label: "Ideas" },
  "To-do": { emoji: "📝", label: "To-do" },
  "進行中": { emoji: "🚧", label: "進行中" },
  Review: { emoji: "🔍", label: "Review" },
  "完成": { emoji: "✅", label: "完成" },
};

type ScreenMode = "small" | "medium" | "large";

function getScreenMode(width: number): ScreenMode {
  if (width < 640) return "small";
  if (width < 1024) return "medium";
  return "large";
}

function getDefaultAccordionOpen(grouped: Record<TaskStatus, Task[]>): Record<TaskStatus, boolean> {
  const withTasks = STATUSES.filter((status) => (grouped[status]?.length ?? 0) > 0).slice(0, 2);
  return Object.fromEntries(STATUSES.map((status) => [status, withTasks.includes(status)])) as Record<TaskStatus, boolean>;
}

function MoveMenu({ task, onMove }: { task: Task; onMove: (id: string, status: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const otherStatuses = STATUSES.filter((s) => s !== task.status);

  if (!open) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded bg-indigo-700/80 px-2 py-1 hover:bg-indigo-600 text-xs"
      >
        移動 ▸
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {otherStatuses.map((s) => (
        <button
          key={s}
          onClick={() => {
            onMove(task.id, s);
            setOpen(false);
          }}
          className="rounded bg-indigo-700/60 px-2 py-0.5 hover:bg-indigo-600 text-[11px] whitespace-nowrap"
        >
          {STATUS_META[s].emoji} {STATUS_META[s].label}
        </button>
      ))}
      <button onClick={() => setOpen(false)} className="rounded bg-zinc-700 px-2 py-0.5 text-[11px]">
        ✕
      </button>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onMove, onViewDetail, isDragOverlay, compact }: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onViewDetail: (task: Task) => void;
  isDragOverlay?: boolean;
  compact?: boolean;
}) {
  const sortable = useSortable({ id: task.id, data: { task }, disabled: compact || isDragOverlay });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = isDragOverlay
    ? { attributes: {}, listeners: {}, setNodeRef: undefined, transform: null, transition: undefined, isDragging: false }
    : sortable;

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const priorityClass = task.priority.includes("🔴") ? "text-red-300" : task.priority.includes("🟡") ? "text-yellow-300" : "text-green-300";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`rounded-xl bg-[#2a2a3e] ${compact ? "p-2.5" : "p-3"} shadow-md border border-white/10 ${isDragOverlay ? "scale-[1.05] shadow-2xl ring-2 ring-blue-400/50" : ""}`}
    >
      <div {...listeners} className={`${compact ? "" : "cursor-grab active:cursor-grabbing"} touch-none select-none`}>
        <div className="flex items-start justify-between gap-2">
          <h4 className={`${compact ? "text-sm" : ""} font-semibold text-white flex-1 leading-snug`}>{task.title}</h4>
          {!compact && <span className="text-zinc-500 text-xs mt-1">⠿</span>}
        </div>
        <p className={`mt-1 ${compact ? "text-[11px]" : "text-xs"} text-zinc-300`}>{task.assignee}</p>
        <div className={`mt-2 flex items-center justify-between ${compact ? "text-[11px]" : "text-xs"}`}>
          <span className={priorityClass}>{task.priority}</span>
          <span className="text-zinc-400">{task.dueDate ?? "無截止日"}</span>
        </div>
      </div>
      {task.note && <p className={`mt-2 ${compact ? "text-[11px]" : "text-xs"} text-zinc-400 line-clamp-2`}>{task.note}</p>}
      <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
        <button onClick={(e) => { e.stopPropagation(); onViewDetail(task); }} className="rounded bg-blue-700/80 px-2 py-1 hover:bg-blue-600">詳情</button>
        <MoveMenu task={task} onMove={onMove} />
        <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="rounded bg-zinc-700 px-2 py-1 hover:bg-zinc-600">編輯</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="rounded bg-red-800/80 px-2 py-1 hover:bg-red-700">刪除</button>
      </div>
    </div>
  );
}

function Column({ status, children, screenMode }: { status: TaskStatus; children: React.ReactNode; screenMode: ScreenMode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-3 border ${screenMode === "large" ? "min-w-[280px] xl:min-w-[320px]" : "min-w-0"} ${isOver ? "bg-[#2a2a46] border-blue-400/50" : "bg-[#222236] border-white/10"}`}
    >
      {children}
    </div>
  );
}

function TaskDetailDrawer({ task, onClose, onUpdate }: { task: Task; onClose: () => void; onUpdate: () => void }) {
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const newNote = task.note ? `${task.note}\n\n---\n${replyText}` : replyText;
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });
      setReplyText("");
      onUpdate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full md:max-w-2xl max-h-[85vh] md:max-h-[90vh] rounded-t-3xl md:rounded-2xl bg-[#232336] border-t md:border border-white/10 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">{task.title}</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded">{STATUS_META[task.status].emoji} {STATUS_META[task.status].label}</span>
              <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded">👤 {task.assignee}</span>
              <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded">{task.priority}</span>
              {task.dueDate && <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded">📅 {task.dueDate}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl ml-4">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3">💬 備註對話</h3>
          {task.note ? (
            <div className="space-y-3">
              {task.note.split("\n---\n").map((msg, idx) => (
                <div key={idx} className="rounded-lg bg-[#2a2a3e] p-3 border border-white/10">
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap">{msg}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic">尚無備註</p>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#1a1a2e]">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入回覆..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
              disabled={submitting}
            />
            <button
              onClick={handleReply}
              disabled={submitting || !replyText.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "..." : "送出"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskForm({ initial, onSubmit, onClose }: { initial?: Partial<Task>; onSubmit: (input: Partial<Task>) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [assignee, setAssignee] = useState<Assignee>((initial?.assignee as Assignee) || "Andy");
  const [priority, setPriority] = useState<Priority>((initial?.priority as Priority) || "🟡 中");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [note, setNote] = useState(initial?.note || "");
  const [status, setStatus] = useState<TaskStatus>((initial?.status as TaskStatus) || "Ideas");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#232336] p-4 border border-white/10" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">{initial?.id ? "編輯任務" : "新增任務"}</h3>
        <div className="space-y-3">
          <input className="w-full rounded bg-zinc-800 p-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="任務名" autoFocus />
          {initial?.id && (
            <select className="w-full rounded bg-zinc-800 p-2" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].emoji} {STATUS_META[s].label}</option>)}
            </select>
          )}
          <select className="w-full rounded bg-zinc-800 p-2" value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee)}><option>Andy</option><option>霈霈豬</option></select>
          <select className="w-full rounded bg-zinc-800 p-2" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option>🔴 高</option><option>🟡 中</option><option>🟢 低</option></select>
          <input type="date" className="w-full rounded bg-zinc-800 p-2" value={dueDate?.slice(0, 10)} onChange={(e) => setDueDate(e.target.value)} />
          <textarea className="w-full rounded bg-zinc-800 p-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註" rows={3} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded bg-zinc-700 px-3 py-1" onClick={onClose}>取消</button>
          <button className="rounded bg-blue-600 px-3 py-1" onClick={() => onSubmit({ title, assignee, priority, dueDate: dueDate || undefined, note, ...(initial?.id ? { status } : {}) })}>儲存</button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { data, mutate } = useSWR<{ tasks: Task[] }>("/api/tasks", fetcher, { refreshInterval: 15000 });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingStatus, setAddingStatus] = useState<TaskStatus | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>(() => {
    if (typeof window === "undefined") return "large";
    return getScreenMode(window.innerWidth);
  });
  const [accordionOpen, setAccordionOpen] = useState<Record<TaskStatus, boolean>>({
    Ideas: false,
    "To-do": false,
    "進行中": false,
    Review: false,
    "完成": false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const grouped = useMemo(
    () => Object.fromEntries(STATUSES.map((status) => [status, tasks.filter((task) => task.status === status)])) as Record<TaskStatus, Task[]>,
    [tasks],
  );
  const groupedRef = useRef(grouped);

  useEffect(() => {
    groupedRef.current = grouped;
  }, [grouped]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;
    let prevMode = getScreenMode(window.innerWidth);

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const nextMode = getScreenMode(window.innerWidth);

        if (nextMode === "small" && prevMode !== "small") {
          setAccordionOpen(getDefaultAccordionOpen(groupedRef.current));
        }

        prevMode = nextMode;
        setScreenMode(nextMode);
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const moveTask = async (id: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    mutate();
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    if (screenMode === "small") return;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    if (screenMode === "small") return;

    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    let targetStatus: TaskStatus | undefined;
    if (STATUSES.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      targetStatus = overTask?.status;
    }

    if (!targetStatus || targetStatus === task.status) return;
    await moveTask(task.id, targetStatus);
  };

  const createTask = async (status: TaskStatus, input: Partial<Task>) => {
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, status }) });
    setAddingStatus(null);
    mutate();
  };

  const updateTask = async (id: string, input: Partial<Task>) => {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    setEditingTask(null);
    mutate();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("確定要刪除這個任務？")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    mutate();
  };

  const boardLayoutClass = screenMode === "small"
    ? "space-y-3 transition-all duration-200"
    : screenMode === "medium"
      ? "grid grid-cols-2 gap-4 transition-all duration-200"
      : "grid grid-cols-5 gap-4 overflow-x-auto pb-2 transition-all duration-200";

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">🐷 霈霈豬任務看板</h1>
      <DndContext sensors={screenMode === "small" ? undefined : sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={boardLayoutClass}>
          {STATUSES.map((status) => {
            const count = grouped[status]?.length ?? 0;
            const isOpen = screenMode !== "small" || accordionOpen[status];

            return (
              <Column key={status} status={status} screenMode={screenMode}>
                <button
                  type="button"
                  onClick={() => {
                    if (screenMode !== "small") return;
                    setAccordionOpen((prev) => ({ ...prev, [status]: !prev[status] }));
                  }}
                  className={`mb-1 w-full flex items-center justify-between ${screenMode === "small" ? "cursor-pointer" : "cursor-default"}`}
                >
                  <h2 className="font-semibold text-left">{STATUS_META[status].emoji} {STATUS_META[status].label}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-zinc-700 rounded-full px-2 py-0.5">{count}</span>
                    {screenMode === "small" && <span className="text-zinc-400 text-xs">{isOpen ? "▾" : "▸"}</span>}
                  </div>
                </button>

                {isOpen && (
                  <>
                    <SortableContext items={(grouped[status] ?? []).map((t) => t.id)} strategy={rectSortingStrategy}>
                      <div className="space-y-2.5 min-h-12 mt-2">
                        {(grouped[status] ?? []).map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={setEditingTask}
                            onDelete={deleteTask}
                            onMove={moveTask}
                            onViewDetail={setDetailTask}
                            compact={screenMode === "small"}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <button onClick={() => setAddingStatus(status)} className="mt-3 w-full rounded-lg border border-dashed border-blue-400/50 py-2 text-sm text-blue-300 hover:bg-blue-500/10">+ 新增任務</button>
                  </>
                )}
              </Column>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onMove={() => {}} onViewDetail={() => {}} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {addingStatus && <TaskForm onClose={() => setAddingStatus(null)} onSubmit={(input) => createTask(addingStatus, input)} initial={{ status: addingStatus }} />}
      {editingTask && <TaskForm initial={editingTask} onClose={() => setEditingTask(null)} onSubmit={(input) => updateTask(editingTask.id, input)} />}
      {detailTask && <TaskDetailDrawer task={detailTask} onClose={() => setDetailTask(null)} onUpdate={() => { mutate(); setDetailTask(tasks.find(t => t.id === detailTask.id) || null); }} />}
    </>
  );
}
