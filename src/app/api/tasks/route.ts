import { NextResponse } from "next/server";
import { getDatabaseId, getNotionClient, notionPageToTask, taskToNotionProperties, Task } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notion = await getNotionClient();
    const response = await notion.databases.query({
      database_id: getDatabaseId(),
      page_size: 100,
    });

    const tasks = response.results.map(notionPageToTask);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Task>;
    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const notion = await getNotionClient();
    const page = await notion.pages.create({
      parent: { database_id: getDatabaseId() },
      properties: taskToNotionProperties({
        title: body.title,
        status: body.status ?? "Ideas",
        assignee: body.assignee ?? "Andy",
        priority: body.priority ?? "🟡 中",
        dueDate: body.dueDate,
        note: body.note ?? "",
      }) as never,
    });

    return NextResponse.json({ task: notionPageToTask(page) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
