import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Layers, Zap } from 'lucide-react';

export default function OrderBookFlow() {
  const { orderBook, cvdHistory, currentCvd, candles } = useTradingStore();

  const activeBids = orderBook.bids || [];
  const activeAsks = orderBook.asks || [];
  const latestPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  // Calculate spreads
  const highestBid = activeBids.length > 0 ? activeBids[0][0] : 0;
  const lowestAsk = activeAsks.length > 0 ? activeAsks[0][0] : 0;
  const spread = lowestAsk - highestBid;
  const spreadPercent = lowestAsk > 0 ? (spread / lowestAsk) * 100 : 0;

  // Wall detection: calculate mean and standard deviation of sizes
  const allSizes = [...activeBids, ...activeAsks].map(item => item[1]);
  const avgSize = allSizes.length > 0 ? allSizes.reduce((a, b) => a + b, 0) / allSizes.length : 0;
  
  // A "wall" represents any order size > 2.5x the average order size
  const WALL_THRESHOLD = Math.max(avgSize * 2.2, 5.0);

  // Render SVG Area for real-time CVD History
  const renderCvdChart = () => {
    if (!cvdHistory || cvdHistory.length < 5) {
      return (
        <div className="h-28 flex items-center justify-center text-slate-600 text-xs font-mono">
          Awaiting trade flows...
        </div>
      );
    }

    const w = 240;
    const h = 100;
    const pad = 5;

    const minCvd = Math.min(...cvdHistory);
    const maxCvd = Math.max(...cvdHistory);
    const range = maxCvd - minCvd || 1;

    const points = cvdHistory.map((val, idx) => {
      const x = pad + (idx / (cvdHistory.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (val - minCvd) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const fillPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

    // Color gradient based on net current direction
    const isBullish = currentCvd >= 0;
    const strokeColor = isBullish ? '#22c55e' : '#ef4444';
    const gradientId = isBullish ? 'cvd-green' : 'cvd-red';

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
          <span>REAL-TIME CVD FLOWS</span>
          <span className={isBullish ? 'text-green-400' : 'text-red-400'}>
            {isBullish ? '+' : ''}{currentCvd.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900 relative">
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <defs>
              <linearGradient id="cvd-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="cvd-red" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Draw Area */}
            <polygon points={fillPoints} fill={`url(#${gradientId})`} />
            {/* Draw Line */}
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    );
  };

  const renderOrderList = (list, isBid) => {
    if (list.length === 0) return <tr><td colSpan="3" className="text-center py-2 text-slate-600">No data</td></tr>;
    
    // Find maximum total quantity for scaling bars
    const maxQty = Math.max(...list.map(item => item[1]), 1);
    
    // For asks, we show the top 8 levels (reversed, so closest ask to spread is at the bottom of asks section)
    const displayList = isBid ? list.slice(0, 8) : [...list.slice(0, 8)].reverse();

    return displayList.map(([price, size], index) => {
      const pctWidth = (size / maxQty) * 100;
      const isWall = size >= WALL_THRESHOLD;
      const priceColor = isBid ? 'text-green-400' : 'text-red-400';
      
      return (
        <tr key={index} className={`relative group h-6 text-[10px] font-mono hover:bg-slate-800/40 transition-colors`}>
          {/* Depth visual bar */}
          <td className="absolute inset-y-0 right-0 pointer-events-none opacity-[0.06] transition-all" style={{
            width: `${pctWidth}%`,
            backgroundColor: isBid ? '#22c55e' : '#ef4444'
          }} />
          
          {/* Columns */}
          <td className={`pl-2 font-semibold ${priceColor}`}>
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td className="text-right text-slate-300">
            {size.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </td>
          <td className="text-right pr-2 text-slate-400 font-medium">
            {isWall ? (
              <span className={`px-1 rounded text-[8px] font-bold ${
                isBid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                WALL
              </span>
            ) : (
              (price * size).toLocaleString(undefined, { maximumFractionDigits: 0 })
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 h-[780px] md:h-[440px]">
      
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Layers className="text-cyan-500" size={16} />
        <span className="text-sm font-semibold text-slate-200">Order Flow & CVD Analyzer</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto md:overflow-hidden">
        
        {/* Left Column: Order Book Table */}
        <div className="flex flex-col h-full border border-slate-800/50 rounded-lg p-2 bg-slate-900/30">
          <div className="grid grid-cols-3 text-[9px] uppercase font-bold text-slate-500 px-2 pb-1 border-b border-slate-900">
            <span>Price (USDT)</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total ($)</span>
          </div>

          <div className="flex-grow overflow-hidden flex flex-col justify-between">
            {/* Asks Table */}
            <table className="w-full">
              <tbody>
                {renderOrderList(activeAsks, false)}
              </tbody>
            </table>

            {/* Spread Indicator */}
            <div className="bg-slate-950/70 border-y border-slate-900 py-1 flex items-center justify-between px-2 font-mono text-[10px]">
              <span className="font-semibold text-slate-100">
                ${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-slate-500">
                Spread: <span className="text-slate-300">${spread.toFixed(2)} ({spreadPercent.toFixed(3)}%)</span>
              </span>
            </div>

            {/* Bids Table */}
            <table className="w-full">
              <tbody>
                {renderOrderList(activeBids, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: CVD Analyzer */}
        <div className="flex flex-col justify-between h-full gap-4">
          {/* CVD Chart Panel */}
          {renderCvdChart()}

          {/* Wall Highlights & Stats */}
          <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-lg flex flex-col gap-2 flex-grow">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
              <Zap size={12} className="text-yellow-400" />
              <span>Liquidity Profiles</span>
            </div>
            
            <div className="flex flex-col gap-2 text-[10px]">
              <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-400">
                <span>Avg depth order size</span>
                <span className="font-mono text-slate-200 font-bold">{avgSize.toFixed(3)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-400">
                <span>Wall criteria threshold</span>
                <span className="font-mono text-slate-200 font-bold">{WALL_THRESHOLD.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Bids Liquidity</span>
                <span className="font-mono text-green-400 font-bold">
                  {activeBids.slice(0, 10).reduce((sum, item) => sum + item[0] * item[1], 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT
                </span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>Total Asks Liquidity</span>
                <span className="font-mono text-red-400 font-bold">
                  {activeAsks.slice(0, 10).reduce((sum, item) => sum + item[0] * item[1], 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
