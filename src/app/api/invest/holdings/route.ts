import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

interface MyWealthConfig {
  supabase_url: string;
  anon_key: string;
  access_token: string;
  email: string;
  password: string;
}

interface Transaction {
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  totalAmount: number;
  date: string;
}

interface FMPQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
}

async function getMyWealthConfig(): Promise<MyWealthConfig> {
  const configPath = path.join(homedir(), ".config/mywealth/config.json");
  const configData = await fs.readFile(configPath, "utf-8");
  return JSON.parse(configData);
}

async function getFMPApiKey(): Promise<string> {
  const keyPath = path.join(homedir(), ".config/fmp/api_key");
  return (await fs.readFile(keyPath, "utf-8")).trim();
}

async function fetchTransactions(config: MyWealthConfig): Promise<Transaction[]> {
  const res = await fetch(`${config.supabase_url}/rest/v1/transactions?select=*&order=date.desc`, {
    headers: {
      apikey: config.anon_key,
      Authorization: `Bearer ${config.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return res.json();
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
    const config = await getMyWealthConfig();
    const fmpKey = await getFMPApiKey();
    const transactions = await fetchTransactions(config);

    // Calculate net holdings (buy - sell)
    const holdingsMap = new Map<string, { shares: number; totalCost: number }>();

    transactions
      .filter((t) => ["BUY", "SELL"].includes(t.action))
      .forEach((t) => {
        const current = holdingsMap.get(t.symbol) || { shares: 0, totalCost: 0 };
        if (t.action === "BUY") {
          current.shares += t.quantity;
          current.totalCost += t.totalAmount;
        } else if (t.action === "SELL") {
          current.shares -= t.quantity;
          current.totalCost -= t.totalAmount;
        }
        holdingsMap.set(t.symbol, current);
      });

    // Filter out zero holdings
    const holdings = Array.from(holdingsMap.entries())
      .filter(([_, data]) => data.shares > 0)
      .map(([symbol, data]) => ({
        symbol,
        shares: data.shares,
        avgCost: data.totalCost / data.shares,
      }));

    // Fetch current prices
    const holdingsWithQuotes = await Promise.all(
      holdings.map(async (h) => {
        const quote = await fetchFMPQuote(h.symbol, fmpKey);
        const currentPrice = quote?.price || 0;
        const marketValue = h.shares * currentPrice;
        const costBasis = h.shares * h.avgCost;
        const gainLoss = marketValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
          ...h,
          currentPrice,
          marketValue,
          costBasis,
          gainLoss,
          gainLossPercent,
        };
      })
    );

    // Sort by market value
    holdingsWithQuotes.sort((a, b) => b.marketValue - a.marketValue);

    // Calculate summary
    const totalMarketValue = holdingsWithQuotes.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCostBasis = holdingsWithQuotes.reduce((sum, h) => sum + h.costBasis, 0);
    const totalGainLoss = totalMarketValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalMarketValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: holdingsWithQuotes.length,
      },
      holdings: holdingsWithQuotes,
    });
  } catch (error) {
    console.error("GET /api/invest/holdings error", error);
    return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 });
  }
}
