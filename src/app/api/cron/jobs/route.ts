import { NextResponse } from "next/server";
import { supabaseGetFirstData } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

interface CronStateJob {
  id?: string;
  agentId?: string;
  name?: string;
  enabled?: boolean;
  schedule?: { kind?: string; expr?: string; tz?: string };
  state?: {
    lastStatus?: string;
    lastRunAtMs?: number;
    nextRunAtMs?: number;
    lastDurationMs?: number;
    consecutiveErrors?: number;
  };
}

export interface CronJobApiItem {
  id: string;
  agentId: string;
  name: string;
  schedule: string;
  tz: string;
  enabled: boolean;
  lastStatus: string;
  lastRunAtMs?: number;
  nextRunAtMs?: number;
  lastDurationMs?: number;
  consecutiveErrors: number;
}

function toApiJob(job: CronStateJob, index: number): CronJobApiItem {
  return {
    id: job.id || `job-${index}`,
    agentId: job.agentId || "main",
    name: job.name || `Job ${index + 1}`,
    schedule: job.schedule?.expr || "* * * * *",
    tz: job.schedule?.tz || "Asia/Taipei",
    enabled: job.enabled ?? true,
    lastStatus: job.state?.lastStatus || "unknown",
    lastRunAtMs: job.state?.lastRunAtMs,
    nextRunAtMs: job.state?.nextRunAtMs,
    lastDurationMs: job.state?.lastDurationMs,
    consecutiveErrors: job.state?.consecutiveErrors ?? 0,
  };
}

export async function GET() {
  const cronState = await supabaseGetFirstData<unknown>("cronState");

  let sourceJobs: CronStateJob[] = [];
  if (Array.isArray(cronState)) {
    sourceJobs = cronState as CronStateJob[];
  } else if (cronState && typeof cronState === "object" && Array.isArray((cronState as { jobs?: unknown[] }).jobs)) {
    sourceJobs = (cronState as { jobs: CronStateJob[] }).jobs;
  }

  const jobs = sourceJobs.map(toApiJob);

  return NextResponse.json({ jobs, source: "supabase" });
}
