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

async function fetchFromSupabase(): Promise<CronJob[] | null> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_EMAIL;
  const password = process.env.SUPABASE_PASSWORD;
  if (!url || !anonKey || !email || !password) return null;

  try {
    // Login
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!authRes.ok) return null;
    const { access_token } = await authRes.json();

    // Fetch cronState
    const res = await fetch(`${url}/rest/v1/user_data?data_type=eq.cronState&select=data`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows.length > 0 && Array.isArray(rows[0].data)) {
      return rows[0].data as CronJob[];
    }
  } catch {
    // fall through
  }
  return null;
}

export async function GET() {
  // Try local file first (works on Mac mini dev)
  try {
    const jobsPath = join(process.env.HOME || "", ".openclaw", "cron", "jobs.json");
    const raw = await readFile(jobsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const jobs = Array.isArray(parsed) ? parsed : parsed.jobs;
    if (Array.isArray(jobs)) {
      return NextResponse.json({ jobs: enrichJobs(jobs as CronJob[]), source: "local" });
    }
  } catch {
    // Try Supabase (works on Vercel)
    const supabaseJobs = await fetchFromSupabase();
    if (supabaseJobs) {
      return NextResponse.json({ jobs: enrichJobs(supabaseJobs), source: "supabase" });
    }
  }

  return NextResponse.json({ jobs: staticToRuntimeJobs(), source: "fallback" });
}
