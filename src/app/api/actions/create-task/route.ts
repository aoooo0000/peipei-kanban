import { NextResponse } from "next/server";
import { getDatabaseId, getNotionClient, taskToNotionProperties } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const notion = await getNotionClient();
    const page = await notion.pages.create({
      parent: { database_id: getDatabaseId() },
      properties: taskToNotionProperties({
        title: text.slice(0, 100), // Limit title length
        status: "Ideas",
        assignee: "Andy",
        priority: "🟡 中",
        note: text.length > 100 ? text : "",
      }) as never,
    });

    return NextResponse.json({ success: true, taskId: page.id });
  } catch (error) {
    console.error("POST /api/actions/create-task error", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
