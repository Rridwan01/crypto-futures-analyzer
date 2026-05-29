import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { ChevronDown, ChevronUp, Zap, Compass, Activity, ShieldAlert, Award } from 'lucide-react';

export function MobileSignalIntelligenceCard() {
  const { currentSignal, htfBias } = useTradingStore();

  if (!currentSignal) return null;

  const score = currentSignal.score;
  const rec = currentSignal.recommendation;
  const regime = currentSignal.regime.replace('_', ' ');
  const alignment = currentSignal.alignment;

  // Determine Risk Tag dynamically
  let riskTag = 'MEDIUM';
  let riskColor = 'text-yellow-400 bg-yellow-950/20 border-yellow-900/30';
  if (currentSignal.regime === 'COMPRESSION') {
    riskTag = 'LOW';
    riskColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
  } else if (currentSignal.regime === 'VOLATILE_DISTRIBUTION') {
    riskTag = 'HIGH';
    riskColor = 'text-rose-400 bg-rose-950/20 border-rose-900/30';
  }

  const getRecColor = (recommendation) => {
    if (recommendation.includes('STRONG LONG')) return 'text-emerald-400';
    if (recommendation.includes('STRONG SHORT')) return 'text-rose-400';
    if (recommendation.includes('WEAK LONG')) return 'text-emerald-500/80';
    if (recommendation.includes('WEAK SHORT')) return 'text-rose-500/80';
    return 'text-slate-400';
  };

  return (
    <div className="glass-panel p-3.5 flex flex-col gap-2.5 bg-slate-950/40 border border-slate-900/60 font-mono">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 select-none">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Signal Intelligence</span>
        <span className={`px-1.5 py-0.5 rounded-[3px] border text-[7.5px] font-bold ${riskColor}`}>
          RISK: {riskTag}
        </span>
      </div>

      {/* Signal Row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-500 uppercase tracking-wider select-none">Composite Signal</span>
          <span className={`text-xl font-extrabold tracking-tight ${getRecColor(rec)}`}>
            {rec.replace(' (No Confluence)', '')}
          </span>
        </div>

        {/* Confidence Gauge */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] text-slate-500 uppercase tracking-wider select-none">Confidence</span>
          <span className={`text-xl font-extrabold ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {score > 0 ? '+' : ''}{score}%
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-900/80 pt-2 text-[9px] text-slate-450 leading-relaxed">
        <div className="flex flex-col">
          <span className="text-slate-500 uppercase text-[7.5px] font-bold select-none">Market Regime</span>
          <span className="text-slate-300 font-bold uppercase tracking-tight truncate">{regime}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500 uppercase text-[7.5px] font-bold select-none">HTF Alignment</span>
          <span className="text-slate-300 font-bold uppercase tracking-tight truncate">{alignment}</span>
        </div>
      </div>
    </div>
  );
}

export function MobileConfluenceAccordion({ isProMode }) {
  const { currentSignal } = useTradingStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentSignal) return null;

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
          <span className={score > 15 ? 'text-emerald-450 font-bold' : score < -15 ? 'text-rose-450' : 'text-slate-500'}>
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
        
        {/* Detail description (visible if Pro Mode is enabled) */}
        {isProMode && (
          <span className="text-[7.5px] text-slate-500 font-sans italic truncate">{desc}</span>
        )}
      </div>
    );
  };

  const activeAccordionState = isOpen || isProMode;

  return (
    <div className="glass-panel p-3 bg-slate-950/40 border border-slate-900/60 flex flex-col gap-2">
      {/* Header Toggle */}
      <div 
        onClick={() => !isProMode && setIsOpen(!isOpen)}
        className={`flex items-center justify-between select-none ${isProMode ? 'cursor-default' : 'cursor-pointer hover:text-slate-200'}`}
      >
        <div className="flex items-center gap-1.5">
          <Compass className="text-amber-500" size={13} />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Confluence Breakdown</span>
        </div>
        {!isProMode && (
          <div>
            {activeAccordionState ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
          </div>
        )}
      </div>

      {/* Accordion Body */}
      {activeAccordionState && (
        <div className="flex flex-col gap-2 border-t border-slate-900/80 pt-2 animate-slide-in">
          {Object.keys(currentSignal.breakdown).map((key) => 
            renderDomainBar(key, currentSignal.breakdown[key])
          )}
        </div>
      )}
    </div>
  );
}

export function MobileMarketFlowPanel() {
  const { orderBook, cvdHistory, currentCvd } = useTradingStore();
  const [isOpen, setIsOpen] = useState(false);

  // Compute Order Book Imbalance
  const bids = orderBook.bids || [];
  const asks = orderBook.asks || [];
  
  const totalBidQty = bids.slice(0, 5).reduce((sum, item) => sum + item[1], 0);
  const totalAskQty = asks.slice(0, 5).reduce((sum, item) => sum + item[1], 0);
  const totalQty = totalBidQty + totalAskQty || 1;
  
  const bidPercent = (totalBidQty / totalQty) * 100;
  const askPercent = (totalAskQty / totalQty) * 100;
  const imbalance = ((totalBidQty - totalAskQty) / totalQty) * 100;

  const renderCvdSparkline = () => {
    if (!cvdHistory || cvdHistory.length < 5) return null;

    const w = 180;
    const h = 40;
    const pad = 2;

    const minCvd = Math.min(...cvdHistory);
    const maxCvd = Math.max(...cvdHistory);
    const range = maxCvd - minCvd || 1;

    const points = cvdHistory.map((val, idx) => {
      const x = pad + (idx / (cvdHistory.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (val - minCvd) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const fillPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;
    const isBullish = currentCvd >= 0;
    const strokeColor = isBullish ? '#10b981' : '#f43f5e';
    const gradientId = isBullish ? 'mini-cvd-green' : 'mini-cvd-red';

    return (
      <div className="flex flex-col gap-1 w-full bg-slate-950/60 p-2 rounded border border-slate-900">
        <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase select-none">
          <span>Real-time CVD Delta</span>
          <span className={isBullish ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
            {isBullish ? '+' : ''}{currentCvd.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </span>
        </div>
        <div className="relative">
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
              <linearGradient id="mini-cvd-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mini-cvd-red" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPoints} fill={`url(#${gradientId})`} />
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.2"
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
    <div className="glass-panel p-3 bg-slate-950/40 border border-slate-900/60 flex flex-col gap-2">
      {/* Header Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between select-none cursor-pointer hover:text-slate-200"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="text-cyan-500" size={13} />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Market Flow Panel</span>
        </div>
        <div>
          {isOpen ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
        </div>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div className="flex flex-col gap-2.5 border-t border-slate-900/80 pt-2 animate-slide-in font-mono text-[9px]">
          {/* Orderbook Imbalance */}
          <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded border border-slate-900">
            <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase select-none">
              <span>Book Imbalance</span>
              <span className={imbalance >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                {imbalance >= 0 ? '+' : ''}{imbalance.toFixed(1)}% {imbalance >= 0 ? 'Bids' : 'Asks'}
              </span>
            </div>
            
            {/* Split bar */}
            <div className="h-2 w-full bg-slate-900 rounded-sm relative overflow-hidden flex border border-slate-900/60">
              <div 
                className="bg-emerald-500/80 h-full transition-all" 
                style={{ width: `${bidPercent}%` }}
              />
              <div 
                className="bg-rose-500/80 h-full transition-all" 
                style={{ width: `${askPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[7px] text-slate-650 leading-none">
              <span>Bids: {bidPercent.toFixed(0)}%</span>
              <span>Asks: {askPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* CVD sparkline */}
          {renderCvdSparkline()}
        </div>
      )}
    </div>
  );
}
