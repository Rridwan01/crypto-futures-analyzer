/**
 * technical indicators engine (rolling-window algorithms)
 */

// Helper to calculate SMA
export function calculateSMA(prices, period) {
  const sma = new Array(prices.length).fill(null);
  if (prices.length < period) return sma;
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  sma[period - 1] = sum / period;
  
  for (let i = period; i < prices.length; i++) {
    sum = sum - prices[i - period] + prices[i];
    sma[i] = sum / period;
  }
  return sma;
}

// Helper to calculate EMA
export function calculateEMA(prices, period) {
  const ema = new Array(prices.length).fill(null);
  if (prices.length < period) return ema;
  
  // Start with SMA for first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let currentEma = sum / period;
  ema[period - 1] = currentEma;
  
  const multiplier = 2 / (period + 1);
  for (let i = period; i < prices.length; i++) {
    currentEma = (prices[i] - currentEma) * multiplier + currentEma;
    ema[i] = currentEma;
  }
  return ema;
}

// Helper to calculate session-based VWAP
export function calculateVWAP(candles) {
  const vwap = new Array(candles.length).fill(null);
  if (candles.length === 0) return vwap;
  
  let sumTypicalPriceVol = 0;
  let sumVolume = 0;
  let currentDay = null;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const volume = c.volume;
    
    // Check if new day (session reset)
    const date = new Date(c.time);
    const day = date.getUTCDate();
    
    if (currentDay !== day) {
      currentDay = day;
      sumTypicalPriceVol = 0;
      sumVolume = 0;
    }
    
    sumTypicalPriceVol += typicalPrice * volume;
    sumVolume += volume;
    
    vwap[i] = sumVolume > 0 ? sumTypicalPriceVol / sumVolume : typicalPrice;
  }
  return vwap;
}

