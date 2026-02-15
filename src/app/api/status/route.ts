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

type CronStateJob = {
  agentId?: string;
  state?: {
    lastRunAtMs?: number;
  };
};

const AGENT_META: Array<Pick<AgentStatusItem, "id" | "name" | "emoji">> = [
  { id: "main", name: "霈霈豬", emoji: "🐷" },
  { id: "trading-lab", name: "Trading Lab", emoji: "📈" },
  { id: "coder", name: "Coder", emoji: "💻" },
  { id: "learner", name: "實習生阿霈", emoji: "🎓" },
];

const FALLBACK_STATUS: AgentStatusPayload = {
  agents: AGENT_META.map((agent) => ({ ...agent, status: "idle", lastActive: null })),
  uptime: "-",
  version: process.env.NEXT_PUBLIC_APP_VERSION || "2.6.3",
};

function buildStatusFromCronState(cronJobs: CronStateJob[]): AgentStatusPayload {
  const nowMs = Date.now();
  const activeWindowMs = 10 * 60 * 1000;
  const latestByAgent = new Map<string, number>();

  for (const job of cronJobs) {
    const agentId = job?.agentId;
    const lastRunAtMs = job?.state?.lastRunAtMs;
    if (!agentId || typeof lastRunAtMs !== "number") continue;

    const prev = latestByAgent.get(agentId) ?? 0;
    if (lastRunAtMs > prev) latestByAgent.set(agentId, lastRunAtMs);
  }

  const agents = AGENT_META.map((agent) => {
    const lastRunAtMs = latestByAgent.get(agent.id);
    const status = lastRunAtMs && nowMs - lastRunAtMs <= activeWindowMs ? "working" : "idle";
    return {
      ...agent,
      status,
      lastActive: lastRunAtMs ? new Date(lastRunAtMs).toISOString() : null,
    } satisfies AgentStatusItem;
  });

  return {
    agents,
    uptime: FALLBACK_STATUS.uptime,
    version: process.env.NEXT_PUBLIC_APP_VERSION || "2.6.3",
  };
}

export async function GET() {
  try {
    const cronState = await supabaseGetFirstData<CronStateJob[]>("cronState");
    if (Array.isArray(cronState)) {
      return NextResponse.json(buildStatusFromCronState(cronState));
    }
    return NextResponse.json(FALLBACK_STATUS);
  } catch (error) {
    console.error("GET /api/status error", error);
    return NextResponse.json(FALLBACK_STATUS);
  }
}
