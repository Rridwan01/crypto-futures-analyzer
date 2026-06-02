import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import ChartPanel from './ChartPanel';

export default function ScalperWorkspace() {
  const { currentSignal, htfBias, candles } = useTradingStore();

  const activeCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const currentPrice = activeCandle ? activeCandle.close : 0;

  // Format price helper based on magnitude
  const formatPrice = (val) => {
    if (!val) return '0.00';
    if (val >= 1000) {
      return Math.round(val).toLocaleString();
    } else if (val >= 10) {
      return val.toFixed(2);
    } else {
      return val.toFixed(4);
    }
  };

  if (!currentSignal) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-slate-500 text-xs font-mono select-none">
        <div className="w-4 h-4 border border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span>Initializing decision matrix...</span>
      </div>
    );
  }

  const score = currentSignal.score;
  const rawRec = currentSignal.recommendation;
  const isLong = rawRec.includes('LONG');
  const isShort = rawRec.includes('SHORT');
  
  // 1. Determine Simplified Signal Output
  let signalOutput = 'WAIT';
  let signalColor = 'text-slate-400 border-slate-900 bg-slate-950/30';
  if (isLong && currentSignal.confluencePassed) {
    signalOutput = 'LONG';
    signalColor = 'text-emerald-400 border-emerald-950/40 bg-emerald-950/20';
  } else if (isShort && currentSignal.confluencePassed) {
    signalOutput = 'SHORT';
    signalColor = 'text-rose-400 border-rose-955/40 bg-rose-955/20';
  }

  // 2. Determine Simplified Market Condition
  let marketCondition = 'Unclear';
  if (currentSignal.regime === 'TREND_EXPANSION') marketCondition = 'Trending';
  else if (currentSignal.regime === 'MEAN_REVERSION') marketCondition = 'Ranging';
  else if (currentSignal.regime === 'COMPRESSION') marketCondition = 'Squeezing';
  else if (currentSignal.regime === 'VOLATILE_DISTRIBUTION') marketCondition = 'Volatile';

  // 3. Determine Simplified HTF Bias Tag
  let htfTag = 'Neutral';
  let htfColor = 'text-slate-400 border-slate-900 bg-slate-950/30';
  if (currentSignal.alignment === 'HIGH') {
    htfTag = 'Supports';
    htfColor = 'text-emerald-450 border-emerald-950 bg-emerald-950/15';
  } else if (currentSignal.alignment === 'COUNTER_TREND') {
    htfTag = 'Conflicts';
    htfColor = 'text-rose-455 border-rose-955 bg-rose-955/15';
  }

  // 4. Determine Dynamic Risk Quality Tag
  let riskTag = 'Medium';
  let riskColor = 'text-yellow-450 border-yellow-950 bg-yellow-950/15';
  if (currentSignal.regime === 'COMPRESSION') {
    riskTag = 'Good';
    riskColor = 'text-emerald-450 border-emerald-950 bg-emerald-950/15';
  } else if (currentSignal.regime === 'VOLATILE_DISTRIBUTION') {
    riskTag = 'Bad';
    riskColor = 'text-rose-455 border-rose-955 bg-rose-955/15';
  }

  // 5. Generate Trade Plan targets (TP: 3%, SL: 1.5%)
  const hasPlan = signalOutput !== 'WAIT';
  const entryLower = isLong ? currentPrice * 0.9995 : currentPrice * 0.999;
  const entryUpper = isLong ? currentPrice * 1.001 : currentPrice * 1.0005;
  const stopLoss = isLong ? currentPrice * 0.985 : currentPrice * 1.015;
  const targetPrice = isLong ? currentPrice * 1.03 : currentPrice * 0.97;
  const rrRatio = '2.0'; // fixed 3% / 1.5% ratio

  return (
    <div className="flex flex-col gap-4 w-full select-none">
      
      {/* 2. Main Signal Decision Card */}
      <div className="glass-panel p-4 flex flex-col gap-3 border border-slate-900 bg-slate-950/40 select-none">
        
        {/* Metric header */}
        <div className="flex justify-between items-center text-[8.5px] font-bold font-mono tracking-widest text-slate-500 border-b border-slate-900/60 pb-2 select-none">
          <span>Scalper Confluence Decision</span>
          <span className="uppercase">{candles.length} Bars loaded</span>
        </div>

        {/* Signal Display Block */}
        <div className="flex items-center justify-between py-1">
          {/* Signal Output */}
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-0.5 select-none">Verdict Action</span>
            <span className={`px-4 py-1.5 text-2xl font-black tracking-widest rounded border font-mono ${signalColor}`}>
              {signalOutput}
            </span>
          </div>

          {/* Confidence Score Big Number */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-0.5 select-none">Confidence Score</span>
            <span className={`text-3xl font-extrabold font-mono tracking-tighter ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-rose-455' : 'text-slate-400'}`}>
              {score > 0 ? '+' : ''}{score}
            </span>
          </div>
        </div>

        {/* Muted Secondary Metadata list */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-900/80 pt-3 text-[9px] font-mono select-none">
          
          <div className="flex flex-col bg-slate-950/20 p-2 rounded border border-slate-900/50">
            <span className="text-slate-500 font-bold uppercase text-[7.5px] mb-0.5 select-none">Condition</span>
            <span className="text-slate-205 font-bold tracking-tight">{marketCondition}</span>
          </div>

          <div className="flex flex-col bg-slate-950/20 p-2 rounded border border-slate-900/50">
            <span className="text-slate-500 font-bold uppercase text-[7.5px] mb-0.5 select-none">HTF Bias</span>
            <span className={`font-bold tracking-tight rounded-sm px-1 text-center border ${htfColor}`}>
              {htfTag}
            </span>
          </div>

          <div className="flex flex-col bg-slate-950/20 p-2 rounded border border-slate-900/50">
            <span className="text-slate-500 font-bold uppercase text-[7.5px] mb-0.5 select-none">Risk Profile</span>
            <span className={`font-bold tracking-tight rounded-sm px-1 text-center border ${riskColor}`}>
              {riskTag}
            </span>
          </div>

        </div>

      </div>

      {/* 3. Trade Plan Box */}
      {hasPlan && (
        <div className="glass-panel p-4 flex flex-col gap-3 border border-slate-900 bg-slate-950/40 animate-slide-in font-mono">
          <div className="text-[8.5px] font-bold tracking-widest text-slate-500 border-b border-slate-900 pb-2 select-none uppercase">
            Execution Strategy Parameters
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-1 text-xs">
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500 select-none">ENTRY:</span>
              <span className="font-bold text-slate-100 font-mono">
                {formatPrice(entryLower)}–{formatPrice(entryUpper)}
              </span>
            </div>
            
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500 select-none">STOP LOSS:</span>
              <span className="font-bold text-rose-455 font-mono">
                {formatPrice(stopLoss)}
              </span>
            </div>
            
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500 select-none">TARGET:</span>
              <span className="font-bold text-emerald-450 font-mono">
                {formatPrice(targetPrice)}
              </span>
            </div>
            
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500 select-none">RISK/REWARD:</span>
              <span className="font-bold text-blue-400 font-mono">
                {rrRatio}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Chart View Container */}
      <div className="flex flex-col gap-2">
        <div className="text-[8.5px] font-bold font-mono tracking-widest text-slate-500 uppercase px-2 select-none">
          Verification Chart
        </div>
        <ChartPanel />
      </div>

    </div>
  );
}
