import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Flame, Compass, Activity, Percent } from 'lucide-react';

export default function SentimentBar() {
  const {
    fearAndGreed,
    historicalFearAndGreed,
    fundingRate,
    openInterest,
    openInterestChange,
    ticker24h,
    symbol
  } = useTradingStore();

  // Helper for F&G categorization colors
  const getFngColorClass = (val) => {
    if (val <= 25) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (val <= 45) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    if (val <= 55) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    if (val <= 75) return 'text-green-400 bg-green-400/10 border-green-400/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  // Generate SVG points for F&G historical sparkline
  const renderSparkline = () => {
    if (!historicalFearAndGreed || historicalFearAndGreed.length < 2) return null;
    const values = historicalFearAndGreed.map(item => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const width = 80;
    const height = 18;
    const padding = 2;
    
    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const lastX = padding + (width - 2 * padding);
    const lastY = padding + (1 - (values[values.length - 1] - min) / range) * (height - 2 * padding);

    return (
      <svg width={width} height={height} className="overflow-visible ml-2 inline-block">
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Draw a glowing dot on the last point */}
        <circle
          cx={lastX}
          cy={lastY}
          r="2.5"
          fill="#60a5fa"
          className="animate-pulse"
        />
      </svg>
    );
  };

  // Format Large numbers (OI/Volume)
  const formatNumber = (num) => {
    if (!num) return '$0.00';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="glass-panel p-3.5 grid grid-cols-2 md:flex md:flex-wrap md:items-center justify-between gap-4 md:gap-6 text-xs text-slate-300">
      
      {/* Fear & Greed Index */}
      <div className="flex items-center gap-2.5 md:border-r border-slate-900 md:pr-6 last:border-0 col-span-1">
        <Compass className="text-blue-400 shrink-0" size={15} />
        <div>
          <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Fear & Greed</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`px-1.5 py-0.5 rounded-[3.5px] border text-[10px] font-bold ${getFngColorClass(fearAndGreed.value)}`}>
              {fearAndGreed.value}
            </span>
            {renderSparkline()}
          </div>
        </div>
      </div>

      {/* Funding Rate */}
      <div className="flex items-center gap-2.5 md:border-r border-slate-900 md:pr-6 last:border-0 col-span-1">
        <Percent className="text-indigo-400 shrink-0" size={14} />
        <div>
          <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Funding Rate</div>
          <div className={`mt-0.5 font-mono font-bold text-xs ${fundingRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {(fundingRate * 100).toFixed(4)}%
          </div>
        </div>
      </div>

      {/* Open Interest */}
      <div className="flex items-center gap-2.5 md:border-r border-slate-900 md:pr-6 last:border-0 col-span-1">
        <Activity className="text-cyan-400 shrink-0" size={14} />
        <div>
          <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Open Interest</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-xs font-bold text-slate-100">
              {formatNumber(openInterest)}
            </span>
            <span className={`text-[9px] font-bold ${openInterestChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(openInterestChange * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Ticker 24h details */}
      <div className="flex items-center gap-4 col-span-1 md:flex-grow-0 justify-between md:justify-end">
        <div className="text-right">
          <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider font-mono">24h Vol</div>
          <div className="font-mono mt-0.5 text-slate-205 font-bold text-xs">
            {formatNumber(ticker24h.volume * (ticker24h.lastPrice || 1)).replace('.00', '')}
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider font-mono">24h High/Low</div>
          <div className="font-mono mt-0.5 text-xs text-slate-300">
            <span className="text-emerald-450">${ticker24h.high?.toLocaleString()}</span>
            <span className="text-slate-700 mx-1">/</span>
            <span className="text-rose-450">${ticker24h.low?.toLocaleString()}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
