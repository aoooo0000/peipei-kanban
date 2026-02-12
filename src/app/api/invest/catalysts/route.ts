import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

interface CatalystEvent {
  symbol: string;
  date: string;
  event: string;
  notes?: string;
}

export async function GET() {
  try {
    const filePath = path.join(homedir(), "clawd/memory/investing/swing_trades.json");

    let data: { catalyst_watch?: CatalystEvent[] } = {};
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(fileContent);
    } catch {
      return NextResponse.json({ catalysts: [] });
    }

    const catalysts = data.catalyst_watch || [];

    // Filter future events and sort by date
    const futureEvents = catalysts
      .filter((e) => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ catalysts: futureEvents });
  } catch (error) {
    console.error("GET /api/invest/catalysts error", error);
    return NextResponse.json({ error: "Failed to fetch catalysts" }, { status: 500 });
  }
}
