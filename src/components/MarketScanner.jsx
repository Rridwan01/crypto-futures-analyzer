import React from 'react';
import { useTradingStore } from '../store/useTradingStore';

export default function MarketScanner() {
  const { scannerData, symbol, setSymbol } = useTradingStore();

  const handleSelectSymbol = (sym) => {
    if (sym !== symbol) {
      setSymbol(sym);
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 60) return 'text-emerald-400 border-emerald-950 bg-emerald-950/20';
    if (score >= 30) return 'text-yellow-400 border-yellow-950 bg-yellow-950/20';
    if (score <= -60) return 'text-rose-400 border-rose-950 bg-rose-950/20';
    if (score <= -30) return 'text-orange-400 border-orange-950 bg-orange-950/20';
    return 'text-slate-500 border-slate-900 bg-slate-950/40';
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

  if (dataList.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-650 text-[9px] font-mono select-none px-4 py-2">
        <div className="w-2.5 h-2.5 border border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Scanning top assets...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto w-full py-1.5 px-4 font-mono select-none scrollbar-none">
      {dataList.map((item) => {
        const isActive = item.symbol === symbol;
        const isUp = item.change24h >= 0;
        const cleanLabel = item.symbol.replace('USDT', '');
        
        return (
          <div
            key={item.symbol}
            onClick={() => handleSelectSymbol(item.symbol)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded border text-[9px] font-mono shrink-0 transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-950/30 border-blue-500/40 text-white shadow-sm shadow-blue-500/5'
                : 'bg-slate-950/45 border-slate-900/60 hover:border-slate-800/80 hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Symbol */}
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-slate-200">{cleanLabel}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />}
            </div>

            {/* Price */}
            <span className="text-slate-300 font-semibold">
              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            {/* 24h change */}
            <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? '↑' : '↓'}{Math.abs(item.change24h).toFixed(1)}%
            </span>

            {/* Score Badge */}
            <span className={`px-1 rounded-[2px] text-[7.5px] font-extrabold border leading-none font-mono ${getScoreColorClass(item.score)}`}>
              {item.score > 0 ? '+' : ''}{item.score} ({item.recommendation.replace('STRONG ', 'S-').replace('WEAK ', 'W-').replace(' (No Confluence)', '')})
            </span>
          </div>
        );
      })}
    </div>
  );
}
