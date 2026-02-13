import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr: string;
    tz?: string;
  };
  payload?: Record<string, unknown>;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
  };
}

export async function GET() {
  try {
    const jobsPath = join(process.env.HOME || "", ".openclaw", "cron", "jobs.json");
    const raw = await readFile(jobsPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ jobs: [] });
    }

    return NextResponse.json({ jobs: parsed as CronJob[] });
  } catch (error) {
    console.error("GET /api/cron/jobs error", error);
    return NextResponse.json({ jobs: [] });
  }
}
