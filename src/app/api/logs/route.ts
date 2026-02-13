import { NextResponse } from "next/server";

type LogType = "agent" | "task" | "system";

interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  title: string;
  description: string;
}

function getDemoLogs(): LogEntry[] {
  const now = Date.now();
  return [
    {
      id: "log-1",
      timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
      type: "agent",
      title: "Peipei 完成晨間檢查",
      description: "同步 Notion 任務資料庫，狀態看板已更新。",
    },
    {
      id: "log-2",
      timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
      type: "task",
      title: "新增任務：整理投資月報",
      description: "已指派給 Andy，優先級為 🟡 中，預計今晚完成。",
    },
    {
      id: "log-3",
      timestamp: new Date(now - 16 * 60 * 1000).toISOString(),
      type: "system",
      title: "系統排程成功執行",
      description: "每日資料同步 job 執行完畢，耗時 3.2 秒。",
    },
    {
      id: "log-4",
      timestamp: new Date(now - 25 * 60 * 1000).toISOString(),
      type: "agent",
      title: "Coder 部署前端調整",
      description: "Phase 2 UI 調整上線至預覽環境，等待驗收。",
    },
    {
      id: "log-5",
      timestamp: new Date(now - 40 * 60 * 1000).toISOString(),
      type: "task",
      title: "任務狀態變更：看板拖拽功能",
      description: "由 To-do 移動到 進行中，已送出 API 更新。",
    },
  ];
}

export async function GET() {
  try {
    return NextResponse.json({ logs: getDemoLogs() });
  } catch (error) {
    console.error("GET /api/logs error", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
