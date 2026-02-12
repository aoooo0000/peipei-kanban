import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const queuePath = path.join(homedir(), "clawd/memory/state/research_queue.json");
    let queue: Array<{ text: string; timestamp: string }> = [];

    try {
      const existing = await fs.readFile(queuePath, "utf-8");
      queue = JSON.parse(existing);
    } catch {
      // File doesn't exist, start fresh
    }

    queue.push({
      text,
      timestamp: new Date().toISOString(),
    });

    await fs.mkdir(path.dirname(queuePath), { recursive: true });
    await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));

    return NextResponse.json({ success: true, queued: queue.length });
  } catch (error) {
    console.error("POST /api/actions/research error", error);
    return NextResponse.json({ error: "Failed to queue research" }, { status: 500 });
  }
}
