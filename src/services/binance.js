import { useTradingStore } from '../store/useTradingStore';

let activeWs = null;
let simulatorInterval = null;
let isSimulatorActive = false;

// Determine API Root based on environment (use proxy in dev, fallback to corsproxy in prod)
const getApiRoot = (type) => {
  const isDev = import.meta.env.DEV;
  if (type === 'binance') {
    return isDev ? '/binance-fapi' : 'https://corsproxy.io/?url=https://fapi.binance.com';
  } else if (type === 'alternative') {
    return isDev ? '/alternative-fng' : 'https://corsproxy.io/?url=https://api.alternative.me';
  }
  return '';
};

// Map intervals to seconds
const intervalToSeconds = (interval) => {
  const num = parseInt(interval);
  if (interval.endsWith('m')) return num * 60;
  if (interval.endsWith('h')) return num * 3600;
  if (interval.endsWith('d')) return num * 86400;
  return 60; // default 1m
};

/**
 * Fetch historical candles (OHLCV)
 */
export async function fetchHistoricalCandles(symbol, interval) {
  const apiRoot = getApiRoot('binance');
  const formattedSymbol = symbol.toUpperCase();
  
  const url = `${apiRoot}/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=500`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const rawData = await res.json();
    
    const candles = rawData.map(c => ({
      time: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));
    
    return candles;
  } catch (err) {
    console.warn(`Failed to fetch Binance history for ${symbol}. Activating offline simulator mode. Error:`, err);
    isSimulatorActive = true;
    return generateMockCandles(symbol, interval);
  }
}

/**
 * Fetch Order Book depth
 */
export async function fetchOrderBook(symbol) {
  if (isSimulatorActive) {
    const store = useTradingStore.getState();
    const mid = store.candles.length > 0 ? store.candles[store.candles.length - 1].close : 65000;
    return generateMockOrderBook(mid);
  }

  const apiRoot = getApiRoot('binance');
  const formattedSymbol = symbol.toUpperCase();
  const url = `${apiRoot}/fapi/v1/depth?symbol=${formattedSymbol}&limit=50`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Failed to fetch depth for ${symbol}:`, err);
    const store = useTradingStore.getState();
    const mid = store.candles.length > 0 ? store.candles[store.candles.length - 1].close : 65000;
    return generateMockOrderBook(mid);
  }
}

/**
 * Fetch 24h Ticker statistics
 */
export async function fetchTicker24h(symbol) {
  if (isSimulatorActive) {
    const store = useTradingStore.getState();
    const lastPrice = store.candles.length > 0 ? store.candles[store.candles.length - 1].close : 65000;
    return {
      priceChangePercent: 2.45,
      volume: 12500,
      high: lastPrice * 1.02,
      low: lastPrice * 0.98,
      lastPrice
    };
  }

  const apiRoot = getApiRoot('binance');
  const formattedSymbol = symbol.toUpperCase();
  const url = `${apiRoot}/fapi/v1/ticker/24hr?symbol=${formattedSymbol}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return {
      priceChangePercent: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.volume),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      lastPrice: parseFloat(data.lastPrice)
    };
  } catch (err) {
    console.error(`Failed to fetch ticker for ${symbol}:`, err);
    return { priceChangePercent: 1.25, volume: 15400, high: 66200, low: 64100, lastPrice: 65100 };
  }
}

/**
 * Fetch Fear and Greed Index
 */
export async function fetchFearAndGreed() {
  const apiRoot = getApiRoot('alternative');
  const url = `${apiRoot}/fng/?limit=7`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data && data.data && data.data.length > 0) {
      return {
        current: {
          value: parseInt(data.data[0].value),
          classification: data.data[0].value_classification
        },
        history: data.data.map(item => ({
          value: parseInt(item.value),
          timestamp: parseInt(item.timestamp) * 1000
        })).reverse()
      };
    }
    throw new Error("Invalid F&G payload");
  } catch (err) {
    console.warn("Failed to fetch Fear & Greed Index from API. Using fallback mock index:", err);
    return {
      current: { value: 72, classification: "Greed" },
      history: Array.from({ length: 7 }, (_, i) => ({ value: 60 + i * 2, timestamp: Date.now() - (6 - i) * 86400000 }))
    };
  }
}

/**
 * Fetch funding rate, Open Interest and Open Interest change
 */
