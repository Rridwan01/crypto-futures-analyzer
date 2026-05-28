import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

const PRESETS = [
  { name: 'BTCUSDT', label: 'BTC' },
  { name: 'ETHUSDT', label: 'ETH' },
  { name: 'SOLUSDT', label: 'SOL' },
  { name: 'BNBUSDT', label: 'BNB' },
  { name: 'ARBUSDT', label: 'ARB' },
  { name: 'DOGEUSDT', label: 'DOGE' }
];

export default function SymbolSwitcher() {
  const { symbol, setSymbol, ticker24h } = useTradingStore();
  const [inputVal, setInputVal] = useState('');
  
  const handleSelect = (sym) => {
    if (sym !== symbol) {
      setSymbol(sym);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      let formatted = inputVal.trim().toUpperCase();
      if (!formatted.endsWith('USDT')) {
        formatted += 'USDT';
      }
      handleSelect(formatted);
      setInputVal('');
    }
  };

  const pct = ticker24h.priceChangePercent || 0;
  const isUp = pct >= 0;

  return (
    <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Preset List */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">Markets:</span>
        {PRESETS.map((preset) => {
          const isActive = preset.name === symbol;
          return (
            <button
              key={preset.name}
              onClick={() => handleSelect(preset.name)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Ticker Search + Info */}
      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
        {/* Live Active Symbol Badge */}
        <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-sm font-bold tracking-tight text-white">{symbol}</span>
          <span
            className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
              isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isUp ? '+' : ''}{pct.toFixed(2)}%
          </span>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            placeholder="Search symbol (e.g. XRP)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="bg-slate-950/80 text-sm text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500/50 w-full sm:w-56 transition-all"
          />
          <Search className="absolute left-2.5 text-slate-500" size={14} />
        </form>
      </div>
    </div>
  );
}
