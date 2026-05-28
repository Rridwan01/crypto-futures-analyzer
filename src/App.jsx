import React, { useEffect, useState } from 'react';
import { useTradingStore } from './store/useTradingStore';
import {
  fetchHistoricalCandles,
  fetchOrderBook,
  fetchTicker24h,
  fetchFearAndGreed,
  fetchFundingAndOI,
  subscribeToSymbol
} from './services/binance';

import SentimentBar from './components/SentimentBar';
import SymbolSwitcher from './components/SymbolSwitcher';
import ChartPanel from './components/ChartPanel';
import IndicatorPanels from './components/IndicatorPanels';
import OrderBookFlow from './components/OrderBookFlow';
import SignalDashboard from './components/SignalDashboard';
import SettingsModal from './components/SettingsModal';
import AlertsManager from './components/AlertsManager';

import { Settings, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';

export default function App() {
  const { symbol, interval, setCandles, updateOrderBook, setTicker24h, setFundingAndOI, setFearAndGreed, setHistoricalFearAndGreed } = useTradingStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Initial Load: Fear & Greed (done once)
  useEffect(() => {
    async function loadSentiment() {
      const fngData = await fetchFearAndGreed();
      setFearAndGreed(fngData.current);
      setHistoricalFearAndGreed(fngData.history);
    }
    
    loadSentiment();
    
    // Auto request notifications permission on boot if desired
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {
        console.warn("Notification permission request failed:", e);
      }
    }
  }, []);

  // 2. Load and Poll Data on Symbol/Timeframe changes
  const handleReloadData = async () => {
    setIsRefreshing(true);
    try {
      const candlesHistory = await fetchHistoricalCandles(symbol, interval);
      setCandles(candlesHistory);
      
      const depth = await fetchOrderBook(symbol);
      updateOrderBook(depth);

      const ticker = await fetchTicker24h(symbol);
      setTicker24h(ticker);

      const fundingOi = await fetchFundingAndOI(symbol);
      setFundingAndOI(fundingOi);
    } catch (e) {
      console.error("Error refreshing dashboard details:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleReloadData();

    // Setup active WebSocket stream subscription
    const unsubscribe = subscribeToSymbol(symbol, interval);

    // REST poll details every 30s to keep Order Book depth and OI metrics precise
    const pollId = setInterval(async () => {
      const activeSym = useTradingStore.getState().symbol;
      const depth = await fetchOrderBook(activeSym);
      updateOrderBook(depth);

      const ticker = await fetchTicker24h(activeSym);
      setTicker24h(ticker);

      const fundingOi = await fetchFundingAndOI(activeSym);
      setFundingAndOI(fundingOi);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(pollId);
    };
  }, [symbol, interval]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600/35 selection:text-white">
      
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-lg select-none">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl shadow-md shadow-blue-500/20">
            <BarChart2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white leading-none">ANTIGRAVITY</h1>
            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5 block">
              Crypto Futures Algorithmic Analyzer
            </span>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReloadData}
            title="Manual sync indicators"
            className={`p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white rounded-lg text-slate-400 transition-all ${
              isRefreshing ? 'animate-spin text-blue-400' : ''
            }`}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 font-semibold rounded-lg transition-colors"
          >
            <Settings size={14} />
            <span className="text-xs">Configure</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Space */}
      <main className="flex-grow p-4 lg:p-6 flex flex-col gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* Row 1: Sentiment Metrics Strip */}
        <SentimentBar />

        {/* Row 2: Symbol Selection */}
        <SymbolSwitcher />

        {/* Row 3: Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Charting area (takes 3 columns) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <ChartPanel />
            <IndicatorPanels />
          </div>

          {/* Side panels (takes 1 column) */}
          <div className="flex flex-col gap-6">
            <SignalDashboard />
          </div>
        </div>

        {/* Row 4: Flow analysis & depth */}
        <div className="w-full">
          <OrderBookFlow />
        </div>

      </main>

      {/* Footer copyright */}
      <footer className="border-t border-slate-950 py-4 text-center text-[10px] text-slate-600 select-none">
        Powered by Binance Public API (Free tiers) • Real-time rolling window computation
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Notifications Manager Toast Container */}
      <AlertsManager />

    </div>
  );
}
