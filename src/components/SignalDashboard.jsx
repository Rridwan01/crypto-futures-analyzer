import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Compass, Sparkles, Clock, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default function SignalDashboard() {
  const { currentSignal, signalHistory, candles, htfBias } = useTradingStore();

  const activeCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const currentPrice = activeCandle ? activeCandle.close : 0;

  // Gauge scoring verdict colors
  const getRecommendationColor = (rec) => {
    if (rec.includes('STRONG LONG')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (rec.includes('WEAK LONG')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (rec.includes('STRONG SHORT')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (rec.includes('WEAK SHORT')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-slate-400 bg-slate-900 border-slate-800/80';
  };

  const getAlignmentStyle = (alignment) => {
    switch (alignment) {
      case 'HIGH':
        return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
      case 'MODERATE':
        return 'text-blue-400 bg-blue-950/20 border-blue-900/30';
      case 'COUNTER_TREND':
        return 'text-rose-400 bg-rose-950/20 border-rose-900/30';
      default:
        return 'text-slate-400 bg-slate-900/40 border-slate-900/60';
    }
  };

  // Render bidirectional confidence bar
  const renderDomainBar = (key, item) => {
    if (!item) return null;
    const { score, max, desc } = item;
    
    let label = key;
    if (key === 'volumeFlow') label = 'Volume & Flow';
    if (key === 'priceAction') label = 'Price Action';
    
    return (
      <div key={key} className="flex flex-col gap-0.5 text-[9px] font-mono">
        <div className="flex items-center justify-between leading-none">
          <span className="font-bold text-slate-400 capitalize">{label}</span>
          <span className={score > 15 ? 'text-emerald-400 font-bold' : score < -15 ? 'text-rose-400' : 'text-slate-500'}>
            {score > 0 ? '+' : ''}{score} <span className="text-[7px] text-slate-600">/ {max}w</span>
          </span>
        </div>
        
        {/* Bidirectional horizontal bar */}
        <div className="h-1.5 w-full bg-slate-950/80 rounded-sm relative overflow-hidden border border-slate-900/50">
          {score > 0 ? (
            <div 
              className="absolute h-full bg-emerald-500/70 transition-all" 
              style={{ left: '50%', width: `${Math.min(50, (score / 100) * 50)}%` }} 
            />
          ) : (
            <div 
              className="absolute h-full bg-rose-500/70 transition-all" 
              style={{ right: '50%', width: `${Math.min(50, (Math.abs(score) / 100) * 50)}%` }} 
            />
          )}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800" />
        </div>
      </div>
    );
  };

  // Simulated trade outcome calculator for the logger
  const calculateSimulatedTrade = (sig) => {
    const entry = sig.price;
    if (!entry || !currentPrice) return { class: 'text-slate-500', text: '0.00%' };

    const pnl = ((currentPrice - entry) / entry) * 100;
    const isLong = sig.recommendation.includes('LONG');
    const actualPnl = isLong ? pnl : -pnl;
    
    const hitTp = actualPnl >= 3.0;
    const hitSl = actualPnl <= -1.5;

    if (hitTp) {
      return { class: 'text-emerald-400 font-bold', text: 'TP: +3.00%' };
    }
    if (hitSl) {
      return { class: 'text-rose-400 font-bold', text: 'SL: -1.50%' };
    }

    return {
      class: actualPnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
      text: `${actualPnl >= 0 ? '+' : ''}${actualPnl.toFixed(2)}%`
    };
  };

  if (!currentSignal) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs gap-2 font-mono">
        <ShieldAlert size={20} className="text-slate-700 animate-pulse" />
        <span>Computing Confluence...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden select-none">
      
      {/* 1. Signal Intelligence Card */}
      <div className="glass-panel p-3.5 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <Compass className="text-indigo-400" size={13} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Signal Intelligence</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex flex-col items-center justify-center w-16 h-16 rounded-md bg-slate-950/60 border border-slate-900">
            <span className={`text-lg font-mono font-extrabold tracking-tighter ${currentSignal.score > 0 ? 'text-emerald-400' : currentSignal.score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {currentSignal.score > 0 ? '+' : ''}{currentSignal.score}
            </span>
            <span className="text-[6px] tracking-widest text-slate-500 font-bold font-mono">SCORE</span>
          </div>

          <div className="flex flex-col gap-1 flex-grow">
            <span className={`px-2 py-0.5 rounded border text-center text-[9px] font-extrabold tracking-wider font-mono ${getRecommendationColor(currentSignal.recommendation)}`}>
              {currentSignal.recommendation}
            </span>
            <span className={`px-2 py-0.5 rounded border text-center text-[8px] font-bold font-mono ${getAlignmentStyle(currentSignal.alignment)}`}>
              ALIGNMENT: {currentSignal.alignment}
            </span>
          </div>
        </div>

        {/* Explainability Strengths & Risks */}
        <div className="grid grid-cols-2 gap-2 mt-0.5">
          <div className="flex flex-col border border-slate-900/60 rounded p-1.5 max-h-[85px] overflow-y-auto bg-slate-950/30">
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest font-mono border-b border-slate-900 pb-0.5 mb-1">
              Confluences
            </span>
            {currentSignal.positives.length === 0 ? (
              <span className="text-[7px] text-slate-600 font-mono italic">None</span>
            ) : (
              <ul className="list-none flex flex-col gap-0.5 font-mono text-[7px] text-slate-300">
                {currentSignal.positives.slice(0, 3).map((p, idx) => (
                  <li key={idx} className="truncate select-text">• {p}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col border border-slate-900/60 rounded p-1.5 max-h-[85px] overflow-y-auto bg-slate-950/30">
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest font-mono border-b border-slate-900 pb-0.5 mb-1">
              Invalidations
            </span>
            {currentSignal.negatives.length === 0 ? (
              <span className="text-[7px] text-slate-600 font-mono italic">None</span>
            ) : (
              <ul className="list-none flex flex-col gap-0.5 font-mono text-[7px] text-slate-300">
                {currentSignal.negatives.slice(0, 3).map((n, idx) => (
                  <li key={idx} className="truncate select-text">• {n}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 2. Confluence Breakdown */}
      <div className="glass-panel p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <Sparkles className="text-amber-500" size={12} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Confluence Breakdown</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {Object.keys(currentSignal.breakdown).map((key) => 
            renderDomainBar(key, currentSignal.breakdown[key])
          )}
        </div>
      </div>

      {/* 3. Alerts Feed */}
      <div className="glass-panel p-3.5 flex flex-col gap-2.5 flex-grow overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <Clock className="text-blue-400" size={12} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Alerts Log Terminal</span>
        </div>

        <div className="flex-grow overflow-y-auto flex flex-col gap-1.5 pr-0.5 font-mono text-[9px]">
          {signalHistory.length === 0 ? (
            <div className="text-slate-700 text-center py-8 font-mono select-none">
              [SYSTEM] Awaiting market signals...
            </div>
          ) : (
            signalHistory.map((sig, i) => {
              const trade = calculateSimulatedTrade(sig);
              const isLong = sig.recommendation.includes('LONG');
              return (
                <div key={sig.id || i} className="border-b border-slate-900 pb-1.5 flex items-start justify-between gap-1 text-[9px] leading-tight hover:bg-slate-900/10 transition-colors">
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">[{sig.timestamp.split(' ')[0]}]</span>
                      <span className="font-extrabold text-slate-300">{sig.symbol}</span>
                      <span className={isLong ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {isLong ? '▲ LONG' : '▼ SHORT'}
                      </span>
                    </div>
                    <span className="text-slate-500 truncate">
                      Px: ${sig.price?.toLocaleString()} • Sc: {sig.score}
                    </span>
                  </div>
                  <span className={`font-bold shrink-0 ${trade.class}`}>
                    {trade.text}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
