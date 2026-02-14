import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  agentId?: string;
}

async function fetchFromSupabase(): Promise<LogEntry[] | null> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_EMAIL;
  const password = process.env.SUPABASE_PASSWORD;
  if (!url || !anonKey || !email || !password) return null;

  try {
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!authRes.ok) return null;
    const { access_token } = await authRes.json();

    const res = await fetch(`${url}/rest/v1/user_data?data_type=eq.activityLogs&select=data`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows.length > 0 && Array.isArray(rows[0].data)) {
      return rows[0].data as LogEntry[];
    }
  } catch {
    // fall through
  }
  return null;
}

export async function GET() {
  try {
    const logs = await fetchFromSupabase();
    if (logs) {
      return NextResponse.json({ logs });
    }
    // Fallback: empty
    return NextResponse.json({ logs: [] });
  } catch (error) {
    console.error("GET /api/logs error", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
