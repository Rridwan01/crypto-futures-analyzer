import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { BellRing, X, Volume2, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AlertsManager() {
  const { alerts, dismissAlert, clearAlerts, settings, setSymbol } = useTradingStore();

  const handleTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz tone
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Sound playback blocked by browser security:", e);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      
      {/* Container control header */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-xl pointer-events-auto">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold uppercase">
          <BellRing size={12} className="text-blue-400 animate-bounce" />
          <span>Active Alerts ({alerts.length})</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestSound}
            title="Test sound beep"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <Volume2 size={12} />
          </button>
          <button
            onClick={clearAlerts}
            className="text-[9px] text-slate-500 hover:text-slate-300 font-semibold px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Active toast alerts list */}
      <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
        {alerts.map((alert) => {
          const isLong = alert.recommendation.includes('LONG');
          const borderClass = isLong ? 'border-green-500/30 shadow-green-950/20' : 'border-red-500/30 shadow-red-950/20';
          const indicatorBg = isLong ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';

          return (
            <div
              key={alert.id}
              onClick={() => setSymbol(alert.symbol)}
              className={`bg-slate-900/95 border backdrop-blur p-3.5 rounded-lg shadow-lg flex gap-3 items-start justify-between pointer-events-auto animate-slide-in cursor-pointer hover:bg-slate-850/95 active:scale-[0.98] transition-all ${borderClass}`}
            >
              {/* Icon indicator */}
              <div className={`p-1.5 rounded-lg border ${indicatorBg}`}>
                {isLong ? (
                  <ArrowUpRight size={16} className="text-green-400" />
                ) : (
                  <ArrowDownRight size={16} className="text-red-400" />
                )}
              </div>

              {/* Message content */}
              <div className="flex-grow flex flex-col gap-0.5 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200">{alert.symbol}</span>
                  <span className="text-[9px] text-slate-500 font-mono">({alert.interval})</span>
                </div>
                <span className={`text-[10px] font-bold ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                  {alert.recommendation} (Score: {alert.score > 0 ? '+' : ''}{alert.score})
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">Price trigger: ${alert.price?.toLocaleString()}</span>
                <span className="text-[8px] text-slate-600 font-mono mt-0.5">{alert.timestamp}</span>
              </div>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissAlert(alert.id);
                }}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded hover:bg-slate-800 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
