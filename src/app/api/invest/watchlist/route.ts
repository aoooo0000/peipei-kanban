import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

interface WatchlistItem {
  symbol: string;
  target_price?: number;
  reason?: string;
}

interface FMPQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
}

async function getFMPApiKey(): Promise<string> {
  const keyPath = path.join(homedir(), ".config/fmp/api_key");
  return (await fs.readFile(keyPath, "utf-8")).trim();
}

async function fetchFMPQuote(symbol: string, apiKey: string): Promise<FMPQuote | null> {
  try {
    const res = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const filePath = path.join(homedir(), "clawd/memory/investing/swing_trades.json");
    const fmpKey = await getFMPApiKey();

    let data: { watchlist?: WatchlistItem[] } = {};
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(fileContent);
    } catch {
      return NextResponse.json({ watchlist: [] });
    }

    const watchlist = data.watchlist || [];

    // Fetch current prices
    const watchlistWithQuotes = await Promise.all(
      watchlist.map(async (item) => {
        const quote = await fetchFMPQuote(item.symbol, fmpKey);
        const currentPrice = quote?.price || 0;
        const targetPrice = item.target_price || 0;
        const distance = targetPrice > 0 ? ((currentPrice - targetPrice) / targetPrice) * 100 : 0;
        const nearBuyPoint = distance < 5 && distance > -5; // Within 5% of target

        return {
          ...item,
          currentPrice,
          distance,
          nearBuyPoint,
        };
      })
    );

    return NextResponse.json({ watchlist: watchlistWithQuotes });
  } catch (error) {
    console.error("GET /api/invest/watchlist error", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}
