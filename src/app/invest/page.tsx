"use client";

import useSWR from "swr";
import { fetchJSON } from "@/lib/api";

const fetcher = <T,>(url: string) => fetchJSON<T>(url, 9000);

interface HoldingSummary {
  totalMarketValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingsCount: number;
}

interface Holding {
  symbol: string;
  name?: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface WatchlistItem {
  symbol: string;
  target_price?: number;
  currentPrice: number;
  distance: number;
  nearBuyPoint: boolean;
  reason?: string;
}

interface CatalystEvent {
  symbol: string;
  date: string;
  event: string;
  notes?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function InvestPage() {
  const { data: holdingsData, error: holdingsError, mutate: retryHoldings } = useSWR<{ summary: HoldingSummary; holdings: Holding[] }>(
    "/api/invest/holdings",
    fetcher,
    { refreshInterval: 60000 }
  );
  const { data: watchlistData, error: watchlistError } = useSWR<{ watchlist: WatchlistItem[] }>(
    "/api/invest/watchlist",
    fetcher,
    { refreshInterval: 60000 }
  );
  const { data: catalystsData, error: catalystsError } = useSWR<{ catalysts: CatalystEvent[] }>(
    "/api/invest/catalysts",
    fetcher
  );

  const summary = holdingsData?.summary;
  const holdings = holdingsData?.holdings || [];
  const watchlist = watchlistData?.watchlist || [];
  const catalysts = catalystsData?.catalysts || [];
  const hasError = holdingsError || watchlistError || catalystsError;

  return (
    <main className="min-h-screen text-zinc-100 p-4 md:p-6 pb-24 animate-fadeInUp">
      {hasError && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 p-4">
          <p className="text-sm text-red-100">投資資料載入失敗，請稍後重試。</p>
          <button onClick={() => retryHoldings()} className="mt-2 rounded bg-red-500/35 px-3 py-1 text-xs">重試</button>
        </div>
      )}
      <h1 className="text-xl font-bold mb-6">📈 投資</h1>

      <section className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          {
            label: "總市值",
            value: summary ? formatCurrency(summary.totalMarketValue) : "",
            cls: "text-white",
          },
          {
            label: "總盈虧",
            value: summary ? formatCurrency(summary.totalGainLoss) : "",
            cls: summary && summary.totalGainLoss >= 0 ? "text-emerald-300" : "text-red-300",
          },
          {
            label: "盈虧比例",
            value: summary ? formatPercent(summary.totalGainLossPercent) : "",
            cls: summary && summary.totalGainLossPercent >= 0 ? "text-emerald-300" : "text-red-300",
          },
        ].map((item, idx) => (
          <div key={item.label} className="glass-card rounded-2xl border border-white/10 p-4 stagger-item" style={{ ["--stagger" as string]: `${idx * 90}ms` }}>
            <p className="text-xs text-white/60 mb-1">{item.label}</p>
            {summary ? (
              <p className={`text-3xl font-bold font-mono ${item.cls}`}>{item.value}</p>
            ) : (
              <div className="h-9 rounded-lg skeleton-glass" />
            )}
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">持倉卡片（{summary?.holdingsCount ?? 0}）</h2>
        {holdingsData && holdings.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-white/70">📭 目前沒有持倉，去 watchlist 找機會吧！</div>
        ) : !holdingsData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 border border-white/10">
                <div className="h-7 w-20 rounded skeleton-glass mb-2" />
                <div className="h-4 w-32 rounded skeleton-glass mb-4" />
                <div className="space-y-2">
                  <div className="h-4 rounded skeleton-glass" />
                  <div className="h-4 rounded skeleton-glass" />
                  <div className="h-4 rounded skeleton-glass" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.map((h, idx) => {
              const isProfit = h.gainLossPercent >= 0;
              return (
                <article key={h.symbol} className="glass-card rounded-2xl border border-white/10 p-4 stagger-item" style={{ ["--stagger" as string]: `${idx * 75}ms` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-3xl font-black tracking-wide">{h.symbol}</h3>
                      <p className="text-xs text-white/60">{h.name ?? `${h.symbol} Holdings`}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isProfit ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                      {formatPercent(h.gainLossPercent)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-white/60">持股數量</span><span className="font-mono">{h.shares.toLocaleString()} 股</span></div>
                    <div className="flex justify-between"><span className="text-white/60">現價</span><span className="font-mono font-semibold">${h.currentPrice.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">市值</span><span className="font-mono">{formatCurrency(h.marketValue)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">盈虧</span><span className={`font-mono font-semibold ${isProfit ? "text-emerald-300" : "text-red-300"}`}>{h.gainLoss >= 0 ? "+" : ""}{formatCurrency(h.gainLoss)}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {watchlist.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4">👀 Watchlist</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchlist.map((item, idx) => (
              <div key={item.symbol} className={`glass-card rounded-xl p-4 border ${item.nearBuyPoint ? "border-emerald-400/45" : "border-white/10"} stagger-item`} style={{ ["--stagger" as string]: `${idx * 70}ms` }}>
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-lg">{item.symbol}</p>
                  {item.nearBuyPoint && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Near</span>}
                </div>
                <div className="text-xs text-white/60 space-y-1">
                  <p>目標價：{item.target_price ? `$${item.target_price.toFixed(2)}` : "-"}</p>
                  <p>現價：${item.currentPrice.toFixed(2)}</p>
                  <p className={item.distance <= 0 ? "text-emerald-300" : "text-amber-300"}>距離：{formatPercent(item.distance)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">催化劑事件</h2>
        {catalysts.length === 0 ? (
          <div className="glass-card rounded-2xl p-7 text-center text-white/65">🧘 暫無重大事件，繼續耐心觀察。</div>
        ) : (
          <div className="space-y-2">
            {catalysts.map((event, idx) => (
              <div key={idx} className="rounded-xl glass-card p-4 border border-white/10 stagger-item" style={{ ["--stagger" as string]: `${idx * 60}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{event.symbol}</h3>
                    <p className="text-sm text-zinc-300 mt-1">{event.event}</p>
                    {event.notes && <p className="text-xs text-zinc-400 mt-1">{event.notes}</p>}
                  </div>
                  <div className="text-xs text-zinc-400 ml-4">{new Date(event.date).toLocaleDateString("zh-TW")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