export async function fetchFundingAndOI(symbol) {
  if (isSimulatorActive) {
    return { fundingRate: 0.00015, openInterest: 2450000, openInterestChange: 0.015 };
  }

  const apiRoot = getApiRoot('binance');
  const formattedSymbol = symbol.toUpperCase();
  
  try {
    const fundingUrl = `${apiRoot}/fapi/v1/premiumIndex?symbol=${formattedSymbol}`;
    const fundingRes = await fetch(fundingUrl);
    const fundingData = fundingRes.ok ? await fundingRes.json() : {};
    const fundingRate = parseFloat(fundingData.lastFundingRate || 0);

    const oiUrl = `${apiRoot}/fapi/v1/openInterest?symbol=${formattedSymbol}`;
    const oiRes = await fetch(oiUrl);
    const oiData = oiRes.ok ? await oiRes.json() : {};
    const openInterest = parseFloat(oiData.openInterest || 0);

    return {
      fundingRate,
      openInterest,
      openInterestChange: fundingRate * 0.08
    };
  } catch (e) {
    console.error(`Failed to fetch funding/OI details for ${symbol}:`, e);
    return { fundingRate: 0.0001, openInterest: 1850000, openInterestChange: 0.012 };
  }
}

/**
 * Subscribe to symbol live WS stream (Candles + AggTrades)
 */
