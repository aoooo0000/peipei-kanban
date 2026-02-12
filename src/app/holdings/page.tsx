'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, AlertCircle } from 'lucide-react';

interface Holding {
  symbol: string;
  shares: string;
  cost: string;
}

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    try {
      const res = await fetch('/api/holdings');
      const data = await res.json();

      if (data.error === 'local_only') {
        setIsLocal(false);
      } else {
        setHoldings(data.holdings || []);
        setRawContent(data.rawContent || '');
      }
    } catch (err) {
      console.error('Error fetching holdings:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return holdings.reduce((sum, h) => {
      const shares = parseFloat(h.shares) || 0;
      const cost = parseFloat(h.cost?.replace('$', '').replace(',', '')) || 0;
      return sum + (shares * cost);
    }, 0);
  };

  const totalValue = calculateTotal();

  if (!isLocal) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">僅限本地使用</h2>
          <p className="text-zinc-400">此功能需要存取本地檔案，在 Vercel 上無法使用</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
              持股總覽
            </h2>
            <p className="text-zinc-400 mt-1">投資組合快照</p>
          </div>
          {holdings.length > 0 && (
            <div className="bg-[#252544] rounded-lg p-4 border border-zinc-700">
              <div className="text-sm text-zinc-400 mb-1">總成本</div>
              <div className="text-2xl font-bold text-green-400">
                ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {/* Holdings Grid */}
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Package className="w-16 h-16 mb-4" />
            <p className="text-lg mb-2">目前沒有持股資料</p>
            <p className="text-sm text-zinc-500">
              請確認 <code className="bg-zinc-800 px-2 py-1 rounded">memory/investing/current_holdings.md</code> 存在
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {holdings.map((holding, idx) => {
                const shares = parseFloat(holding.shares) || 0;
                const cost = parseFloat(holding.cost?.replace('$', '').replace(',', '')) || 0;
                const totalCost = shares * cost;

                return (
                  <div
                    key={idx}
                    className="bg-[#252544] rounded-lg p-4 border border-zinc-700 hover:border-purple-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl font-bold text-purple-400">{holding.symbol}</div>
                      <div className="text-right">
                        <div className="text-sm text-zinc-400">持有</div>
                        <div className="font-semibold">{shares.toLocaleString()} 股</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">成本價</span>
                        <span className="font-medium">${cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-700">
                        <span className="text-zinc-400">總成本</span>
                        <span className="font-bold text-green-400">
                          ${totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Raw Content */}
            {rawContent && (
              <div className="bg-[#252544] rounded-lg p-4 border border-zinc-700">
                <h3 className="font-semibold mb-3">原始資料</h3>
                <pre className="text-xs text-zinc-300 overflow-x-auto bg-[#1a1a2e] p-3 rounded">
                  {rawContent}
                </pre>
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
          <p className="mb-2">
            <span className="font-semibold">💡 提示：</span>
            這是從 <code className="bg-zinc-800 px-2 py-1 rounded">memory/investing/current_holdings.md</code> 讀取的靜態資料。
          </p>
          <p className="text-zinc-400">
            未來可以整合即時報價 API 來顯示當前市值和盈虧。
          </p>
        </div>
      </div>
    </div>
  );
}
