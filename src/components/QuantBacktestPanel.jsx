import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Play, TrendingUp, HelpCircle, Award, Percent, DollarSign, Activity } from 'lucide-react';

export default function QuantBacktestPanel() {
  const { backtestResults, runHistoricalBacktest, symbol, interval } = useTradingStore();

  const handleRunBacktest = (e) => {
    e.preventDefault();
    runHistoricalBacktest();
  };

  const renderEquityCurve = () => {
    if (!backtestResults || !backtestResults.equityCurve || backtestResults.equityCurve.length < 2) {
      return (
        <div className="h-[120px] flex items-center justify-center text-slate-600 text-xs font-mono">
          No equity history available. Run backtest to populate.
        </div>
      );
    }

    const curve = backtestResults.equityCurve;
    const w = 400;
    const h = 120;
    const padding = 8;

    const minEq = Math.min(...curve);
    const maxEq = Math.max(...curve);
    const range = maxEq - minEq || 1;

    const points = curve.map((val, idx) => {
      const x = padding + (idx / (curve.length - 1)) * (w - 2 * padding);
      const y = padding + (1 - (val - minEq) / range) * (h - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const fillPoints = `${padding},${h - padding} ${points} ${w - padding},${h - padding}`;
    const isProfitable = curve[curve.length - 1] >= 100;
    const strokeColor = isProfitable ? '#10b981' : '#f43f5e';
    const gradientId = isProfitable ? 'eq-green' : 'eq-red';

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
          <span>Equity Growth (Compounded, Base 100)</span>
          <span className={isProfitable ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
            {isProfitable ? '+' : ''}{(curve[curve.length - 1] - 100).toFixed(2)}%
          </span>
        </div>
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 relative">
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
              <linearGradient id="eq-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="eq-red" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPoints} fill={`url(#${gradientId})`} />
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 h-[680px] md:h-[450px]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="text-emerald-500" size={16} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Quant Backtesting Panel</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Simulated historical strategy replay</span>
          </div>
        </div>
        <button
          onClick={handleRunBacktest}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-900/60 hover:border-emerald-700 text-emerald-400 font-bold text-[10px] uppercase rounded-md transition-colors"
        >
          <Play size={10} fill="currentColor" />
          <span>Re-Run</span>
        </button>
      </div>

      {backtestResults ? (
        <div className="flex flex-col gap-4 flex-grow overflow-hidden">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            
            <div className="bg-slate-950/60 border border-slate-900/60 rounded-md p-2 flex flex-col items-center justify-center">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Trades</span>
              <span className="text-xs font-mono font-bold text-slate-200">{backtestResults.trades.length}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-900/60 rounded-md p-2 flex flex-col items-center justify-center">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Win Rate</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {backtestResults.winRate.toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-900/60 rounded-md p-2 flex flex-col items-center justify-center">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Profit Factor</span>
              <span className="text-xs font-mono font-bold text-blue-400">
                {backtestResults.profitFactor.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-900/60 rounded-md p-2 flex flex-col items-center justify-center">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Max DD</span>
              <span className="text-xs font-mono font-bold text-rose-400">
                -{backtestResults.maxDrawdown.toFixed(2)}%
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-900/60 rounded-md p-2 flex flex-col items-center justify-center">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Sharpe</span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {backtestResults.sharpeRatio.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-900/60 rounded-md p-2 flex flex-col items-center justify-center">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Return</span>
              <span className={`text-xs font-mono font-bold ${backtestResults.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {backtestResults.netProfit >= 0 ? '+' : ''}{backtestResults.netProfit.toFixed(2)}%
              </span>
            </div>

          </div>

          {/* Equity Chart & Historical Table Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto md:overflow-hidden">
            {/* Left: Equity Growth Curve */}
            <div className="flex flex-col justify-between">
              {renderEquityCurve()}
              <div className="text-[8px] text-slate-500 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-900/60 mt-2">
                <span className="font-bold text-slate-400 uppercase mr-1">Logic Details:</span>
                Simulates execution over last 500 bars on the <span className="font-bold text-slate-300 font-mono">{symbol} {interval}</span> timeframe. Position parameters: 3% Take Profit (TP), 1.5% Stop Loss (SL). Assumes zero fee slippage.
              </div>
            </div>

            {/* Right: Historical Trades Table */}
            <div className="flex flex-col h-full overflow-hidden border border-slate-900/80 rounded-lg">
              <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center select-none">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Historical Trades</span>
                <span className="text-[8px] text-slate-500 font-mono">{backtestResults.trades.length} entries</span>
              </div>
              <div className="flex-grow overflow-y-auto bg-slate-950/40">
                {backtestResults.trades.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                    No trades executed in backtest.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[10px] font-mono">
                    <thead className="bg-slate-950/80 sticky top-0 text-slate-500 border-b border-slate-900/80 select-none">
                      <tr>
                        <th className="px-3 py-2 font-bold uppercase text-[8px]">Type</th>
                        <th className="px-2 py-2 font-bold uppercase text-[8px]">Entry</th>
                        <th className="px-2 py-2 font-bold uppercase text-[8px]">Exit</th>
                        <th className="px-3 py-2 font-bold uppercase text-[8px] text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestResults.trades.map((t, idx) => (
                        <tr key={t.id || idx} className="hover:bg-slate-900/40 border-b border-slate-900/50">
                          <td className="px-3 py-1.5 font-bold">
                            <span className={t.type === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-slate-300">
                            ${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </td>
                          <td className="px-2 py-1.5 text-slate-400">
                            ${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </td>
                          <td className={`px-3 py-1.5 text-right font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-500 text-xs gap-2 font-mono">
          <HelpCircle size={28} className="text-slate-700 animate-pulse" />
          <span>Awaiting backtest simulation...</span>
        </div>
      )}

    </div>
  );
}