export function subscribeToSymbol(symbol, interval) {
  if (activeWs) {
    activeWs.close();
    activeWs = null;
  }
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }

  const symbolLower = symbol.toLowerCase();
  
  // Connect directly to fstream.binance.com (WebSocket is NOT restricted by CORS)
  const wsUrl = `wss://fstream.binance.com/stream?streams=${symbolLower}@kline_${interval}/${symbolLower}@aggTrade`;
  
  let wsConnected = false;
  
  console.log(`Connecting to Binance WebSocket directly: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  activeWs = ws;
  
  ws.onopen = () => {
    wsConnected = true;
    isSimulatorActive = false;
    console.log(`WebSocket connected directly to Binance Futures stream for ${symbol} (${interval})`);
  };
  
  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const { stream, data } = payload;
      
      if (!data) return;

      // 1. Handle live candle updates
      if (stream.includes('@kline')) {
        const k = data.k; // Candle details
        const liveCandle = {
          time: k.t, // Start time
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isClosed: k.x // Whether candle is finalized
        };
        
        useTradingStore.getState().updateLiveCandle(liveCandle);
      }
      
      // 2. Handle aggTrades for CVD & flow momentum
      else if (stream.includes('@aggTrade')) {
        const qty = parseFloat(data.q);
        const isMaker = data.m; 
        const direction = isMaker ? -1 : 1;
        const volumeDelta = qty * direction;
        
        useTradingStore.getState().updateCvd(volumeDelta);
      }
    } catch (err) {
      console.error("WS message parse failed:", err);
    }
  };
  
  ws.onerror = (err) => {
    console.warn(`Binance WebSocket direct connection failed/refused. Activating fallback real-time simulator.`);
    if (!wsConnected) {
      startFallbackSimulator(symbol, interval);
    }
  };
  
  ws.onclose = () => {
    console.log(`WebSocket disconnected for ${symbol}`);
    if (activeWs === ws && !wsConnected) {
      startFallbackSimulator(symbol, interval);
    }
  };

  return () => {
    ws.close();
    if (simulatorInterval) {
      clearInterval(simulatorInterval);
      simulatorInterval = null;
    }
  };
}

/**
 * Fallback Simulator: Generates real-time price updates, CVD flows, and order books offline
 */
function startFallbackSimulator(symbol, interval) {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
  }
  
  isSimulatorActive = true;
  console.log(`Real-Time Trading Simulator is active for ${symbol} (${interval})`);
  
  const intervalSec = intervalToSeconds(interval);
  
  simulatorInterval = setInterval(() => {
    const store = useTradingStore.getState();
    const currentCandles = store.candles;
    if (currentCandles.length === 0) return;
    
    const lastCandle = { ...currentCandles[currentCandles.length - 1] };
    const now = Date.now();
    
    // Check if we need to open a new candle
    const isNewCandle = now - lastCandle.time >= intervalSec * 1000;
    
    // Simulate price fluctuation (Random walk)
    // 60% chance of continuation of the current candle direction, 40% reversal
    const trendDirection = lastCandle.close >= lastCandle.open ? 1 : -1;
    const probability = Math.random();
    const changePct = (probability > 0.4 ? trendDirection : -trendDirection) * (Math.random() * 0.0006); // max 0.06% change
    
    const delta = lastCandle.close * changePct;
    const newPrice = lastCandle.close + delta;
    const tickVolume = Math.random() * 5.0 + 0.1;
    const isBuyerInitiated = Math.random() > (trendDirection > 0 ? 0.45 : 0.55);
    
    let simulatedCandle;
    
    if (isNewCandle) {
      // Finalize last and create new
      simulatedCandle = {
        time: lastCandle.time + intervalSec * 1000,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, newPrice),
        low: Math.min(lastCandle.close, newPrice),
        close: newPrice,
        volume: tickVolume
      };
    } else {
      // Modify last candle
      simulatedCandle = {
        ...lastCandle,
        high: Math.max(lastCandle.high, newPrice),
        low: Math.min(lastCandle.low, newPrice),
        close: newPrice,
        volume: lastCandle.volume + tickVolume
      };
    }
    
    // Push updates to state
    store.updateLiveCandle(simulatedCandle);
    
    // Push CVD delta update
    const cvdDelta = tickVolume * (isBuyerInitiated ? 1 : -1);
    store.updateCvd(cvdDelta);
    
    // Push simulated order book updates
    const mockBook = generateMockOrderBook(newPrice);
    store.updateOrderBook(mockBook);
    
  }, 1000); // Trigger ticks every 1 second
}

/**
 * Helper: Mulberry32 seedable pseudo-random number generator
 */
function seedRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h << 5) - h + seedStr.charCodeAt(i);
    h |= 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * Helper: Generate mock candles for safe development fallbacks (deterministic based on symbol name)
 */
function generateMockCandles(symbol, interval) {
  const list = [];
  const count = 500;
  const intervalSec = intervalToSeconds(interval);
  
  const nowRounded = Math.floor(Date.now() / (intervalSec * 1000)) * (intervalSec * 1000);
  let time = nowRounded - count * intervalSec * 1000;
  
  const rand = seedRandom(symbol.toUpperCase());
  
  // Base price mapping for presets to match realistic coin pricing
  const sym = symbol.toUpperCase();
  let close = 100.0;
  if (sym.includes('BTC')) close = 68450.0;
  else if (sym.includes('ETH')) close = 3540.0;
  else if (sym.includes('SOL')) close = 165.0;
  else if (sym.includes('BNB')) close = 590.0;
  else if (sym.includes('ARB')) close = 1.15;
  else if (sym.includes('DOGE')) close = 0.145;
  else if (sym.includes('XRP')) close = 0.52;
  else if (sym.includes('ADA')) close = 0.45;
  else if (sym.includes('LINK')) close = 16.5;
  
  for (let i = 0; i < count; i++) {
    const open = close;
    // Generate deterministic noise
    const noise = (rand() - 0.495) * 0.002;
    close = open * (1 + noise);
    
    const bodySize = Math.abs(close - open);
    const high = Math.max(open, close) + bodySize * rand() * 0.8;
    const low = Math.min(open, close) - bodySize * rand() * 0.8;
    const volume = rand() * 250 + 10;
    
    list.push({ time, open, high, low, close, volume });
    time += intervalSec * 1000;
  }
  return list;
}

/**
 * Helper: Generate mock order book centered around midPrice
 */
function generateMockOrderBook(midPrice) {
  const bids = [];
  const asks = [];
  const spread = midPrice * 0.00015; // 0.015% spread
  
  for (let i = 1; i <= 15; i++) {
    const bidPrice = midPrice - (spread / 2) - (i - 1) * (midPrice * 0.00008);
    const askPrice = midPrice + (spread / 2) + (i - 1) * (midPrice * 0.00008);
    
    // Large order wall occasionally at level 6 or 11
    const isWall = i === 6 || i === 11;
    const bidSize = (Math.random() * 1.8 + 0.1) * (isWall ? 8.5 : 1);
    const askSize = (Math.random() * 1.8 + 0.1) * (isWall ? 8.5 : 1);
    
    bids.push([bidPrice.toFixed(2), bidSize.toFixed(4)]);
    asks.push([askPrice.toFixed(2), askSize.toFixed(4)]);
  }
  
  return { bids, asks, lastUpdateId: Date.now() };
}

