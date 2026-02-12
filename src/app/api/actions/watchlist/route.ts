import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    const filePath = path.join(homedir(), "clawd/memory/investing/swing_trades.json");
    let data: { watchlist?: Array<{ symbol: string; target_price?: number; reason?: string }> } = {};

    try {
      const existing = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(existing);
    } catch {
      data = { watchlist: [] };
    }

    if (!data.watchlist) data.watchlist = [];

    // Check if already in watchlist
    if (data.watchlist.some((item) => item.symbol === symbol.toUpperCase())) {
      return NextResponse.json({ success: true, message: "Already in watchlist" });
    }

    data.watchlist.push({
      symbol: symbol.toUpperCase(),
      reason: `Added from docs selection at ${new Date().toISOString()}`,
    });

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, symbol: symbol.toUpperCase() });
  } catch (error) {
    console.error("POST /api/actions/watchlist error", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}
