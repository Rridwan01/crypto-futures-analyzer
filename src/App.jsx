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
import ChartPanel from './components/ChartPanel';
import IndicatorPanels from './components/IndicatorPanels';
import OrderBookFlow from './components/OrderBookFlow';
import SignalDashboard from './components/SignalDashboard';
import SettingsModal from './components/SettingsModal';
import AlertsManager from './components/AlertsManager';
import MarketScanner from './components/MarketScanner';
import QuantBacktestPanel from './components/QuantBacktestPanel';

import { Settings, RefreshCw, BarChart2, ShieldAlert, Search } from 'lucide-react';
import { HTF_MAPPING } from './services/htfBias';

export default function App() {
  const { 
    symbol, 
    setSymbol,
    interval, 
    setInterval: setStoreInterval,
    setCandles, 
    setHtfCandles, 
    runHistoricalBacktest, 
    updateOrderBook, 
    setTicker24h, 
    setFundingAndOI, 
    setFearAndGreed, 
    setHistoricalFearAndGreed, 
    runScanner,
    workspaceMode,
    setWorkspaceMode,
    scannerExpanded,
    setScannerExpanded,
    scannerData,
    currentSignal,
    htfBias
  } = useTradingStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // 1. Initial Load: Fear & Greed + scanner boot (done once)
  useEffect(() => {
    async function loadSentiment() {
      const fngData = await fetchFearAndGreed();
      setFearAndGreed(fngData.current);
      setHistoricalFearAndGreed(fngData.history);
    }
    
    loadSentiment();
    runScanner(fetchHistoricalCandles, fetchTicker24h);
    
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
      // Load main candles
      const candlesHistory = await fetchHistoricalCandles(symbol, interval);
      setCandles(candlesHistory);
      
      // Load HTF candles
      const htfInterval = HTF_MAPPING[interval] || '1h';
      const htfHistory = await fetchHistoricalCandles(symbol, htfInterval);
      setHtfCandles(htfHistory);

      // Run backtest
      runHistoricalBacktest();
      
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

    // REST poll details every 30s to keep Order Book depth and OI metrics precise + run background scanner
    const pollId = setInterval(async () => {
      const activeSym = useTradingStore.getState().symbol;
      const activeInterval = useTradingStore.getState().interval;
      const depth = await fetchOrderBook(activeSym);
      updateOrderBook(depth);

      const ticker = await fetchTicker24h(activeSym);
      setTicker24h(ticker);

      const fundingOi = await fetchFundingAndOI(activeSym);
      setFundingAndOI(fundingOi);

      // Fetch HTF candles in background
      const htfInterval = HTF_MAPPING[activeInterval] || '1h';
      const htfHistory = await fetchHistoricalCandles(activeSym, htfInterval);
      setHtfCandles(htfHistory);

      runScanner(fetchHistoricalCandles, fetchTicker24h);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(pollId);
    };
  }, [symbol, interval]);

  // 3. Handle mobile viewport layout defaults
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024; // Tailwind lg breakpoint
      const currentMode = useTradingStore.getState().workspaceMode;
      
      if (isMobile && currentMode !== 'signals' && currentMode !== 'flow' && currentMode !== 'research' && currentMode !== 'analyze') {
        setWorkspaceMode('signals');
      } else if (!isMobile && currentMode === 'signals') {
        setWorkspaceMode('analyze');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setWorkspaceMode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      let formatted = searchInput.trim().toUpperCase();
      if (!formatted.endsWith('USDT')) {
        formatted += 'USDT';
      }
      setSymbol(formatted);
      setSearchInput('');
    }
  };

  // Helper to count active strong alerts for scanner footer summary
  const getScannerSummaryText = () => {
    const list = Object.values(scannerData);
    if (list.length === 0) return 'Syncing markets...';
    const strongAlerts = list.filter(item => item.recommendation.startsWith('STRONG')).map(item => `${item.symbol.replace('USDT', '')} ${item.recommendation.includes('LONG') ? '▲' : '▼'}`);
    if (strongAlerts.length > 0) {
      return `Scanned ${list.length} markets. Strong signals: ${strongAlerts.join(', ')}`;
    }
    return `Scanned ${list.length} markets. No active confluences.`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600/35 selection:text-white">
      
      {/* Top Header Command Layer */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-35 px-3 py-2 flex items-center justify-between shadow select-none">
        
        {/* Left Side: Active Symbol Select & Timeframe dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="flex items-center gap-1.5 mr-1 hidden md:flex">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded shadow">
              <BarChart2 size={11} className="text-white" />
            </div>
            <span className="text-[10px] font-extrabold tracking-widest text-white font-mono leading-none">BANDHASHIRA</span>
          </div>

          {/* Symbol Select Selector */}
          <select 
            value={symbol} 
            onChange={(e) => setSymbol(e.target.value)} 
            className="bg-slate-950 text-[10px] font-mono font-bold text-slate-200 border border-slate-900 px-1.5 py-0.5 rounded focus:outline-none focus:border-blue-500/30"
          >
            <option value="BTCUSDT">BTC</option>
            <option value="ETHUSDT">ETH</option>
            <option value="SOLUSDT">SOL</option>
            <option value="BNBUSDT">BNB</option>
            <option value="ARBUSDT">ARB</option>
            <option value="DOGEUSDT">DOGE</option>
          </select>

          {/* Custom Search Form (hidden on mobile screen) */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center hidden sm:flex">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-slate-950 text-[9px] text-slate-350 placeholder-slate-650 pl-6 pr-2 py-0.5 rounded border border-slate-900 focus:outline-none focus:border-blue-500/30 w-24 font-mono"
            />
            <Search className="absolute left-2 text-slate-600" size={9} />
          </form>

          {/* Timeframe selector dropdown */}
          <select 
            value={interval} 
            onChange={(e) => setStoreInterval(e.target.value)} 
            className="bg-slate-950 text-[10px] font-mono font-bold text-slate-200 border border-slate-900 px-1.5 py-0.5 rounded focus:outline-none focus:border-blue-500/30"
          >
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
          </select>

          {/* Live Indicator */}
          <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 font-mono tracking-wider">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Middle Area: Consolidated Regime/HTF Bias Metrics (hidden on mobile screen) */}
        {currentSignal && (
          <div className="hidden xl:flex items-center gap-4 text-[9px] font-mono text-slate-550 border-l border-slate-900 pl-4">
            <span>Regime: <strong className="text-slate-300 uppercase">{currentSignal.regime.replace('_', ' ')}</strong></span>
            <span>HTF: <strong className="text-slate-300 uppercase">{htfBias?.bias ? htfBias.bias.replace('_', ' ') : 'NEUTRAL'}</strong></span>
            <span>Verdict: <strong className={currentSignal.score > 0 ? 'text-emerald-450' : currentSignal.score < 0 ? 'text-rose-455' : 'text-slate-450'}>{currentSignal.recommendation} ({currentSignal.score})</strong></span>
          </div>
        )}

        {/* Right Side: Switcher Tabs, Reload and Config */}
        <div className="flex items-center gap-1.5">
          
          {/* Workspace Tabs selector */}
          <div className="flex items-center bg-slate-950/85 p-0.5 border border-slate-900 rounded font-mono">
            {/* Signals tab is ONLY visible on mobile screens */}
            <button 
              onClick={() => setWorkspaceMode('signals')}
              className={`px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded transition-all lg:hidden ${workspaceMode === 'signals' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Signals
            </button>
            <button 
              onClick={() => setWorkspaceMode('analyze')}
              className={`px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded transition-all ${workspaceMode === 'analyze' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {window.innerWidth < 1024 ? 'Chart' : 'Analyze'}
            </button>
            <button 
              onClick={() => setWorkspaceMode('flow')}
              className={`px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded transition-all ${workspaceMode === 'flow' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Flow
            </button>
            <button 
              onClick={() => setWorkspaceMode('research')}
              className={`px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded transition-all ${workspaceMode === 'research' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Research
            </button>
          </div>

          <button
            onClick={handleReloadData}
            title="Reload Data"
            className={`p-1.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded transition-all ${
              isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400'
            }`}
          >
            <RefreshCw size={10} />
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 rounded transition-colors"
            title="Configure"
          >
            <Settings size={10} />
          </button>
        </div>
      </header>

      {/* Main Area: Split Workspace View */}
      <main className="flex-grow p-3 lg:p-5 flex flex-col lg:flex-row gap-4 max-w-[1700px] w-full mx-auto overflow-hidden">
        
        {/* Left Side: Workspace area */}
        <div className="flex-grow lg:w-3/4 flex flex-col gap-4 overflow-hidden">
          
          {/* Sentiment strip */}
          <SentimentBar />
          
          {/* Switchable workspace content */}
          {workspaceMode === 'signals' && (
            <div className="flex-grow overflow-y-auto lg:hidden">
              <SignalDashboard />
            </div>
          )}

          {workspaceMode === 'analyze' && (
            <div className="flex flex-col gap-4 flex-grow overflow-y-auto">
              <ChartPanel />
              <IndicatorPanels />
            </div>
          )}

          {workspaceMode === 'flow' && (
            <div className="flex-grow overflow-y-auto">
              <OrderBookFlow />
            </div>
          )}

          {workspaceMode === 'research' && (
            <div className="flex-grow overflow-y-auto">
              <QuantBacktestPanel />
            </div>
          )}

        </div>

        {/* Right Side: Stacked Confluence Sidebar (30% width) - Hidden on mobile, persistent on desktop */}
        <div className="hidden lg:flex lg:w-1/4 shrink-0 flex-col gap-4 min-h-[500px] overflow-hidden">
          <SignalDashboard />
        </div>

      </main>

      {/* Bottom Scanner Drawer */}
      <div className="border-t border-slate-900 bg-slate-950/95 backdrop-blur z-20 sticky bottom-0 select-none transition-all duration-300">
        
        {/* Drawer header toggle bar */}
        <div 
          onClick={() => setScannerExpanded(!scannerExpanded)}
          className="flex items-center justify-between px-4 py-1.5 cursor-pointer hover:bg-slate-900/10 text-slate-400 hover:text-slate-200 border-b border-slate-900/60"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8.5px] font-extrabold font-mono tracking-widest text-slate-400">
              {scannerExpanded ? 'SCANNER STATE [ACTIVE] ▼' : 'SCANNER STATE [COLLAPSED] ▲'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[7.5px] font-mono text-slate-500">
            <span>{getScannerSummaryText()}</span>
          </div>
        </div>

        {/* Expanded Scanner panel (horizontal ribbon format) */}
        {scannerExpanded && (
          <div className="bg-slate-950/40 max-h-24 overflow-hidden py-1 border-b border-slate-950">
            <MarketScanner />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Toast Manager container */}
      <AlertsManager />

    </div>
  );
}
