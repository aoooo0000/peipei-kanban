import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { readFile } from "fs/promises";

async function getNotionClient() {
  const apiKey = await readFile(`${process.env.HOME}/.config/notion/api_key`, "utf-8");
  return new Client({ auth: apiKey.trim() });
}

export async function GET() {
  try {
    const notion = await getNotionClient();
    const databaseId = "30155d1f-de22-8190-950d-c20cbff9e520";

    const response = await notion.databases.query({
      database_id: databaseId,
    });

    const byStatus: Record<string, number> = {};
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.results.forEach((page: any) => {
      const status = page.properties["狀態"]?.select?.name || "未分類";
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return NextResponse.json({
      total: response.results.length,
      byStatus,
    });
  } catch (error) {
    console.error("Failed to fetch task summary:", error);
    return NextResponse.json(
      { total: 0, byStatus: {} },
      { status: 500 }
    );
  }
}
