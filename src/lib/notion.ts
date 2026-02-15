import { Client } from "@notionhq/client";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

const databaseId = process.env.NOTION_DATABASE_ID || "30155d1f-de22-8190-950d-c20cbff9e520";

export type TaskStatus = "Ideas" | "To-do" | "進行中" | "Review" | "完成";
export type Assignee = "Andy" | "霈霈豬" | "實習生阿霈" | "Trading Lab" | "Coder";
export type Priority = "🔴 高" | "🟡 中" | "🟢 低";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: Assignee;
  priority: Priority;
  dueDate?: string;
  note?: string;
};

type NotionProp = {
  title?: Array<{ plain_text?: string }>;
  select?: { name?: string };
  date?: { start?: string } | null;
  rich_text?: Array<{ plain_text?: string }>;
};

let notionClient: Client | null = null;

async function resolveNotionApiKey() {
  if (process.env.NOTION_API_KEY) return process.env.NOTION_API_KEY;
  const keyPath = path.join(homedir(), ".config/notion/api_key");
  try {
    const key = (await fs.readFile(keyPath, "utf8")).trim();
    if (key) return key;
  } catch {}
  throw new Error("NOTION_API_KEY is not set and ~/.config/notion/api_key is unavailable");
}

export async function getNotionClient() {
  if (notionClient) return notionClient;
  notionClient = new Client({ auth: await resolveNotionApiKey() });
  return notionClient;
}

export function getDatabaseId() {
  return databaseId;
}

function getProp(properties: Record<string, unknown> | undefined, key: string): NotionProp {
  return (properties?.[key] as NotionProp) || {};
}

export function notionPageToTask(page: { id: string; properties?: Record<string, unknown> }): Task {
  const statusRaw = getProp(page.properties, "狀態").select?.name || "Backlog";
  const statusMap: Record<string, TaskStatus> = {
    Backlog: "Ideas",
    Ideas: "Ideas",
    "To-do": "To-do",
    "進行中": "進行中",
    Review: "Review",
    "完成": "完成",
  };

  return {
    id: page.id,
    title: getProp(page.properties, "任務").title?.[0]?.plain_text || "未命名任務",
    status: statusMap[statusRaw] ?? "Ideas",
    assignee: (getProp(page.properties, "指派").select?.name as Assignee) || "Andy",
    priority: (getProp(page.properties, "優先度").select?.name as Priority) || "🟡 中",
    dueDate: getProp(page.properties, "截止日").date?.start || undefined,
    note: getProp(page.properties, "備註").rich_text?.map((v) => v.plain_text ?? "").join("") || "",
  };
}

export function taskToNotionProperties(input: Partial<Task>) {
  const statusMap: Record<TaskStatus, string> = {
    Ideas: "Backlog",
    "To-do": "To-do",
    "進行中": "進行中",
    Review: "Review",
    "完成": "完成",
  };

  const properties: Record<string, unknown> = {};

  if (input.title !== undefined) properties["任務"] = { title: [{ text: { content: input.title || "未命名任務" } }] };
  if (input.status !== undefined) properties["狀態"] = { select: { name: statusMap[input.status] } };
  if (input.assignee !== undefined) properties["指派"] = { select: { name: input.assignee } };
  if (input.priority !== undefined) properties["優先度"] = { select: { name: input.priority } };
  if (input.dueDate !== undefined) properties["截止日"] = input.dueDate ? { date: { start: input.dueDate } } : { date: null };
  if (input.note !== undefined) properties["備註"] = { rich_text: input.note ? [{ text: { content: input.note } }] : [] };

  return properties;
}
