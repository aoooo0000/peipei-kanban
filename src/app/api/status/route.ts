import { NextResponse } from "next/server";
import { supabaseGetFirstData } from "@/lib/supabaseRest";

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
      lastActive: null,
    },
    {
      id: "trading-lab",
      name: "Trading Lab",
      emoji: "📈",
      status: "idle",
      lastActive: null,
    },
    {
      id: "coder",
      name: "Coder",
      emoji: "💻",
      status: "idle",
      lastActive: null,
    },
  ],
  uptime: "-",
  version: process.env.NEXT_PUBLIC_APP_VERSION || "2.6.3",
};

export async function GET() {
  try {
    const supabaseStatus = await supabaseGetFirstData<AgentStatusPayload>("agentStatus");
    if (supabaseStatus && Array.isArray(supabaseStatus.agents)) {
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
