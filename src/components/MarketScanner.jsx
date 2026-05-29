import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Radio } from 'lucide-react';

export default function MarketScanner() {
  const { scannerData, symbol, setSymbol } = useTradingStore();

  const handleSelectSymbol = (sym) => {
    if (sym !== symbol) {
      setSymbol(sym);
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 60) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 30) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (score <= -60) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (score <= -30) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-slate-400 bg-slate-900 border-slate-800/80';
  };

  const dataList = Object.values(scannerData).sort((a, b) => {
    const aStrong = a.recommendation.startsWith('STRONG');
    const bStrong = b.recommendation.startsWith('STRONG');
    if (aStrong && !bStrong) return -1;
    if (!aStrong && bStrong) return 1;
    
    const aWeak = a.recommendation.startsWith('WEAK');
    const bWeak = b.recommendation.startsWith('WEAK');
    if (aWeak && !bWeak) return -1;
    if (!aWeak && bWeak) return 1;

    return Math.abs(b.score) - Math.abs(a.score);
  });

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2 select-none">
        <div className="flex items-center gap-2">
          <Radio className="text-blue-500 animate-pulse" size={15} />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Multi-Asset Scanner</span>
        </div>
        <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500">
          Auto-Sync
        </span>
      </div>

      {/* Main List */}
      <div className="flex-grow overflow-y-auto pr-1">
        {dataList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 font-mono">
            <div className="w-4 h-4 border border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Scanning top markets...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Table Header */}
            <div className="grid grid-cols-5 text-[8px] uppercase font-bold text-slate-500 px-2 py-1 select-none">
              <span className="col-span-1">Asset</span>
              <span className="text-right">Price</span>
              <span className="text-right">24h%</span>
              <span className="text-right">Score</span>
              <span className="text-right">Verdict</span>
            </div>

            {/* Rows */}
            {dataList.map((item) => {
              const isActive = item.symbol === symbol;
              const isUp = item.change24h >= 0;
              const cleanLabel = item.symbol.replace('USDT', '');
              
              return (
                <div
                  key={item.symbol}
                  onClick={() => handleSelectSymbol(item.symbol)}
                  className={`grid grid-cols-5 items-center px-2 py-1.5 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/10 border-blue-500/40 text-white'
                      : 'bg-slate-950/20 border-slate-900/60 hover:border-slate-800/80 hover:bg-slate-900/20 text-slate-300'
                  }`}
                >
                  {/* Symbol */}
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="font-extrabold text-slate-100">{cleanLabel}</span>
                    {isActive && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                  </div>

                  {/* Price */}
                  <span className="text-right font-semibold text-slate-200">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>

                  {/* 24h change */}
                  <span className={`text-right font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{item.change24h.toFixed(2)}%
                  </span>

                  {/* Score */}
                  <span className="text-right font-bold">
                    <span className={item.score > 0 ? 'text-emerald-400' : item.score < 0 ? 'text-rose-400' : 'text-slate-400'}>
                      {item.score > 0 ? '+' : ''}{item.score}
                    </span>
                  </span>

                  {/* Verdict Badge */}
                  <div className="flex justify-end">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getScoreColorClass(item.score)}`}>
                      {item.recommendation.replace('STRONG ', 'S-').replace('WEAK ', 'W-')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
