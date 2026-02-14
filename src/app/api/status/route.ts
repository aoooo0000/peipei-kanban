import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AgentStatusItem {
  id: string;
  name: string;
  emoji: string;
  status: "idle" | "working";
  lastActive: string | null;
}

interface AgentStatusPayload {
  agents: AgentStatusItem[];
  uptime?: string;
  version?: string;
}

const FALLBACK_STATUS: AgentStatusPayload = {
  agents: [
    {
      id: "main",
      name: "霈霈豬",
      emoji: "🐷",
      status: "idle",
      lastActive: "2026-02-14T02:30:00Z",
    },
    {
      id: "trading-lab",
      name: "Trading Lab",
      emoji: "📈",
      status: "idle",
      lastActive: "2026-02-14T02:28:00Z",
    },
    {
      id: "coder",
      name: "Coder",
      emoji: "💻",
      status: "idle",
      lastActive: "2026-02-14T02:25:00Z",
    },
  ],
  uptime: "3d 14h",
  version: process.env.NEXT_PUBLIC_APP_VERSION || "2.6.3",
};

async function fetchFromSupabase(): Promise<AgentStatusPayload | null> {
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

    const res = await fetch(`${url}/rest/v1/user_data?data_type=eq.agentStatus&select=data`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return null;

    const rows = await res.json();
    if (rows.length > 0 && rows[0]?.data && Array.isArray(rows[0].data.agents)) {
      return rows[0].data as AgentStatusPayload;
    }
  } catch {
    // fall through
  }

  return null;
}

export async function GET() {
  try {
    const supabaseStatus = await fetchFromSupabase();
    if (supabaseStatus) {
      return NextResponse.json({
        agents: supabaseStatus.agents,
        uptime: supabaseStatus.uptime ?? FALLBACK_STATUS.uptime,
        version: supabaseStatus.version ?? (process.env.NEXT_PUBLIC_APP_VERSION || "2.6.3"),
      });
    }

    return NextResponse.json(FALLBACK_STATUS);
  } catch (error) {
    console.error("GET /api/status error", error);
    return NextResponse.json(FALLBACK_STATUS);
  }
}