// Helper to calculate RSI
export function calculateRSI(prices, period = 14) {
  const rsi = new Array(prices.length).fill(null);
  if (prices.length <= period) return rsi;
  
  let gains = 0;
  let losses = 0;
  
  // First period change
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

// Helper to detect RSI divergences
// Looks for local minima/maxima (peaks/troughs) in Price and RSI
export function detectRSIDivergences(prices, rsiValues, lookback = 60) {
  const divergences = new Array(prices.length).fill(null);
  if (prices.length < lookback) return divergences;

  // Function to check if a point is a local peak (swing high)
  const isSwingHigh = (arr, i) => arr[i] > arr[i - 1] && arr[i] > arr[i + 1] && arr[i - 1] > arr[i - 2] && arr[i + 1] > arr[i + 2];
  // Function to check if a point is a local trough (swing low)
  const isSwingLow = (arr, i) => arr[i] < arr[i - 1] && arr[i] < arr[i + 1] && arr[i - 1] < arr[i - 2] && arr[i + 1] < arr[i + 2];

  for (let i = lookback; i < prices.length; i++) {
    // We scan backwards to find the last two swing points
    if (rsiValues[i] === null || rsiValues[i - 2] === null) continue;

    // Check for Bullish Divergence at a swing low
    if (isSwingLow(prices, i - 2)) {
      const currentPriceLow = prices[i - 2];
      const currentRsiLow = rsiValues[i - 2];
      
      // Look for a previous swing low in range [i - lookback, i - 5]
      let prevLowIndex = -1;
      for (let j = i - 5; j >= Math.max(2, i - lookback); j--) {
        if (isSwingLow(prices, j)) {
          prevLowIndex = j;
          break;
        }
      }

      if (prevLowIndex !== -1) {
        const prevPriceLow = prices[prevLowIndex];
        const prevRsiLow = rsiValues[prevLowIndex];

        // Regular Bullish Divergence: Price Lower Low, RSI Higher Low
        if (currentPriceLow < prevPriceLow && currentRsiLow > prevRsiLow && currentRsiLow < 40) {
          divergences[i] = {
            type: 'Bullish Divergence',
            desc: 'Price made a lower low but RSI made a higher low (reversal)',
            dir: 'long',
            strength: 0.8
          };
        }
        // Hidden Bullish Divergence: Price Higher Low, RSI Lower Low
        else if (currentPriceLow > prevPriceLow && currentRsiLow < prevRsiLow && currentRsiLow < 35) {
          divergences[i] = {
            type: 'Hidden Bullish',
            desc: 'Price made a higher low but RSI made a lower low (continuation)',
            dir: 'long',
            strength: 0.6
          };
        }
      }
    }

    // Check for Bearish Divergence at a swing high
    if (isSwingHigh(prices, i - 2)) {
      const currentPriceHigh = prices[i - 2];
      const currentRsiHigh = rsiValues[i - 2];

      // Look for a previous swing high in range [i - lookback, i - 5]
      let prevHighIndex = -1;
      for (let j = i - 5; j >= Math.max(2, i - lookback); j--) {
        if (isSwingHigh(prices, j)) {
          prevHighIndex = j;
          break;
        }
      }

      if (prevHighIndex !== -1) {
        const prevPriceHigh = prices[prevHighIndex];
        const prevRsiHigh = rsiValues[prevHighIndex];

        // Regular Bearish Divergence: Price Higher High, RSI Lower High
        if (currentPriceHigh > prevPriceHigh && currentRsiHigh < prevRsiHigh && currentRsiHigh > 60) {
          divergences[i] = {
            type: 'Bearish Divergence',
            desc: 'Price made a higher high but RSI made a lower high (reversal)',
            dir: 'short',
            strength: 0.8
          };
        }
        // Hidden Bearish Divergence: Price Lower High, RSI Higher High
        else if (currentPriceHigh < prevPriceHigh && currentRsiHigh > prevRsiHigh && currentRsiHigh > 65) {
          divergences[i] = {
            type: 'Hidden Bearish',
            desc: 'Price made a lower high but RSI made a higher high (continuation)',
            dir: 'short',
            strength: 0.6
          };
        }
      }
    }
  }

  return divergences;
}

// Helper to calculate MACD
export function calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
  const result = []; // Array of { macd: val, signal: val, hist: val }
  
  const fastEma = calculateEMA(prices, fast);
  const slowEma = calculateEMA(prices, slow);
  
  const macdLine = new Array(prices.length).fill(null);
  for (let i = 0; i < prices.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }
  
  // Signal line is EMA of MACD Line (need to filter out leading nulls for calculations)
  const validMacdStartIndex = macdLine.findIndex(v => v !== null);
  const signalLine = new Array(prices.length).fill(null);
  
  if (validMacdStartIndex !== -1 && prices.length - validMacdStartIndex >= signal) {
    const slice = macdLine.slice(validMacdStartIndex);
    const sliceEma = calculateEMA(slice, signal);
    for (let i = 0; i < sliceEma.length; i++) {
      signalLine[validMacdStartIndex + i] = sliceEma[i];
    }
  }
  
  const histogram = new Array(prices.length).fill(null);
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
    result.push({
      macd: macdLine[i],
      signal: signalLine[i],
      hist: histogram[i]
    });
  }
  
  return result;
}

// Helper to calculate Bollinger Bands
export function calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  const bands = []; // Array of { upper, middle, lower, percentB, width }
  const sma = calculateSMA(prices, period);
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      bands.push({ upper: null, middle: null, lower: null, percentB: null, width: null });
      continue;
    }
    
    // Calculate variance and standard deviation
    let varianceSum = 0;
    const avg = sma[i];
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(prices[j] - avg, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    
    const upper = avg + stdDevMultiplier * stdDev;
    const lower = avg - stdDevMultiplier * stdDev;
    const percentB = upper !== lower ? (prices[i] - lower) / (upper - lower) : 0.5;
    const width = avg !== 0 ? (upper - lower) / avg : 0;
    
    bands.push({
      upper,
      middle: avg,
      lower,
      percentB,
      width
    });
  }
  
  return bands;
}

