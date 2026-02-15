import { NextResponse } from "next/server";
import { supabaseGetFirstData } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  agentId?: string;
}

export async function GET() {
  try {
    const logs = await supabaseGetFirstData<LogEntry[]>("activityLogs");
    if (logs && Array.isArray(logs)) {
      return NextResponse.json({ logs });
    }
    return NextResponse.json({ logs: [] });
  } catch (error) {
    console.error("GET /api/logs error", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
