import { calculateSMA, calculateEMA, calculateVWAP } from './indicators';

// Timeframe hierarchy mappings
export const HTF_MAPPING = {
  '5m': '1h',
  '15m': '4h',
  '1h': '1d',
  '4h': '1d'
};

/**
 * Lightweight higher timeframe (HTF) trend & bias classifier
 * Answers: "What is the broader market condition?"
 */
export function calculateHtfBias(candles) {
  if (!candles || candles.length < 55) {
    return {
      bias: 'NEUTRAL',
      description: 'Insufficient context data',
      longMultiplier: 1.0,
      shortMultiplier: 1.0
    };
  }

  const closes = candles.map(c => c.close);
  const idx = candles.length - 1;
  const currentPrice = closes[idx];
  
  // 1. Calculate lightweight indicators
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema55 = calculateEMA(closes, 55);
  const sma200 = calculateSMA(closes, 50); // Using 50 for faster context on shorter segments if needed, or 200 if loaded enough. Let's use 50 since limit is 500.
  const vwap = calculateVWAP(candles);

  const e9 = ema9[idx];
  const e21 = ema21[idx];
  const e55 = ema55[idx];
  const s200 = sma200[idx];
  const v = vwap[idx];

  // 2. Classify conditions
  const isEmaBullish = e9 > e21 && e21 > e55;
  const isEmaBearish = e9 < e21 && e21 < e55;
  
  const aboveSma200 = s200 !== null ? currentPrice > s200 : true;
  const aboveVwap = v !== null ? currentPrice > v : true;

  // Determine transitions
  const emaCrossLong = e9 > e21 && ema9[idx - 2] <= ema21[idx - 2];
  const emaCrossShort = e9 < e21 && ema9[idx - 2] >= ema21[idx - 2];

  let bias = 'NEUTRAL';
  let description = 'Neutral range consolidation';
  let longMultiplier = 1.0;
  let shortMultiplier = 1.0;

  if (isEmaBullish && aboveSma200 && aboveVwap) {
    bias = 'STRONG_BULLISH';
    description = 'Strong uptrend confirmation';
    longMultiplier = 1.3; // Boost long confidence
    shortMultiplier = 0.5; // Highly suppress short entries
  } else if (isEmaBullish || (aboveSma200 && aboveVwap)) {
    bias = 'BULLISH';
    description = 'Moderate bullish bias';
    longMultiplier = 1.15;
    shortMultiplier = 0.75;
  } else if (isEmaBearish && !aboveSma200 && !aboveVwap) {
    bias = 'STRONG_BEARISH';
    description = 'Strong downtrend confirmation';
    longMultiplier = 0.5; // Highly suppress long entries
    shortMultiplier = 1.3; // Boost short confidence
  } else if (isEmaBearish || (!aboveSma200 && !aboveVwap)) {
    bias = 'BEARISH';
    description = 'Moderate bearish bias';
    longMultiplier = 0.75;
    shortMultiplier = 1.15;
  } else if (emaCrossLong || emaCrossShort) {
    bias = 'TRANSITIONAL';
    description = 'Trend reversal in progress';
    longMultiplier = 0.9; // Reduce confidence
    shortMultiplier = 0.9;
  } else {
    bias = 'NEUTRAL';
    description = 'Choppy consolidation range';
    longMultiplier = 1.0;
    shortMultiplier = 1.0;
  }

  return {
    bias,
    description,
    longMultiplier,
    shortMultiplier
  };
}
