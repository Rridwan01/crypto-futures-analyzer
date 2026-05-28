import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Compass, Sparkles, TrendingUp, TrendingDown, Clock, ShieldAlert } from 'lucide-react';

export default function SignalDashboard() {
  const { currentSignal, signalHistory, candles } = useTradingStore();

  const activeCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const currentPrice = activeCandle ? activeCandle.close : 0;

  // Render circular SVG gauge for the signal score
  const renderGauge = (score) => {
    // Map score -100 to 100 into a circular stroke
    // Circle radius = 40, circumference = 2 * pi * r = 251.2
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    
    // Normalize score to 0 to 100 range for the progress indicator
    // -100 corresponds to red, 100 corresponds to green
    const normalizedVal = ((score + 100) / 200) * 100;
    const strokeDashoffset = circ - (normalizedVal / 100) * circ;

    // Get color based on recommendation
    let strokeColor = '#64748b'; // Neutral
    let bgColor = 'rgba(100, 116, 139, 0.1)';
    if (score >= 30) {
      strokeColor = score > 60 ? '#22c55e' : '#eab308'; // Green/Yellow
      bgColor = score > 60 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(234, 179, 8, 0.05)';
    } else if (score <= -30) {
      strokeColor = score < -60 ? '#ef4444' : '#f97316'; // Red/Orange
      bgColor = score < -60 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(249, 115, 22, 0.05)';
    }

    return (
      <div className="relative flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800/80 bg-slate-950/40" style={{ backgroundColor: bgColor }}>
        <svg width="120" height="120" className="transform -rotate-90">
          {/* Base track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(30, 41, 59, 0.8)"
            strokeWidth="8"
          />
          {/* Active progress */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Score label inside circle */}
        <div className="absolute inset-y-0 flex flex-col items-center justify-center pt-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-100">
            {score > 0 ? '+' : ''}{score}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">SCORE</span>
        </div>
      </div>
    );
  };

  // Helper for recommendation text colors
  const getRecommendationColor = (rec) => {
    if (rec.includes('STRONG LONG')) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (rec.includes('WEAK LONG')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (rec.includes('STRONG SHORT')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (rec.includes('WEAK SHORT')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-slate-400 bg-slate-800/40 border-slate-700/50';
  };

  // Get indicator breakdown item row
  const renderBreakdownRow = (key, data) => {
    if (!data) return null;
    const { score, max, direction, desc } = data;
    const isPos = score > 0;
    const isNeg = score < 0;
    
    let colorClass = 'text-slate-400';
    if (isPos) colorClass = 'text-green-400';
    if (isNeg) colorClass = 'text-red-400';

    return (
      <div key={key} className="flex items-center justify-between border-b border-slate-900 pb-2 text-[10px]">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-300 capitalize">{key === 'ma' ? 'MA Alignment' : key === 'sentiment' ? 'Sentiment index' : key}</span>
          <span className="text-[9px] text-slate-500 mt-0.5">{desc}</span>
        </div>
        <span className={`font-mono font-bold ${colorClass}`}>
          {score > 0 ? '+' : ''}{score} / {max}
        </span>
      </div>
    );
  };

  // Simulated Trade performance calculator
  const calculateSimulatedTrade = (sig) => {
    const entry = sig.price;
    if (!entry || !currentPrice) return { class: 'text-slate-500', text: '0.00% (Locked)' };

    const pnl = ((currentPrice - entry) / entry) * 100;
    const isLong = sig.recommendation.includes('LONG');
    const actualPnl = isLong ? pnl : -pnl;
    
    // Simulate hitting targets (TP: 3%, SL: 1.5%)
    const hitTp = actualPnl >= 3.0;
    const hitSl = actualPnl <= -1.5;

    if (hitTp) {
      return { class: 'text-green-400 font-bold bg-green-500/10 border-green-500/20', text: 'TP HIT: +3.00%' };
    }
    if (hitSl) {
      return { class: 'text-red-400 font-bold bg-red-500/10 border-red-500/20', text: 'SL HIT: -1.50%' };
    }

    return {
      class: actualPnl >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold',
      text: `${actualPnl >= 0 ? '+' : ''}${actualPnl.toFixed(2)}% (Active)`
    };
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 h-[710px]">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Compass className="text-purple-500" size={16} />
        <span className="text-sm font-semibold text-slate-200">Signal Composite Engine</span>
      </div>

      {currentSignal ? (
        <div className="flex flex-col gap-4 flex-grow overflow-hidden">
          {/* Gauge + Status Title */}
          <div className="flex items-center gap-4 border-b border-slate-900 pb-3">
            {renderGauge(currentSignal.score)}
            <div className="flex flex-col gap-1.5 flex-grow">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scoring Verdict</span>
              <span className={`px-2.5 py-1 rounded-md border text-center text-xs font-bold w-full truncate ${getRecommendationColor(currentSignal.recommendation)}`}>
                {currentSignal.recommendation}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                {currentSignal.confluencePassed 
                  ? `Confluence Confirmed: ${currentSignal.confluenceCategories.length} categories aligned.` 
                  : "Neutral state. Categories have conflicting directions."}
              </span>
            </div>
          </div>

          {/* Component breakdowns */}
          <div className="flex flex-col gap-2 flex-grow overflow-y-auto pr-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase mb-1">
              <Sparkles size={12} className="text-purple-400" />
              <span>Weight breakdowns</span>
            </div>
            {Object.keys(currentSignal.breakdown).map((key) => 
              renderBreakdownRow(key, currentSignal.breakdown[key])
            )}
          </div>

          {/* Signals Log */}
          <div className="flex flex-col border-t border-slate-900 pt-3 h-[240px]">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase mb-2">
              <Clock size={12} className="text-blue-400" />
              <span>Confluence Log</span>
            </div>
            
            <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1">
              {signalHistory.length === 0 ? (
                <div className="text-slate-600 text-xs font-mono text-center py-6">
                  No signals generated yet.
                </div>
              ) : (
                signalHistory.map((sig, i) => {
                  const trade = calculateSimulatedTrade(sig);
                  return (
                    <div key={sig.id || i} className="bg-slate-950/40 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between text-[10px] font-mono hover:border-slate-800/80 transition-all">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-200">{sig.symbol}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] border font-bold ${getRecommendationColor(sig.recommendation)}`}>
                            {sig.recommendation}
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-500">Entry: ${sig.price?.toLocaleString()} at {sig.timestamp}</span>
                      </div>
                      <div className={`px-2 py-1 rounded border border-slate-900 text-[8px] font-bold ${trade.class}`}>
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
        <div className="flex-grow flex flex-col items-center justify-center text-slate-500 text-xs gap-2 font-mono">
          <ShieldAlert size={28} className="text-slate-600" />
          <span>Computing trading indicators...</span>
        </div>
      )}

    </div>
  );
}
