import { NextResponse } from "next/server";
import { getNotionClient, getDatabaseId } from "@/lib/notion";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, string> = {
  Backlog: "Ideas",
};

export async function GET() {
  try {
    const notion = await getNotionClient();
    const response = await notion.databases.query({
      database_id: getDatabaseId(),
    });

    const byStatus: Record<string, number> = {};
    response.results.forEach((page) => {
      const rawStatus =
        ((page as { properties?: Record<string, { select?: { name?: string } }> }).properties?.["狀態"]?.select?.name) || "未分類";
      const status = STATUS_MAP[rawStatus] ?? rawStatus;
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return NextResponse.json({
      total: response.results.length,
      byStatus,
    });
  } catch (error) {
    console.error("Failed to fetch task summary:", error);
    return NextResponse.json({ total: 0, byStatus: {} }, { status: 500 });
  }
}
