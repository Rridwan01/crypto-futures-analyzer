import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import { useTradingStore } from '../store/useTradingStore';
import { Eye, EyeOff, Activity } from 'lucide-react';

export default function ChartPanel() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  // Series references
  const candleSeriesRef = useRef(null);
  const markersPluginRef = useRef(null);
  const ema9SeriesRef = useRef(null);
  const ema21SeriesRef = useRef(null);
  const ema55SeriesRef = useRef(null);
  const sma200SeriesRef = useRef(null);
  const vwapSeriesRef = useRef(null);
  const bbUpperSeriesRef = useRef(null);
  const bbMiddleSeriesRef = useRef(null);
  const bbLowerSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  
  // Custom price lines for volume profile
  const pocLineRef = useRef(null);
  const vahLineRef = useRef(null);
  const valLineRef = useRef(null);

  const {
    candles,
    ema9,
    ema21,
    ema55,
    sma200,
    vwap,
    bb,
    patterns,
    rsiDivergences,
    volumeProfile,
    settings,
    updateSettings,
    symbol,
    interval
  } = useTradingStore();

  const [hoverData, setHoverData] = useState(null);

  // Initialize the Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'rgba(15, 23, 42, 0)' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.15)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.15)' }
      },
      crosshair: {
        mode: 1 // Magnet mode
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        autoScale: true
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    });
    candleSeriesRef.current = candleSeries;
    
    // Create markers plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries);

    // 2. Technical overlays
    ema9SeriesRef.current = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.2, title: 'EMA 9' });
    ema21SeriesRef.current = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.2, title: 'EMA 21' });
    ema55SeriesRef.current = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1.2, title: 'EMA 55' });
    sma200SeriesRef.current = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1.5, title: 'SMA 200' });
    vwapSeriesRef.current = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1.2, title: 'VWAP' });

    // Bollinger Bands
    bbUpperSeriesRef.current = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.5)', lineWidth: 1, lineStyle: 2, title: 'BB Upper' });
    bbMiddleSeriesRef.current = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.3)', lineWidth: 1, lineStyle: 2, title: 'BB Middle' });
    bbLowerSeriesRef.current = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.5)', lineWidth: 1, lineStyle: 2, title: 'BB Lower' });

    // 3. Volume Series (separate price scale overlay at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#334155',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume', // Render on separate scale
    });
    
    chart.priceScale('volume').applyOptions({
      alignLabels: false,
      borderVisible: false
    });
    
    // Scale volume pane to bottom 20% of chart
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    });
    
    volumeSeriesRef.current = volumeSeries;

    // Tooltip / Crosshair listener
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || param.point === undefined || param.seriesData.size === 0) {
        setHoverData(null);
        return;
      }

      const candleData = param.seriesData.get(candleSeries);
      const ema9Val = param.seriesData.get(ema9SeriesRef.current);
      const ema21Val = param.seriesData.get(ema21SeriesRef.current);
      const ema55Val = param.seriesData.get(ema55SeriesRef.current);
      const sma200Val = param.seriesData.get(sma200SeriesRef.current);
      const vwapVal = param.seriesData.get(vwapSeriesRef.current);

      if (candleData) {
        setHoverData({
          time: param.time,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          ema9: ema9Val?.value || null,
          ema21: ema21Val?.value || null,
          ema55: ema55Val?.value || null,
          sma200: sma200Val?.value || null,
          vwap: vwapVal?.value || null
        });
      }
    });

    // Make fully responsive with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update Data and Visibility
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    
    // Clean series formatting dates for lightweight-charts
    // Format timestamp to seconds
    const formattedCandles = candles.map(c => ({
      time: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    candleSeries.setData(formattedCandles);

    // Set Volume
    const formattedVolumes = candles.map(c => ({
      time: Math.floor(c.time / 1000),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    }));
    volumeSeries.setData(formattedVolumes);

    // Apply visibility and line values
    const visible = settings.visibleIndicators;
    
    const updateLineSeries = (ref, valArray, isVisible) => {
      if (!ref.current) return;
      if (isVisible) {
        const lineData = candles.map((c, i) => ({
          time: Math.floor(c.time / 1000),
          value: valArray[i]
        })).filter(item => item.value !== null && item.value !== undefined);
        ref.current.setData(lineData);
      } else {
        ref.current.setData([]);
      }
    };

    updateLineSeries(ema9SeriesRef, ema9, visible.ema9);
    updateLineSeries(ema21SeriesRef, ema21, visible.ema21);
    updateLineSeries(ema55SeriesRef, ema55, visible.ema55);
    updateLineSeries(sma200SeriesRef, sma200, visible.sma200);
    updateLineSeries(vwapSeriesRef, vwap, visible.vwap);

    // Bollinger Bands
    if (visible.bb && bb.length === candles.length) {
      const upperData = [];
      const middleData = [];
      const lowerData = [];
      
      candles.forEach((c, i) => {
        const item = bb[i];
        if (item && item.upper !== null) {
          const t = Math.floor(c.time / 1000);
          upperData.push({ time: t, value: item.upper });
          middleData.push({ time: t, value: item.middle });
          lowerData.push({ time: t, value: item.lower });
        }
      });
      
      bbUpperSeriesRef.current.setData(upperData);
      bbMiddleSeriesRef.current.setData(middleData);
      bbLowerSeriesRef.current.setData(lowerData);
    } else {
      bbUpperSeriesRef.current.setData([]);
      bbMiddleSeriesRef.current.setData([]);
      bbLowerSeriesRef.current.setData([]);
    }

    // Set markers for patterns & divergences
    const markers = [];
    candles.forEach((c, i) => {
      const t = Math.floor(c.time / 1000);
      const pattern = patterns[i];
      const div = rsiDivergences[i];

      // Add Candlestick pattern markers
      if (pattern && pattern.direction !== 'neutral') {
        markers.push({
          time: t,
          position: pattern.direction === 'long' ? 'belowBar' : 'aboveBar',
          color: pattern.direction === 'long' ? '#22c55e' : '#ef4444',
          shape: pattern.direction === 'long' ? 'arrowUp' : 'arrowDown',
          text: pattern.pattern
        });
      }
      
      // Add RSI divergence markers
      if (div && !pattern) {
        markers.push({
          time: t,
          position: div.dir === 'long' ? 'belowBar' : 'aboveBar',
          color: '#3b82f6',
          shape: 'circle',
          text: div.type.includes('Hidden') ? 'H-Div' : 'Div'
        });
      }
    });

    // Sort markers by time
    markers.sort((a, b) => a.time - b.time);
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers);
    }

    // Create horizontal lines for POC, VAH, VAL
    const s = candleSeries;
    
    // Clear previous lines
    if (pocLineRef.current) s.removePriceLine(pocLineRef.current);
    if (vahLineRef.current) s.removePriceLine(vahLineRef.current);
    if (valLineRef.current) s.removePriceLine(valLineRef.current);

    if (visible.volumeProfile && volumeProfile && volumeProfile.poc) {
      pocLineRef.current = s.createPriceLine({
        price: volumeProfile.poc,
        color: '#ef4444',
        lineWidth: 1.5,
        lineStyle: 1, // Solid
        axisLabelVisible: true,
        text: 'POC'
      });
      vahLineRef.current = s.createPriceLine({
        price: volumeProfile.vah,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        text: 'VAH'
      });
      valLineRef.current = s.createPriceLine({
        price: volumeProfile.val,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        text: 'VAL'
      });
    }

  }, [candles, ema9, ema21, ema55, sma200, vwap, bb, patterns, rsiDivergences, volumeProfile, settings.visibleIndicators]);

  // Handle visibility settings toggle
  const toggleVisibility = (key) => {
    const updated = {
      ...settings.visibleIndicators,
      [key]: !settings.visibleIndicators[key]
    };
    updateSettings({ visibleIndicators: updated });
  };

  // Render Horizontal volume profile overlay on the left
  const renderVolumeProfileSidebar = () => {
    if (!settings.visibleIndicators.volumeProfile || !volumeProfile || !volumeProfile.profile || volumeProfile.profile.length === 0) return null;
    
    const maxVol = Math.max(...volumeProfile.profile.map(p => p.volume));
    
    return (
      <div className="absolute left-2 top-10 bottom-8 w-24 flex flex-col-reverse justify-between pointer-events-none z-10 opacity-20">
        {volumeProfile.profile.map((bin, i) => {
          const widthPct = maxVol > 0 ? (bin.volume / maxVol) * 100 : 0;
          const isPoc = bin.priceMid >= volumeProfile.poc - (volumeProfile.poc * 0.001) && bin.priceMid <= volumeProfile.poc + (volumeProfile.poc * 0.001);
          
          return (
            <div key={i} className="flex-1 flex items-center h-full w-full">
              <div 
                style={{ width: `${widthPct}%` }} 
                className={`h-4/5 rounded-r transition-all duration-300 ${
                  isPoc ? 'bg-red-500' : 'bg-blue-500'
                }`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 relative h-[480px]">
      
      {/* Chart Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap select-none border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-500" size={16} />
          <span className="text-sm font-semibold text-slate-200">Main Trading Chart</span>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-400">
          {[
            { key: 'ema9', label: 'EMA 9' },
            { key: 'ema21', label: 'EMA 21' },
            { key: 'ema55', label: 'EMA 55' },
            { key: 'sma200', label: 'SMA 200' },
            { key: 'vwap', label: 'VWAP' },
            { key: 'bb', label: 'B-Bands' },
            { key: 'volumeProfile', label: 'Vol Profile' }
          ].map((item) => {
            const active = settings.visibleIndicators[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggleVisibility(item.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all duration-200 ${
                  active 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {active ? <Eye size={12} /> : <EyeOff size={12} />}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Tooltip/Details */}
      {hoverData && (
        <div className="absolute left-6 top-16 bg-slate-900/95 border border-slate-800/90 px-3.5 py-2.5 rounded-lg text-[10px] font-mono text-slate-300 z-20 flex flex-wrap gap-x-4 gap-y-1 shadow-lg backdrop-blur pointer-events-none max-w-[calc(100%-3rem)]">
          <div>O: <span className="text-green-400">${hoverData.open.toLocaleString()}</span></div>
          <div>H: <span className="text-green-400">${hoverData.high.toLocaleString()}</span></div>
          <div>L: <span className="text-red-400">${hoverData.low.toLocaleString()}</span></div>
          <div>C: <span className={hoverData.close >= hoverData.open ? 'text-green-400' : 'text-red-400'}>${hoverData.close.toLocaleString()}</span></div>
          {hoverData.ema9 && settings.visibleIndicators.ema9 && <div className="text-blue-400">EMA9: ${hoverData.ema9.toFixed(2)}</div>}
          {hoverData.ema21 && settings.visibleIndicators.ema21 && <div className="text-amber-400">EMA21: ${hoverData.ema21.toFixed(2)}</div>}
          {hoverData.ema55 && settings.visibleIndicators.ema55 && <div className="text-red-400">EMA55: ${hoverData.ema55.toFixed(2)}</div>}
          {hoverData.sma200 && settings.visibleIndicators.sma200 && <div className="text-purple-400">SMA200: ${hoverData.sma200.toFixed(2)}</div>}
          {hoverData.vwap && settings.visibleIndicators.vwap && <div className="text-cyan-400">VWAP: ${hoverData.vwap.toFixed(2)}</div>}
        </div>
      )}

      {/* Main Chart Container */}
      <div className="relative flex-grow w-full overflow-hidden">
        {renderVolumeProfileSidebar()}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

    </div>
  );
}
