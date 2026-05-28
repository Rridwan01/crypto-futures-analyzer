import { create } from 'zustand';
import { calculateSMA, calculateEMA, calculateVWAP, calculateRSI, detectRSIDivergences, calculateMACD, calculateBollingerBands, calculateATR, calculateOBV, calculateVolumeProfile } from '../services/indicators';
import { detectPatterns } from '../services/patterns';
import { calculateSignalScore } from '../services/scorer';

const DEFAULT_SETTINGS = {
  rsiPeriod: 14,
  emaShort: 9,
  emaMedium: 21,
  emaLong: 55,
  smaBaseline: 200,
  bbPeriod: 20,
  bbStdDev: 2,
  atrPeriod: 14,
  weights: {
    rsi: 15,
    macd: 20,
    ma: 15,
    volume: 15,
    cvd: 10,
    pattern: 15,
    sentiment: 10
  },
  soundEnabled: true,
  desktopNotifications: false,
  visibleIndicators: {
    ema9: true,
    ema21: true,
    ema55: true,
    sma200: true,
    vwap: true,
    bb: true,
    volumeProfile: true
  }
};

// Retrieve settings from localStorage or fallback to default
const getSavedSettings = () => {
  try {
    const saved = localStorage.getItem('crypto_analyzer_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed, weights: { ...DEFAULT_SETTINGS.weights, ...parsed.weights } };
    }
  } catch (e) {
    console.error('Error loading settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
};

export const useTradingStore = create((set, get) => ({
  symbol: 'BTCUSDT',
  interval: '15m',
  candles: [], // Array of { time, open, high, low, close, volume }
  orderBook: { bids: [], asks: [], updateId: 0 },
  cvdHistory: [], // Net buy volume history matching candles
  currentCvd: 0,  // Real-time session-based CVD
  fearAndGreed: { value: 50, classification: 'Neutral' },
  historicalFearAndGreed: [],
  fundingRate: 0,
  openInterest: 0,
  openInterestChange: 0,
  ticker24h: { priceChangePercent: 0, volume: 0, high: 0, low: 0 },
  
  // Indicator states (synchronized to candles)
  sma200: [],
  ema9: [],
  ema21: [],
  ema55: [],
  vwap: [],
  rsi: [],
  rsiDivergences: [],
  macd: [],
  bb: [],
  atr: [],
  obv: [],
  volumeProfile: { poc: 0, vah: 0, val: 0, profile: [] },
  patterns: [],
  
  // Signal State
  currentSignal: null,
  signalHistory: [], // Log of triggered signals
  alerts: [], // Current active alerts (visual toast notices)
  
  // User Config Settings
  settings: getSavedSettings(),

  // Actions
  setSymbol: (symbol) => set({ symbol, candles: [], cvdHistory: [], orderBook: { bids: [], asks: [], updateId: 0 } }),
  setInterval: (interval) => set({ interval, candles: [], cvdHistory: [] }),
  setFearAndGreed: (fg) => set({ fearAndGreed: fg }),
  setHistoricalFearAndGreed: (history) => set({ historicalFearAndGreed: history }),
  setFundingAndOI: (data) => set({ fundingRate: data.fundingRate, openInterest: data.openInterest, openInterestChange: data.openInterestChange }),
  setTicker24h: (ticker) => set({ ticker24h: ticker }),
  
  updateOrderBook: (depth) => {
    // Sort bids descending, asks ascending
    const bids = (depth.bids || []).slice(0, 15).map(b => [parseFloat(b[0]), parseFloat(b[1])]);
    const asks = (depth.asks || []).slice(0, 15).map(a => [parseFloat(a[0]), parseFloat(a[1])]);
    set({ orderBook: { bids, asks, updateId: depth.lastUpdateId } });
  },

  updateCvd: (netDelta) => {
    set(state => {
      const newCvd = state.currentCvd + netDelta;
      
      // Update the last element of cvdHistory with the current CVD
      let updatedHistory = [...state.cvdHistory];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1] = newCvd;
      }
      
      return { currentCvd: newCvd, cvdHistory: updatedHistory };
    });
  },

  updateSettings: (newSettings) => {
    set(state => {
      const merged = { ...state.settings, ...newSettings };
      localStorage.setItem('crypto_analyzer_settings', JSON.stringify(merged));
      
      // Run recalculations with new parameters immediately if candles exist
      setTimeout(() => get().recalculateEngine(), 0);
      
      return { settings: merged };
    });
  },
  
  setCandles: (historicalCandles) => {
    set({ candles: historicalCandles });
    
    // Build an initial CVD history matching candles length
    // We mock the CVD history starting from 0 and changing based on candle body & volume
    let runningCvd = 0;
    const initialCvdHistory = historicalCandles.map(c => {
      const isGreen = c.close >= c.open;
      const bodyRatio = c.high !== c.low ? Math.abs(c.close - c.open) / (c.high - c.low) : 0.5;
      const changeVol = c.volume * bodyRatio;
      runningCvd += isGreen ? changeVol : -changeVol;
      return runningCvd;
    });

    set({ cvdHistory: initialCvdHistory, currentCvd: runningCvd });
    get().recalculateEngine();
  },

  updateLiveCandle: (candle) => {
    set(state => {
      const list = [...state.candles];
      if (list.length === 0) return { candles: [candle] };
      
      const last = list[list.length - 1];
      const isNewCandle = candle.time > last.time;
      
      let updatedCandles;
      let updatedCvdHistory = [...state.cvdHistory];
      let newCvd = state.currentCvd;

      if (isNewCandle) {
        // Finalize last candle's CVD position
        updatedCandles = [...list, candle];
        
        // Compute initial CVD offset for new candle
        const bodyRatio = candle.high !== candle.low ? Math.abs(candle.close - candle.open) / (candle.high - candle.low) : 0.5;
        const netVol = candle.volume * bodyRatio * (candle.close >= candle.open ? 1 : -1);
        newCvd = state.currentCvd + netVol;
        updatedCvdHistory.push(newCvd);
      } else {
        // Update existing last candle
        updatedCandles = [...list.slice(0, -1), candle];
        // For existing last candle, CVD changes are added to state.currentCvd via updateCvd stream
      }

      return { candles: updatedCandles, cvdHistory: updatedCvdHistory, currentCvd: newCvd };
    });

    get().recalculateEngine();
  },

  recalculateEngine: () => {
    const { candles, cvdHistory, fearAndGreed, settings } = get();
    if (candles.length < 5) return;
    
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    // 1. Calculate indicators
    const sma200 = calculateSMA(closes, settings.smaBaseline);
    const ema9 = calculateEMA(closes, settings.emaShort);
    const ema21 = calculateEMA(closes, settings.emaMedium);
    const ema55 = calculateEMA(closes, settings.emaLong);
    const vwap = calculateVWAP(candles);
    const rsi = calculateRSI(closes, settings.rsiPeriod);
    const rsiDivergences = detectRSIDivergences(closes, rsi);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes, settings.bbPeriod, settings.bbStdDev);
    const atr = calculateATR(candles, settings.atrPeriod);
    const obv = calculateOBV(candles);
    const volumeSma = calculateSMA(volumes, 20);
    const volProfile = calculateVolumeProfile(candles);
    
    // 2. Candlestick patterns
    const patterns = detectPatterns(candles);
    
    // 3. Composite score calculation
    const scoreData = {
      candles,
      rsi,
      rsiDivergences,
      macd,
      ema9,
      ema21,
      ema55,
      sma200,
      vwap,
      volumeSma,
      obv,
      cvdHistory,
      patterns,
      fearAndGreed
    };
    
    const calculatedSignal = calculateSignalScore(scoreData, settings.weights);
    
    // 4. Trigger alert checks if recommendation changed
    const prevSignal = get().currentSignal;
    if (prevSignal && prevSignal.recommendation !== calculatedSignal.recommendation && calculatedSignal.confluencePassed) {
      if (calculatedSignal.recommendation.startsWith('STRONG')) {
        get().triggerAlert(calculatedSignal);
      }
    }
    
    set({
      sma200,
      ema9,
      ema21,
      ema55,
      vwap,
      rsi,
      rsiDivergences,
      macd,
      bb,
      atr,
      obv,
      volumeSma,
      volumeProfile: volProfile,
      patterns,
      currentSignal: calculatedSignal
    });
  },

  triggerAlert: (signal) => {
    const { symbol, interval, settings, candles } = get();
    const latestPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    
    const newAlert = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      interval,
      recommendation: signal.recommendation,
      score: signal.score,
      price: latestPrice,
      timestamp: new Date().toLocaleTimeString(),
      categories: signal.confluenceCategories,
      read: false
    };

    set(state => {
      // Audio trigger
      if (settings.soundEnabled) {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = signal.recommendation.includes('LONG') ? 'sine' : 'triangle';
          // Bullish: high pitch beep. Bearish: low pitch dual beep.
          oscillator.frequency.setValueAtTime(signal.recommendation.includes('LONG') ? 880 : 440, audioCtx.currentTime);
          
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.4);
        } catch (e) {
          console.warn('Audio alert failed to initialize (browser restriction):', e);
        }
      }

      // Desktop notifications
      if (settings.desktopNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`Crypto Signal: ${symbol} (${interval})`, {
          body: `Signal: ${signal.recommendation} | Score: ${signal.score} | Price: $${latestPrice}`,
          icon: '/favicon.ico'
        });
      }

      return {
        alerts: [newAlert, ...state.alerts].slice(0, 50),
        signalHistory: [newAlert, ...state.signalHistory].slice(0, 100)
      };
    });
  },

  dismissAlert: (id) => {
    set(state => ({
      alerts: state.alerts.filter(a => a.id !== id)
    }));
  },
  
  clearAlerts: () => set({ alerts: [] })
}));
