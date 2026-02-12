import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

interface AgentStatus {
  state: "idle" | "thinking" | "acting";
  activeAgent?: string;
  lastUpdate: string;
}

export async function GET() {
  try {
    // 嘗試讀取 OpenClaw cron jobs state
    const jobsPath = join(process.env.HOME || "", ".openclaw", "cron", "jobs.json");
    
    try {
      const jobsData = await readFile(jobsPath, "utf-8");
      const jobs = JSON.parse(jobsData);
      
      // 檢查是否有活躍的 cron job
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeJobs = Object.values(jobs).filter((job: any) => job.status === "running");
      
      const status: AgentStatus = {
        state: activeJobs.length > 0 ? "acting" : "idle",
        activeAgent: activeJobs.length > 0 ? "Cron Agent" : undefined,
        lastUpdate: new Date().toISOString(),
      };
      
      return NextResponse.json(status);
    } catch {
      // 如果無法讀取，返回預設狀態
      return NextResponse.json({
        state: "idle",
        lastUpdate: new Date().toISOString(),
      } as AgentStatus);
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  try {
    // 在實際環境中，這裡應該更新 OpenClaw 的狀態
    // 目前只返回成功響應
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
