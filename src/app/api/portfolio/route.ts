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
  currency?: string | null;
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
  noQuote?: boolean;
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

async function fetchTWQuotes(symbols: string[]): Promise<Map<string, QuoteItem>> {
  if (!symbols.length) return new Map();
  const token = process.env.FINMIND_TOKEN;
  if (!token) return new Map();
  const map = new Map<string, QuoteItem>();
  // FinMind doesn't support batch, query one by one (but fast)
  const today = new Date();
  const startDate = new Date(today.getTime() - 10 * 86400000).toISOString().slice(0, 10);
  await Promise.all(symbols.map(async (sym) => {
    try {
      const params = new URLSearchParams({
        dataset: "TaiwanStockPrice",
        data_id: sym,
        start_date: startDate,
        token,
      });
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const rows = json?.data;
      if (!rows?.length) return;
      const last = rows[rows.length - 1];
      const prev = rows.length > 1 ? rows[rows.length - 2] : null;
      const close = toNumber(last.close);
      const prevClose = prev ? toNumber(prev.close) : close;
      const changePct = prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0;
      map.set(sym, { symbol: sym, price: close, changesPercentage: changePct });
    } catch { /* skip */ }
  }));
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

    const lots = new Map<string, { symbol: string; qty: number; cost: number; currency: string; market: string }>();

    for (const tx of transactions) {
      const symbol = tx.symbol.trim().toUpperCase();
      const qty = Math.max(0, toNumber(tx.quantity));
      const price = Math.max(0, toNumber(tx.price));
      if (!symbol || qty <= 0 || price <= 0) continue;

      const market = (tx.market || "").toUpperCase();
      const currency = tx.currency ? tx.currency.toUpperCase() : (market === "TW" ? "TWD" : "USD");
      const key = `${symbol}__${currency}`;
      const current = lots.get(key) ?? { symbol, qty: 0, cost: 0, currency, market };

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
    const usSymbols = activeLots.filter((l) => l.currency !== "TWD").map((l) => l.symbol);
    const twSymbols = activeLots.filter((l) => l.currency === "TWD").map((l) => l.symbol);

    // Fetch US quotes from FMP, TW quotes from FinMind
    const [usQuoteMap, twQuoteMap] = await Promise.all([
      fetchQuotes(usSymbols, fmpKey),
      fetchTWQuotes(twSymbols),
    ]);

    // Merge into one map
    const quoteMap = new Map<string, QuoteItem>();
    for (const [k, v] of usQuoteMap) quoteMap.set(k, v);
    for (const [k, v] of twQuoteMap) quoteMap.set(k, v);

    const holdings: HoldingSnapshot[] = activeLots.map((lot) => {
      const quote = quoteMap.get(lot.symbol);
      const hasQuote = !!quote?.price && toNumber(quote.price) > 0;
      const currentPrice = toNumber(quote?.price);
      const value = hasQuote ? lot.qty * currentPrice : 0;
      const cost = lot.cost;
      const pnl = hasQuote ? value - cost : 0;
      const pnlPct = hasQuote && cost > 0 ? (pnl / cost) * 100 : 0;
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
        noQuote: !hasQuote,
      };
    }).sort((a, b) => b.value - a.value);

    const byCurrency = new Map<string, CurrencySummary>();
    for (const h of holdings.filter(h => !h.noQuote)) {
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