// Helper to calculate Average True Range (ATR)
export function calculateATR(candles, period = 14) {
  const atr = new Array(candles.length).fill(null);
  if (candles.length < period) return atr;
  
  const tr = new Array(candles.length).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const tr1 = c.high - c.low;
    const tr2 = Math.abs(c.high - prevC.close);
    const tr3 = Math.abs(c.low - prevC.close);
    tr[i] = Math.max(tr1, tr2, tr3);
  }
  
  // Initial ATR as SMA of TR
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += tr[i];
  }
  let currentAtr = trSum / period;
  atr[period - 1] = currentAtr;
  
  // Wilder's Smoothing
  for (let i = period; i < candles.length; i++) {
    currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
    atr[i] = currentAtr;
  }
  
  return atr;
}

// Helper to calculate On-Balance Volume (OBV)
export function calculateOBV(candles) {
  const obv = new Array(candles.length).fill(null);
  if (candles.length === 0) return obv;
  
  let currentObv = candles[0].volume;
  obv[0] = currentObv;
  
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      currentObv += candles[i].volume;
    } else if (change < 0) {
      currentObv -= candles[i].volume;
    }
    obv[i] = currentObv;
  }
  return obv;
}

// Helper to calculate Volume Profile (Point of Control POC, Value Area VAH/VAL)
export function calculateVolumeProfile(candles, numBins = 24) {
  if (candles.length === 0) return { poc: 0, vah: 0, val: 0, profile: [] };
  
  let lowestLow = Infinity;
  let highestHigh = -Infinity;
  for (const c of candles) {
    if (c.low < lowestLow) lowestLow = c.low;
    if (c.high > highestHigh) highestHigh = c.high;
  }
  
  const range = highestHigh - lowestLow;
  if (range <= 0) return { poc: lowestLow, vah: lowestLow, val: lowestLow, profile: [] };
  
  const binSize = range / numBins;
  const profile = Array.from({ length: numBins }, (_, idx) => ({
    priceMin: lowestLow + idx * binSize,
    priceMax: lowestLow + (idx + 1) * binSize,
    priceMid: lowestLow + (idx + 0.5) * binSize,
    volume: 0,
    buyVolume: 0,
    sellVolume: 0
  }));
  
  let totalVolume = 0;
  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const isGreen = c.close >= c.open;
    const binIdx = Math.min(numBins - 1, Math.floor((typicalPrice - lowestLow) / binSize));
    
    if (binIdx >= 0 && binIdx < numBins) {
      profile[binIdx].volume += c.volume;
      if (isGreen) {
        profile[binIdx].buyVolume += c.volume;
      } else {
        profile[binIdx].sellVolume += c.volume;
      }
      totalVolume += c.volume;
    }
  }
  
  // Find POC (Bin with the highest volume)
  let maxVol = 0;
  let pocIdx = 0;
  for (let i = 0; i < numBins; i++) {
    if (profile[i].volume > maxVol) {
      maxVol = profile[i].volume;
      pocIdx = i;
    }
  }
  const poc = profile[pocIdx].priceMid;
  
  // Calculate Value Area (VA) - 70% of total volume centered around POC
  const valueAreaVolume = totalVolume * 0.70;
  let currentVAVolume = profile[pocIdx].volume;
  let leftIdx = pocIdx;
  let rightIdx = pocIdx;
  
  while (currentVAVolume < valueAreaVolume) {
    const leftVol = leftIdx > 0 ? profile[leftIdx - 1].volume : 0;
    const rightVol = rightIdx < numBins - 1 ? profile[rightIdx + 1].volume : 0;
    
    if (leftVol === 0 && rightVol === 0) break;
    
    if (leftVol >= rightVol && leftIdx > 0) {
      leftIdx--;
      currentVAVolume += leftVol;
    } else if (rightIdx < numBins - 1) {
      rightIdx++;
      currentVAVolume += rightVol;
    }
  }
  
  const val = profile[leftIdx].priceMin;
  const vah = profile[rightIdx].priceMax;
  
  return {
    poc,
    vah,
    val,
    profile
  };
}
