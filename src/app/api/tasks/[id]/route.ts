import { NextResponse } from "next/server";
import { getNotionClient, notionPageToTask, taskToNotionProperties, Task } from "@/lib/notion";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<Task>;

    const notion = await getNotionClient();
    const page = await notion.pages.update({
      page_id: id,
      properties: taskToNotionProperties(body) as never,
    });

    return NextResponse.json({ task: notionPageToTask(page) });
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notion = await getNotionClient();
    await notion.pages.update({ page_id: id, archived: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
