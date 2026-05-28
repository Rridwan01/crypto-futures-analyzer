/**
 * rule-based candlestick pattern recognition engine
 */

export function detectPatterns(candles) {
  const patterns = new Array(candles.length).fill(null);
  if (candles.length < 4) return patterns;

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2]; // 2 bars ago
    const c1 = candles[i - 1]; // 1 bar ago
    const c2 = candles[i];     // Current bar
    
    // Derived properties for current candle c2
    const body2 = Math.abs(c2.close - c2.open);
    const range2 = c2.high - c2.low;
    const bodyMax2 = Math.max(c2.open, c2.close);
    const bodyMin2 = Math.min(c2.open, c2.close);
    const upperWick2 = c2.high - bodyMax2;
    const lowerWick2 = bodyMin2 - c2.low;
    const isGreen2 = c2.close >= c2.open;
    const isRed2 = !isGreen2;

    // Derived properties for previous candle c1
    const body1 = Math.abs(c1.close - c1.open);
    const range1 = c1.high - c1.low;
    const bodyMax1 = Math.max(c1.open, c1.close);
    const bodyMin1 = Math.min(c1.open, c1.close);
    const upperWick1 = c1.high - bodyMax1;
    const lowerWick1 = bodyMin1 - c1.low;
    const isGreen1 = c1.close >= c1.open;
    const isRed1 = !isGreen1;

    // Derived properties for 2 bars ago c0
    const body0 = Math.abs(c0.close - c0.open);
    const range0 = c0.high - c0.low;
    const isRed0 = c0.close < c0.open;
    const isGreen0 = c0.close >= c0.open;

    if (range2 <= 0) continue;

    // 1. DOJI (Body <= 5% of entire candle range)
    if (body2 / range2 <= 0.05) {
      patterns[i] = {
        pattern: "Doji",
        type: "neutral",
        direction: "neutral",
        strength: 0.3,
        desc: "Indecision in the market"
      };
      continue;
    }

    // 2. MARUBOZU (Full body, wicks <= 10% of entire candle range)
    if (body2 / range2 >= 0.90) {
      patterns[i] = {
        pattern: isGreen2 ? "Bullish Marubozu" : "Bearish Marubozu",
        type: "continuation",
        direction: isGreen2 ? "long" : "short",
        strength: 0.7,
        desc: isGreen2 ? "Extremely strong buying pressure" : "Extremely strong selling pressure"
      };
      continue;
    }

    // 3. HAMMER / HANGING MAN (Lower wick >= 2 * body, Upper wick <= 10% of range)
    if (lowerWick2 >= 2 * body2 && upperWick2 <= range2 * 0.1) {
      // Determine if Hammer (reversal at bottom) or Hanging Man (reversal at top)
      // Check if price is in a short-term downtrend (c1.close < c0.close)
      const isDowntrend = c1.close < (c0.close + c0.open) / 2;
      
      patterns[i] = {
        pattern: isDowntrend ? "Hammer" : "Hanging Man",
        type: "reversal",
        direction: isDowntrend ? "long" : "short",
        strength: isDowntrend ? 0.8 : 0.5,
        desc: isDowntrend 
          ? "Bullish reversal signal. Buyers stepped in at the low." 
          : "Potential bearish top signal. Selling pressure starting to emerge."
      };
      continue;
    }

    // 4. SHOOTING STAR / INVERTED HAMMER (Upper wick >= 2 * body, Lower wick <= 10% of range)
    if (upperWick2 >= 2 * body2 && lowerWick2 <= range2 * 0.1) {
      const isUptrend = c1.close > (c0.close + c0.open) / 2;
      
      patterns[i] = {
        pattern: isUptrend ? "Shooting Star" : "Inverted Hammer",
        type: "reversal",
        direction: isUptrend ? "short" : "long",
        strength: isUptrend ? 0.8 : 0.5,
        desc: isUptrend 
          ? "Bearish reversal signal. Sellers rejected higher prices." 
          : "Potential bullish reversal signal. Strong attempt to push price up."
      };
      continue;
    }

    // 5. BULLISH / BEARISH ENGULFING
    if (isRed1 && isGreen2 && c2.open <= c1.close && c2.close > c1.open && body2 > body1) {
      patterns[i] = {
        pattern: "Bullish Engulfing",
        type: "reversal",
        direction: "long",
        strength: 0.85,
        desc: "Bullish engulfing. Buying pressure completely overwhelmed sellers."
      };
      continue;
    }
    if (isGreen1 && isRed2 && c2.open >= c1.close && c2.close < c1.open && body2 > body1) {
      patterns[i] = {
        pattern: "Bearish Engulfing",
        type: "reversal",
        direction: "short",
        strength: 0.85,
        desc: "Bearish engulfing. Selling pressure completely overwhelmed buyers."
      };
      continue;
    }

    // 6. PIERCING LINE (Bullish) / DARK CLOUD COVER (Bearish)
    // Piercing Line: red candle followed by green candle opening below previous low/close and closing above the midpoint of previous body
    if (isRed1 && isGreen2 && c2.open < c1.close && c2.close > (c1.open + c1.close) / 2 && c2.close < c1.open) {
      patterns[i] = {
        pattern: "Piercing Line",
        type: "reversal",
        direction: "long",
        strength: 0.75,
        desc: "Bullish reversal. Green candle closed deep into the previous red candle's body."
      };
      continue;
    }
    // Dark Cloud Cover: green candle followed by red candle opening above previous high/close and closing below midpoint of previous body
    if (isGreen1 && isRed2 && c2.open > c1.close && c2.close < (c1.open + c1.close) / 2 && c2.close > c1.open) {
      patterns[i] = {
        pattern: "Dark Cloud Cover",
        type: "reversal",
        direction: "short",
        strength: 0.75,
        desc: "Bearish reversal. Red candle closed deep into the previous green candle's body."
      };
      continue;
    }

    // 7. HARAMI (Small body inside prior body)
    if (bodyMax2 <= bodyMax1 && bodyMin2 >= bodyMin1 && body2 < body1) {
      const dir = isRed1 && isGreen2 ? "long" : (isGreen1 && isRed2 ? "short" : "neutral");
      patterns[i] = {
        pattern: dir === "long" ? "Bullish Harami" : (dir === "short" ? "Bearish Harami" : "Harami"),
        type: "reversal",
        direction: dir,
        strength: 0.6,
        desc: "Market compression. The previous range is holding the current price action."
      };
      continue;
    }

    // 8. TWEEZER TOPS / BOTTOMS (Equal Highs or Equal Lows within 0.03%)
    const pctDiffHigh = Math.abs(c2.high - c1.high) / Math.max(c2.high, c1.high);
    const pctDiffLow = Math.abs(c2.low - c1.low) / Math.max(c2.low, c1.low);
    if (pctDiffHigh < 0.0003 && isGreen1 && isRed2 && c2.high > c0.high) {
      patterns[i] = {
        pattern: "Tweezer Tops",
        type: "reversal",
        direction: "short",
        strength: 0.7,
        desc: "Double-top rejection at candle wicks. Strong resistance confirmed."
      };
      continue;
    }
    if (pctDiffLow < 0.0003 && isRed1 && isGreen2 && c2.low < c0.low) {
      patterns[i] = {
        pattern: "Tweezer Bottoms",
        type: "reversal",
        direction: "long",
        strength: 0.7,
        desc: "Double-bottom rejection at candle wicks. Strong support confirmed."
      };
      continue;
    }

    // 9. MORNING STAR / EVENING STAR (Three-Bar Reversals)
    // Morning Star: Large Red -> Small body -> Large Green closing > 50% of first candle
    if (isRed0 && Math.abs(c1.close - c1.open) < Math.abs(c0.close - c0.open) * 0.4 && isGreen2 && c2.close > (c0.open + c0.close) / 2) {
      patterns[i] = {
        pattern: "Morning Star",
        type: "reversal",
        direction: "long",
        strength: 0.9,
        desc: "Highly reliable three-bar bullish reversal pattern."
      };
      continue;
    }
    // Evening Star: Large Green -> Small body -> Large Red closing < 50% of first candle
    if (isGreen0 && Math.abs(c1.close - c1.open) < Math.abs(c0.close - c0.open) * 0.4 && isRed2 && c2.close < (c0.open + c0.close) / 2) {
      patterns[i] = {
        pattern: "Evening Star",
        type: "reversal",
        direction: "short",
        strength: 0.9,
        desc: "Highly reliable three-bar bearish reversal pattern."
      };
      continue;
    }

    // 10. THREE WHITE SOLDIERS / THREE BLACK CROWS
    if (isGreen0 && isGreen1 && isGreen2 && c2.close > c1.close && c1.close > c0.close && body2 > range2 * 0.6 && body1 > range1 * 0.6) {
      patterns[i] = {
        pattern: "Three White Soldiers",
        type: "continuation",
        direction: "long",
        strength: 0.85,
        desc: "Strong bullish continuation. Three consecutive solid green candles."
      };
      continue;
    }
    if (isRed0 && isRed1 && isRed2 && c2.close < c1.close && c1.close < c0.close && body2 > range2 * 0.6 && body1 > range1 * 0.6) {
      patterns[i] = {
        pattern: "Three Black Crows",
        type: "continuation",
        direction: "short",
        strength: 0.85,
        desc: "Strong bearish continuation. Three consecutive solid red candles."
      };
      continue;
    }
  }

  return patterns;
}
