import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Compass, Sparkles, Clock, ShieldAlert, Award, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function SignalDashboard() {
  const { currentSignal, signalHistory, candles, htfBias } = useTradingStore();

  const activeCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const currentPrice = activeCandle ? activeCandle.close : 0;

  // Calculate win rate & total profit for recent alerts
  const stats = React.useMemo(() => {
    let wins = 0;
    let losses = 0;
    let totalPnl = 0;

    signalHistory.forEach((sig) => {
      const entry = sig.price;
      if (!entry) return;

      const isLong = sig.recommendation.includes('LONG');
      const pnl = ((currentPrice - entry) / entry) * 100;
      const actualPnl = isLong ? pnl : -pnl;

      if (actualPnl >= 3.0) {
        wins++;
        totalPnl += 3.0;
      } else if (actualPnl <= -1.5) {
        losses++;
        totalPnl -= 1.5;
      } else {
        totalPnl += actualPnl;
      }
    });

    const total = wins + losses;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    return { wins, losses, winRate, totalPnl, total };
  }, [signalHistory, currentPrice]);

  // Render circular SVG gauge for the signal score
  const renderGauge = (score) => {
    const radius = 32;
    const circ = 2 * Math.PI * radius;
    
    // Normalize score to 0 to 100 range
    const normalizedVal = ((score + 100) / 200) * 100;
    const strokeDashoffset = circ - (normalizedVal / 100) * circ;

    let strokeColor = '#64748b'; // Neutral
    let bgColor = 'rgba(100, 116, 139, 0.05)';
    if (score >= 30) {
      strokeColor = score > 60 ? '#10b981' : '#eab308'; // Green/Yellow
      bgColor = score > 60 ? 'rgba(16, 185, 129, 0.04)' : 'rgba(234, 179, 8, 0.04)';
    } else if (score <= -30) {
      strokeColor = score < -60 ? '#ef4444' : '#f97316'; // Red/Orange
      bgColor = score < -60 ? 'rgba(239, 68, 68, 0.04)' : 'rgba(249, 115, 22, 0.04)';
    }

    return (
      <div className="relative flex items-center justify-center p-3 rounded-lg border border-slate-900/60" style={{ backgroundColor: bgColor }}>
        <svg width="80" height="80" className="transform -rotate-90">
          {/* Base track */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgba(30, 41, 59, 0.6)"
            strokeWidth="6"
          />
          {/* Active progress */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Score label inside circle */}
        <div className="absolute inset-y-0 flex flex-col items-center justify-center pt-1.5">
          <span className="text-lg font-mono font-extrabold tracking-tighter text-slate-100">
            {score > 0 ? '+' : ''}{score}
          </span>
          <span className="text-[7px] uppercase tracking-widest text-slate-500 font-bold">SCORE</span>
        </div>
      </div>
    );
  };

  // Helper for recommendation text colors
  const getRecommendationColor = (rec) => {
    if (rec.includes('STRONG LONG')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (rec.includes('WEAK LONG')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (rec.includes('STRONG SHORT')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (rec.includes('WEAK SHORT')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-slate-400 bg-slate-900 border-slate-800/80';
  };

  // Get alignment quality styling
  const getAlignmentStyle = (alignment) => {
    switch (alignment) {
      case 'HIGH':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50';
      case 'MODERATE':
        return 'text-blue-400 bg-blue-950/40 border-blue-900/50';
      case 'COUNTER_TREND':
        return 'text-rose-400 bg-rose-950/40 border-rose-900/50';
      default:
        return 'text-slate-400 bg-slate-950/60 border-slate-900/60';
    }
  };

  // Get indicator breakdown item row
  const renderBreakdownRow = (key, data) => {
    if (!data) return null;
    const { score, max, desc } = data;
    const isPos = score > 15;
    const isNeg = score < -15;
    
    let colorClass = 'text-slate-400';
    if (isPos) colorClass = 'text-emerald-400';
    if (isNeg) colorClass = 'text-rose-400';

    // Map keys nicely
    let label = key;
    if (key === 'volumeFlow') label = 'Volume & Flow';
    if (key === 'priceAction') label = 'Price Action';

    return (
      <div key={key} className="flex items-center justify-between border-b border-slate-900 pb-1.5 text-[10px]">
        <div className="flex flex-col">
          <span className="font-bold text-slate-300 capitalize">{label}</span>
          <span className="text-[8px] text-slate-500 mt-0.5">{desc}</span>
        </div>
        <span className={`font-mono font-bold ${colorClass}`}>
          {score > 0 ? '+' : ''}{score} / {max}
        </span>
      </div>
    );
  };

  // Simulated Trade performance calculator for the logger
  const calculateSimulatedTrade = (sig) => {
    const entry = sig.price;
    if (!entry || !currentPrice) return { class: 'text-slate-500', text: '0.00% (Locked)' };

    const pnl = ((currentPrice - entry) / entry) * 100;
    const isLong = sig.recommendation.includes('LONG');
    const actualPnl = isLong ? pnl : -pnl;
    
    const hitTp = actualPnl >= 3.0;
    const hitSl = actualPnl <= -1.5;

    if (hitTp) {
      return { class: 'text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20', text: 'TP HIT: +3.00%' };
    }
    if (hitSl) {
      return { class: 'text-rose-400 font-bold bg-rose-500/10 border-rose-500/20', text: 'SL HIT: -1.50%' };
    }

    return {
      class: actualPnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold',
      text: `${actualPnl >= 0 ? '+' : ''}${actualPnl.toFixed(2)}% (Active)`
    };
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 h-[710px] xl:h-[720px]">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-900 pb-2.5 select-none">
        <Compass className="text-indigo-400" size={15} />
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Quant Confluence Engine</span>
      </div>

      {currentSignal ? (
        <div className="flex flex-col gap-3 flex-grow overflow-hidden">
          
          {/* Top Block: Gauge + Scoring Verdict */}
          <div className="flex items-center gap-3 border-b border-slate-900 pb-2.5">
            {renderGauge(currentSignal.score)}
            <div className="flex flex-col gap-1 flex-grow">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider select-none">Scoring Verdict</span>
              <span className={`px-2 py-0.5 rounded border text-center text-[10px] font-extrabold w-full truncate ${getRecommendationColor(currentSignal.recommendation)}`}>
                {currentSignal.recommendation}
              </span>
              <span className="text-[9px] text-slate-400 leading-relaxed mt-0.5">
                {currentSignal.confluencePassed 
                  ? `Confluence Confirmed: ${currentSignal.confluenceCategories.length} domains agree.` 
                  : "No market consensus. Active domains are in conflict."}
              </span>
            </div>
          </div>

          {/* Regime & HTF Info Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-900/60 font-mono text-[9px]">
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase font-bold tracking-wider mb-0.5">Market Regime</span>
              <span className="text-slate-300 font-bold tracking-tight truncate" title={currentSignal.regimeDesc}>
                {currentSignal.regime.replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase font-bold tracking-wider mb-0.5">HTF Bias Context</span>
              <span className="text-slate-300 font-bold tracking-tight truncate" title={htfBias?.description}>
                {htfBias?.bias ? htfBias.bias.replace('_', ' ') : 'NEUTRAL'}
              </span>
            </div>
            <div className="flex flex-col col-span-2 mt-1.5">
              <span className="text-slate-500 uppercase font-bold tracking-wider mb-0.5">Alignment Quality</span>
              <span className={`px-2 py-0.5 rounded text-center border font-bold ${getAlignmentStyle(currentSignal.alignment)}`}>
                {currentSignal.alignment.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Explainability Strengths & Risks */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/20 rounded-lg">
            
            {/* Bullish Positives */}
            <div className="flex flex-col border border-slate-900/60 rounded-lg p-2 max-h-[110px] overflow-y-auto">
              <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 select-none border-b border-slate-900/80 pb-0.5">
                <CheckCircle2 size={10} className="text-emerald-500" />
                <span>Strengths</span>
              </div>
              {currentSignal.positives.length === 0 ? (
                <span className="text-[8px] text-slate-600 font-mono italic">No major bullish factors</span>
              ) : (
                <ul className="list-none flex flex-col gap-1 font-mono text-[8px] text-slate-300">
                  {currentSignal.positives.map((p, idx) => (
                    <li key={idx} className="leading-tight truncate">• {p}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Bearish Negatives */}
            <div className="flex flex-col border border-slate-900/60 rounded-lg p-2 max-h-[110px] overflow-y-auto">
              <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 select-none border-b border-slate-900/80 pb-0.5">
                <XCircle size={10} className="text-rose-500" />
                <span>Risks & Alerts</span>
              </div>
              {currentSignal.negatives.length === 0 ? (
                <span className="text-[8px] text-slate-600 font-mono italic">No major bearish risks</span>
              ) : (
                <ul className="list-none flex flex-col gap-1 font-mono text-[8px] text-slate-300">
                  {currentSignal.negatives.map((n, idx) => (
                    <li key={idx} className="leading-tight truncate">• {n}</li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          {/* Component breakdowns */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[150px] pr-1">
            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wider select-none mb-0.5">
              <Sparkles size={10} className="text-indigo-400" />
              <span>Regime-Weighted Breakdown</span>
            </div>
            {Object.keys(currentSignal.breakdown).map((key) => 
              renderBreakdownRow(key, currentSignal.breakdown[key])
            )}
          </div>

          {/* Signals Log */}
          <div className="flex flex-col border-t border-slate-900 pt-2 flex-grow overflow-hidden">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider select-none mb-1.5">
              <Clock size={10} className="text-blue-400" />
              <span>Alert History Log</span>
            </div>
            
            {/* Stats Summary */}
            {signalHistory.length > 0 && (
              <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1.5 rounded-md border border-slate-900/80 mb-1.5 select-none font-mono text-[8px]">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[7px] text-slate-500 font-bold uppercase">Alerts WR</span>
                  <span className="font-bold text-blue-400">
                    {stats.total > 0 ? `${stats.winRate.toFixed(1)}%` : '0.0%'}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border-x border-slate-900/80">
                  <span className="text-[7px] text-slate-500 font-bold uppercase">Simulated P&L</span>
                  <span className={`font-bold ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[7px] text-slate-500 font-bold uppercase">Total (W/L)</span>
                  <span className="font-bold text-slate-300">
                    {signalHistory.length} <span className="text-[7px] text-slate-500">({stats.wins}W)</span>
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex-grow overflow-y-auto flex flex-col gap-1.5 pr-1">
              {signalHistory.length === 0 ? (
                <div className="text-slate-600 text-[10px] font-mono text-center py-4 select-none">
                  No signals generated yet.
                </div>
              ) : (
                signalHistory.map((sig, i) => {
                  const trade = calculateSimulatedTrade(sig);
                  return (
                    <div key={sig.id || i} className="bg-slate-950/40 border border-slate-900/60 rounded p-1.5 flex items-center justify-between text-[9px] font-mono hover:border-slate-800/80 transition-all">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-slate-200">{sig.symbol}</span>
                          <span className={`px-1 rounded-[3px] text-[7px] border font-bold ${getRecommendationColor(sig.recommendation)}`}>
                            {sig.recommendation}
                          </span>
                        </div>
                        <span className="text-[7px] text-slate-500">Price: ${sig.price?.toLocaleString()} • {sig.timestamp}</span>
                      </div>
                      <div className={`px-1.5 py-0.5 rounded border border-slate-900/60 text-[7px] font-bold ${trade.class}`}>
                        {trade.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-600 text-xs gap-2 font-mono">
          <ShieldAlert size={24} className="text-slate-700 animate-pulse" />
          <span>Computing trading indicators...</span>
        </div>
      )}

    </div>
  );
}
