import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { CRON_JOBS, type CronJobDef } from "@/lib/cronJobs";

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
  description?: string;
  category?: CronJobDef["category"];
  payload?: Record<string, unknown>;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
  };
}

function staticToRuntimeJobs(): CronJob[] {
  return CRON_JOBS.map((job) => ({
    id: job.id,
    agentId: job.agentId,
    name: job.name,
    enabled: true,
    schedule: {
      kind: "cron",
      expr: job.schedule,
      tz: job.tz,
    },
    description: job.description,
    category: job.category,
    payload: {},
    state: {},
  }));
}

function enrichJobs(jobs: CronJob[]): CronJob[] {
  return jobs.map((job) => {
    const matched = CRON_JOBS.find((item) => item.id === job.id);
    return {
      ...job,
      description: job.description ?? matched?.description ?? "",
      category: job.category ?? matched?.category ?? "other",
    };
  });
}

export async function GET() {
  try {
    const jobsPath = join(process.env.HOME || "", ".openclaw", "cron", "jobs.json");
    const raw = await readFile(jobsPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ jobs: staticToRuntimeJobs(), source: "fallback" });
    }

    return NextResponse.json({ jobs: enrichJobs(parsed as CronJob[]), source: "local" });
  } catch {
    return NextResponse.json({ jobs: staticToRuntimeJobs(), source: "fallback" });
  }
}
