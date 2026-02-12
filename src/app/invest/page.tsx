"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HoldingSummary {
  totalMarketValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingsCount: number;
}

interface Holding {
  symbol: string;
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
  const { data: holdingsData } = useSWR<{ summary: HoldingSummary; holdings: Holding[] }>(
    "/api/invest/holdings",
    fetcher,
    { refreshInterval: 60000 }
  );
  const { data: watchlistData } = useSWR<{ watchlist: WatchlistItem[] }>(
    "/api/invest/watchlist",
    fetcher,
    { refreshInterval: 60000 }
  );
  const { data: catalystsData } = useSWR<{ catalysts: CatalystEvent[] }>(
    "/api/invest/catalysts",
    fetcher
  );

  const summary = holdingsData?.summary;
  const holdings = holdingsData?.holdings || [];
  const watchlist = watchlistData?.watchlist || [];
  const catalysts = catalystsData?.catalysts || [];

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 md:p-6 pb-20">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📈 投資</h1>

      {/* 持股概覽 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">持股概覽</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">總市值</div>
            <div className="text-xl md:text-2xl font-bold font-mono">
              {summary ? formatCurrency(summary.totalMarketValue) : "..."}
            </div>
          </div>
          <div className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">總盈虧</div>
            <div
              className={`text-xl md:text-2xl font-bold font-mono ${
                summary && summary.totalGainLoss >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {summary ? formatCurrency(summary.totalGainLoss) : "..."}
            </div>
          </div>
          <div className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">報酬率</div>
            <div
              className={`text-xl md:text-2xl font-bold font-mono ${
                summary && summary.totalGainLossPercent >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {summary ? formatPercent(summary.totalGainLossPercent) : "..."}
            </div>
          </div>
          <div className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">持股數</div>
            <div className="text-xl md:text-2xl font-bold font-mono">
              {summary?.holdingsCount || 0}
            </div>
          </div>
        </div>
      </section>

      {/* 持股列表 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">持股明細</h2>
        <div className="space-y-2">
          {holdings.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              {holdingsData ? "無持股資料" : "載入中..."}
            </div>
          ) : (
            holdings.map((h) => (
              <div
                key={h.symbol}
                className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{h.symbol}</h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      {h.shares.toLocaleString()} 股 @ ${h.avgCost.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold">${h.currentPrice.toFixed(2)}</div>
                    <div
                      className={`text-sm font-mono font-semibold ${
                        h.gainLossPercent >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatPercent(h.gainLossPercent)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">市值: {formatCurrency(h.marketValue)}</span>
                  <span className={h.gainLoss >= 0 ? "text-green-400" : "text-red-400"}>
                    {h.gainLoss >= 0 ? "+" : ""}
                    {formatCurrency(h.gainLoss)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Watchlist */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Watchlist</h2>
        <div className="space-y-2">
          {watchlist.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              {watchlistData ? "Watchlist 為空" : "載入中..."}
            </div>
          ) : (
            watchlist.map((item) => (
              <div
                key={item.symbol}
                className={`rounded-xl bg-[#2a2a3e] p-4 border ${
                  item.nearBuyPoint ? "border-green-400/50 bg-green-500/5" : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">
                      {item.symbol}
                      {item.nearBuyPoint && <span className="ml-2 text-green-400">🎯</span>}
                    </h3>
                    {item.reason && (
                      <p className="text-xs text-zinc-400 mt-1">{item.reason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">
                      現價: <span className="font-bold">${item.currentPrice.toFixed(2)}</span>
                    </div>
                    {item.target_price && (
                      <div className="text-xs text-zinc-400 font-mono">
                        目標: ${item.target_price.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                {item.target_price && (
                  <div className="text-xs text-zinc-400">
                    距離目標: {formatPercent(item.distance)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 催化劑事件 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">催化劑事件</h2>
        <div className="space-y-2">
          {catalysts.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              {catalystsData ? "無即將到來的事件" : "載入中..."}
            </div>
          ) : (
            catalysts.map((event, idx) => (
              <div key={idx} className="rounded-xl bg-[#2a2a3e] p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold">{event.symbol}</h3>
                    <p className="text-sm text-zinc-300 mt-1">{event.event}</p>
                    {event.notes && (
                      <p className="text-xs text-zinc-400 mt-1">{event.notes}</p>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 ml-4">
                    {new Date(event.date).toLocaleDateString("zh-TW")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
