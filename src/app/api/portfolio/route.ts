import { NextResponse } from "next/server";
import { supabaseGetUserDataByType } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

interface Transaction {
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: number;
  date: string;
  totalAmount?: number;
  currency: "USD" | "TWD" | string;
  market?: string;
}

interface QuoteItem {
  symbol: string;
  price?: number;
  changesPercentage?: number;
}

interface HoldingSnapshot {
  symbol: string;
  qty: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  dayChangePct: number;
  currency: string;
}

interface CurrencySummary {
  currency: string;
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  dayPnl: number;
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchQuotes(symbols: string[], apiKey: string): Promise<Map<string, QuoteItem>> {
  if (!symbols.length) return new Map();
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols.join(","))}?apikey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return new Map();
  const data = (await res.json()) as QuoteItem[];
  const map = new Map<string, QuoteItem>();
  for (const item of data) {
    if (item?.symbol) map.set(item.symbol.toUpperCase(), item);
  }
  return map;
}

export async function GET() {
  try {
    const fmpKey = process.env.FMP_API_KEY;
    if (!fmpKey) {
      return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 500 });
    }

    const txRows = await supabaseGetUserDataByType<Transaction[]>("transactions");
    const transactions = txRows.flat().filter((tx) => tx && tx.symbol && tx.action);

    const lots = new Map<string, { symbol: string; qty: number; cost: number; currency: string }>();

    for (const tx of transactions) {
      const symbol = tx.symbol.trim().toUpperCase();
      const qty = Math.max(0, toNumber(tx.quantity));
      const price = Math.max(0, toNumber(tx.price));
      if (!symbol || qty <= 0 || price <= 0) continue;

      const key = `${symbol}__${(tx.currency || "USD").toUpperCase()}`;
      const current = lots.get(key) ?? { symbol, qty: 0, cost: 0, currency: (tx.currency || "USD").toUpperCase() };

      if (tx.action === "BUY") {
        current.cost += qty * price;
        current.qty += qty;
      } else {
        if (current.qty > 0) {
          const sellQty = Math.min(qty, current.qty);
          const avgCost = current.cost / current.qty;
          current.cost -= avgCost * sellQty;
          current.qty -= sellQty;
        }
      }

      lots.set(key, current);
    }

    const activeLots = [...lots.values()].filter((l) => l.qty > 0.000001);
    const symbols = [...new Set(activeLots.map((l) => l.symbol))];
    const quoteMap = await fetchQuotes(symbols, fmpKey);

    const holdings: HoldingSnapshot[] = activeLots.map((lot) => {
      const quote = quoteMap.get(lot.symbol);
      const currentPrice = toNumber(quote?.price);
      const value = lot.qty * currentPrice;
      const cost = lot.cost;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const dayChangePct = toNumber(quote?.changesPercentage);
      return {
        symbol: lot.symbol,
        qty: Number(lot.qty.toFixed(4)),
        avgCost: lot.qty > 0 ? cost / lot.qty : 0,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPct,
        dayChangePct,
        currency: lot.currency,
      };
    }).sort((a, b) => b.value - a.value);

    const byCurrency = new Map<string, CurrencySummary>();
    for (const h of holdings) {
      const curr = h.currency || "USD";
      const summary = byCurrency.get(curr) ?? {
        currency: curr,
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPct: 0,
        dayPnl: 0,
      };
      summary.totalValue += h.value;
      summary.totalCost += h.cost;
      summary.totalPnl += h.pnl;
      summary.dayPnl += h.value * (h.dayChangePct / 100);
      byCurrency.set(curr, summary);
    }

    const summary = [...byCurrency.values()].map((s) => ({
      ...s,
      totalPnlPct: s.totalCost > 0 ? (s.totalPnl / s.totalCost) * 100 : 0,
    }));

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      summary,
      holdings,
    });
  } catch (error) {
    console.error("GET /api/portfolio error", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
