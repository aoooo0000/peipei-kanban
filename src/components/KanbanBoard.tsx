"use client";

import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
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

function MoveMenu({ task, onMove }: { task: Task; onMove: (id: string, status: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const otherStatuses = STATUSES.filter((s) => s !== task.status);

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
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
          onClick={() => { onMove(task.id, s); setOpen(false); }}
          className="rounded bg-indigo-700/60 px-2 py-0.5 hover:bg-indigo-600 text-[11px] whitespace-nowrap"
        >
          {STATUS_META[s].emoji} {STATUS_META[s].label}
        </button>
      ))}
      <button onClick={() => setOpen(false)} className="rounded bg-zinc-700 px-2 py-0.5 text-[11px]">✕</button>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onMove, isDragOverlay }: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
  isDragOverlay?: boolean;
}) {
  const sortable = useSortable({ id: task.id, data: { task } });
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
      className={`rounded-xl bg-[#2a2a3e] p-3 shadow-md border border-white/10 ${isDragOverlay ? "scale-[1.05] shadow-2xl ring-2 ring-blue-400/50" : ""}`}
    >
      {/* Drag handle - only this area is draggable */}
      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none select-none">
        <div className="flex items-start justify-between">
          <h4 className="font-semibold text-white flex-1">{task.title}</h4>
          <span className="text-zinc-500 text-xs ml-2 mt-1">⠿</span>
        </div>
        <p className="mt-1 text-xs text-zinc-300">{task.assignee}</p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={priorityClass}>{task.priority}</span>
          <span className="text-zinc-400">{task.dueDate ?? "無截止日"}</span>
        </div>
      </div>
      {task.note && <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{task.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <MoveMenu task={task} onMove={onMove} />
        <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="rounded bg-zinc-700 px-2 py-1 hover:bg-zinc-600">編輯</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="rounded bg-red-800/80 px-2 py-1 hover:bg-red-700">刪除</button>
      </div>
    </div>
  );
}

function Column({ status, children }: { status: TaskStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`min-w-[280px] md:min-w-[320px] rounded-2xl p-3 border snap-start shrink-0 ${isOver ? "bg-[#2a2a46] border-blue-400/50" : "bg-[#222236] border-white/10"}`}>
      {children}
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

  const grouped = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, tasks.filter((task) => task.status === status)])) as Record<TaskStatus, Task[]>, [tasks]);

  const moveTask = async (id: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    mutate();
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
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

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">🐷 霈霈豬任務看板</h1>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {STATUSES.map((status) => (
            <Column key={status} status={status}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{STATUS_META[status].emoji} {STATUS_META[status].label}</h2>
                <span className="text-xs bg-zinc-700 rounded-full px-2 py-0.5">{grouped[status]?.length ?? 0}</span>
              </div>
              <SortableContext items={(grouped[status] ?? []).map((t) => t.id)} strategy={rectSortingStrategy}>
                <div className="space-y-3 min-h-12">
                  {(grouped[status] ?? []).map((task) => <TaskCard key={task.id} task={task} onEdit={setEditingTask} onDelete={deleteTask} onMove={moveTask} />)}
                </div>
              </SortableContext>
              <button onClick={() => setAddingStatus(status)} className="mt-3 w-full rounded-lg border border-dashed border-blue-400/50 py-2 text-sm text-blue-300 hover:bg-blue-500/10">+ 新增任務</button>
            </Column>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onMove={() => {}} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {addingStatus && <TaskForm onClose={() => setAddingStatus(null)} onSubmit={(input) => createTask(addingStatus, input)} initial={{ status: addingStatus }} />}
      {editingTask && <TaskForm initial={editingTask} onClose={() => setEditingTask(null)} onSubmit={(input) => updateTask(editingTask.id, input)} />}
    </>
  );
}
