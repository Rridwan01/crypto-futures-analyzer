import React, { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, HistogramSeries } from 'lightweight-charts';
import { useTradingStore } from '../store/useTradingStore';
import { Eye, ShieldAlert, Award } from 'lucide-react';

export default function IndicatorPanels() {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef1 = useRef(null);
  const seriesRef2 = useRef(null);
  const seriesRef3 = useRef(null);
  
  const { candles, rsi, macd, atr, settings } = useTradingStore();
  const [activeTab, setActiveTab] = useState('rsi'); // 'rsi', 'macd', 'atr'

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // Remove old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'rgba(15, 23, 42, 0)' },
        textColor: '#94a3b8',
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.1)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.1)' }
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        autoScale: true
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        timeVisible: true
      }
    });
    chartRef.current = chart;

    const formattedTime = (c) => Math.floor(c.time / 1000);

    if (activeTab === 'rsi') {
      // 1. RSI Chart Setup
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 1.5,
        title: 'RSI'
      });
      seriesRef1.current = rsiSeries;

      // Draw horizontal bounds
      rsiSeries.createPriceLine({ price: 70, color: 'rgba(239, 68, 68, 0.4)', lineWidth: 1, lineStyle: 2, text: 'Overbought (70)' });
      rsiSeries.createPriceLine({ price: 30, color: 'rgba(34, 197, 94, 0.4)', lineWidth: 1, lineStyle: 2, text: 'Oversold (30)' });

      const rsiData = candles.map((c, i) => ({
        time: formattedTime(c),
        value: rsi[i]
      })).filter(d => d.value !== null && d.value !== undefined);
      
      rsiSeries.setData(rsiData);
      rsiSeries.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100
          }
        })
      });

    } else if (activeTab === 'macd') {
      // 2. MACD Chart Setup
      const macdLineSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.2, title: 'MACD' });
      const signalLineSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.2, title: 'Signal' });
      const histSeries = chart.addSeries(HistogramSeries, { title: 'Histogram' });
      
      seriesRef1.current = macdLineSeries;
      seriesRef2.current = signalLineSeries;
      seriesRef3.current = histSeries;

      const macdData = [];
      const signalData = [];
      const histData = [];

      candles.forEach((c, i) => {
        const item = macd[i];
        if (item && item.macd !== null && item.signal !== null && item.hist !== null) {
          const t = formattedTime(c);
          macdData.push({ time: t, value: item.macd });
          signalData.push({ time: t, value: item.signal });
          histData.push({
            time: t,
            value: item.hist,
            color: item.hist >= 0 
              ? (i > 0 && macd[i-1] && macd[i-1].hist !== null && item.hist > macd[i-1].hist ? 'rgba(34, 197, 94, 0.6)' : 'rgba(34, 197, 94, 0.35)')
              : (i > 0 && macd[i-1] && macd[i-1].hist !== null && item.hist < macd[i-1].hist ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.35)')
          });
        }
      });

      macdLineSeries.setData(macdData);
      signalLineSeries.setData(signalData);
      histSeries.setData(histData);

    } else if (activeTab === 'atr') {
      // 3. ATR Chart Setup
      const atrSeries = chart.addSeries(LineSeries, {
        color: '#f43f5e',
        lineWidth: 1.5,
        title: 'ATR'
      });
      seriesRef1.current = atrSeries;

      const atrData = candles.map((c, i) => ({
        time: formattedTime(c),
        value: atr[i]
      })).filter(d => d.value !== null && d.value !== undefined);

      atrSeries.setData(atrData);
    }

    // Resize observer
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [activeTab, candles, rsi, macd, atr]);

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 h-[180px] md:h-[240px]">
      
      {/* Tabs list */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 select-none">
        <div className="flex gap-2">
          {[
            { id: 'rsi', label: 'RSI & Divergences' },
            { id: 'macd', label: 'MACD Oscillator' },
            { id: 'atr', label: 'ATR Volatility' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700/80'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic mini values */}
        <div className="text-[10px] font-mono text-slate-400">
          {activeTab === 'rsi' && rsi.length > 0 && (
            <span>Latest RSI: <span className="text-purple-400 font-bold">{rsi[rsi.length - 1]?.toFixed(2)}</span></span>
          )}
          {activeTab === 'macd' && macd.length > 0 && macd[macd.length - 1] && (
            <span>
              Hist: <span className={macd[macd.length - 1].hist >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                {macd[macd.length - 1].hist?.toFixed(2)}
              </span>
            </span>
          )}
          {activeTab === 'atr' && atr.length > 0 && (
            <span>ATR (14): <span className="text-rose-400 font-bold">${atr[atr.length - 1]?.toFixed(2)}</span></span>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-grow w-full overflow-hidden relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>

    </div>
  );
}
