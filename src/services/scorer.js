/**
 * composite signal scoring engine for trading signals
 */

const DEFAULT_WEIGHTS = {
  rsi: 15,
  macd: 20,
  ma: 15,
  volume: 15,
  cvd: 10,
  pattern: 15,
  sentiment: 10
};

export function calculateSignalScore(data, customWeights = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
  
  // Destructure needed data arrays (we analyze the LAST index)
  const {
    candles,
    rsi,
    rsiDivergences,
    macd, // array of { macd, signal, hist }
    ema9,
    ema21,
    ema55,
    sma200,
    vwap,
    volumeSma,
    obv,
    cvdHistory, // array of CVD numbers matching candle length
    patterns,
    fearAndGreed
  } = data;

  const len = candles.length;
  if (len < 5) {
    return {
      score: 0,
      recommendation: "NEUTRAL",
      breakdown: {},
      confluencePassed: false,
      confluenceCategories: []
    };
  }

  // Index we are scoring: the latest completed candle
  const idx = len - 1;
  const currentCandle = candles[idx];
  const prevCandle = candles[idx - 1];
  
  // Category contributions: each will store { score, maxWeight, direction }
  const breakdown = {
    rsi: { score: 0, max: weights.rsi, direction: "neutral", desc: "No signal" },
    macd: { score: 0, max: weights.macd, direction: "neutral", desc: "No signal" },
    ma: { score: 0, max: weights.ma, direction: "neutral", desc: "No signal" },
    volume: { score: 0, max: weights.volume, direction: "neutral", desc: "No signal" },
    cvd: { score: 0, max: weights.cvd, direction: "neutral", desc: "No signal" },
    pattern: { score: 0, max: weights.pattern, direction: "neutral", desc: "No pattern" },
    sentiment: { score: 0, max: weights.sentiment, direction: "neutral", desc: "Neutral Sentiment" }
  };

  // 1. RSI Scoring (Weight: 15)
  const currentRsi = rsi[idx];
  const rsiDiv = rsiDivergences[idx];
  
  if (currentRsi !== null) {
    let rsiScore = 0;
    if (currentRsi < 30) {
      rsiScore = weights.rsi; // Extreme Oversold (Full Bullish weight)
      breakdown.rsi.desc = `Oversold (${currentRsi.toFixed(1)})`;
    } else if (currentRsi < 35) {
      rsiScore = weights.rsi * 0.7; // Oversold (70% weight)
      breakdown.rsi.desc = `Near Oversold (${currentRsi.toFixed(1)})`;
    } else if (currentRsi > 70) {
      rsiScore = -weights.rsi; // Extreme Overbought (Full Bearish weight)
      breakdown.rsi.desc = `Overbought (${currentRsi.toFixed(1)})`;
    } else if (currentRsi > 65) {
      rsiScore = -weights.rsi * 0.7; // Overbought (70% weight)
      breakdown.rsi.desc = `Near Overbought (${currentRsi.toFixed(1)})`;
    } else {
      breakdown.rsi.desc = `Neutral RSI (${currentRsi.toFixed(1)})`;
    }

    // Incorporate Divergence
    if (rsiDiv) {
      if (rsiDiv.dir === 'long') {
        rsiScore = Math.max(rsiScore, weights.rsi * rsiDiv.strength);
        breakdown.rsi.desc += ` + ${rsiDiv.type}`;
      } else if (rsiDiv.dir === 'short') {
        rsiScore = Math.min(rsiScore, -weights.rsi * rsiDiv.strength);
        breakdown.rsi.desc += ` + ${rsiDiv.type}`;
      }
    }

    breakdown.rsi.score = Math.round(rsiScore);
    breakdown.rsi.direction = rsiScore > 2 ? "long" : rsiScore < -2 ? "short" : "neutral";
  }

  // 2. MACD Scoring (Weight: 20)
  const currentMacd = macd[idx];
  const prevMacd = macd[idx - 1];
  if (currentMacd && currentMacd.macd !== null && currentMacd.signal !== null) {
    let macdScore = 0;
    const isCrossoverLong = currentMacd.macd > currentMacd.signal && prevMacd && prevMacd.macd <= prevMacd.signal;
    const isCrossoverShort = currentMacd.macd < currentMacd.signal && prevMacd && prevMacd.macd >= prevMacd.signal;
    
    // Crossings
    if (isCrossoverLong) {
      macdScore += weights.macd * 0.6; // Bullish Crossover
    } else if (isCrossoverShort) {
      macdScore -= weights.macd * 0.6; // Bearish Crossover
    } else {
      // Inline trend points
      if (currentMacd.macd > currentMacd.signal) {
        macdScore += weights.macd * 0.3; // Bullish alignment
      } else {
        macdScore -= weights.macd * 0.3; // Bearish alignment
      }
    }

    // Histogram momentum
    if (currentMacd.hist !== null && prevMacd && prevMacd.hist !== null) {
      const histDiff = currentMacd.hist - prevMacd.hist;
      if (currentMacd.hist > 0) {
        macdScore += histDiff > 0 ? weights.macd * 0.4 : weights.macd * 0.1;
      } else {
        macdScore += histDiff < 0 ? -weights.macd * 0.4 : -weights.macd * 0.1;
      }
    }

    // Zero-line cross
    const zeroCrossLong = currentMacd.macd > 0 && prevMacd && prevMacd.macd <= 0;
    const zeroCrossShort = currentMacd.macd < 0 && prevMacd && prevMacd.macd >= 0;
    if (zeroCrossLong) macdScore += weights.macd * 0.2;
    if (zeroCrossShort) macdScore -= weights.macd * 0.2;

    // Cap at weight
    macdScore = Math.max(-weights.macd, Math.min(weights.macd, macdScore));
    breakdown.macd.score = Math.round(macdScore);
    breakdown.macd.direction = macdScore > 2 ? "long" : macdScore < -2 ? "short" : "neutral";
    breakdown.macd.desc = macdScore > 0 
      ? `Bullish MACD (${isCrossoverLong ? "Crossover" : "Upward Momentum"})` 
      : `Bearish MACD (${isCrossoverShort ? "Crossover" : "Downward Momentum"})`;
  }

  // 3. MA Alignment Scoring (Weight: 15)
  const cPrice = currentCandle.close;
  const e9 = ema9[idx];
  const e21 = ema21[idx];
  const e55 = ema55[idx];
  const s200 = sma200[idx];
  const v = vwap[idx];

  if (e9 !== null && e21 !== null && e55 !== null) {
    let maScore = 0;
    let descParts = [];

    // EMA stacks
    if (cPrice > e9 && e9 > e21 && e21 > e55) {
      maScore += weights.ma * 0.6; // Strong Bullish Alignment
      descParts.push("EMA stack Bullish");
    } else if (cPrice < e9 && e9 < e21 && e21 < e55) {
      maScore -= weights.ma * 0.6; // Strong Bearish Alignment
      descParts.push("EMA stack Bearish");
    } else {
      if (cPrice > e21) maScore += weights.ma * 0.2;
      else maScore -= weights.ma * 0.2;
    }

    // SMA 200 bias
    if (s200 !== null) {
      if (cPrice > s200) {
        maScore += weights.ma * 0.2;
        descParts.push("Above SMA200");
      } else {
        maScore -= weights.ma * 0.2;
        descParts.push("Below SMA200");
      }
    }

    // VWAP bias
    if (v !== null) {
      if (cPrice > v) {
        maScore += weights.ma * 0.2;
        descParts.push("Above VWAP");
      } else {
        maScore -= weights.ma * 0.2;
        descParts.push("Below VWAP");
      }
    }

    maScore = Math.max(-weights.ma, Math.min(weights.ma, maScore));
    breakdown.ma.score = Math.round(maScore);
    breakdown.ma.direction = maScore > 1 ? "long" : maScore < -1 ? "short" : "neutral";
    breakdown.ma.desc = descParts.join(", ") || "Neutral Moving Averages";
  }

  // 4. Volume Confirmation (Weight: 15)
  const volSma = volumeSma[idx];
  const currentVol = currentCandle.volume;
  const priceChange = (cPrice - prevCandle.close) / prevCandle.close;
  
  if (volSma !== null && volSma > 0) {
    let volScore = 0;
    const volRatio = currentVol / volSma;
    const isSpike = volRatio > 1.8;
    
    if (isSpike) {
      if (priceChange > 0.001) {
        volScore += weights.volume * 0.75; // Bullish volume spike
        breakdown.volume.desc = `Bullish Volume Spike (Ratio: ${volRatio.toFixed(1)}x)`;
      } else if (priceChange < -0.001) {
        volScore -= weights.volume * 0.75; // Bearish volume spike
        breakdown.volume.desc = `Bearish Volume Spike (Ratio: ${volRatio.toFixed(1)}x)`;
      }
    } else {
      breakdown.volume.desc = `Normal Volume (Ratio: ${volRatio.toFixed(1)}x)`;
    }

    // OBV check
    if (obv[idx] !== null && obv[idx - 3] !== null) {
      const obvTrend = obv[idx] - obv[idx - 3];
      if (obvTrend > 0 && priceChange > 0) {
        volScore += weights.volume * 0.25;
      } else if (obvTrend < 0 && priceChange < 0) {
        volScore -= weights.volume * 0.25;
      }
    }

    volScore = Math.max(-weights.volume, Math.min(weights.volume, volScore));
    breakdown.volume.score = Math.round(volScore);
    breakdown.volume.direction = volScore > 2 ? "long" : volScore < -2 ? "short" : "neutral";
  }

  // 5. CVD Trend Scoring (Weight: 10)
  if (cvdHistory && cvdHistory.length > idx && cvdHistory[idx] !== null) {
    let cvdScore = 0;
    const currentCvd = cvdHistory[idx];
    const prevCvd = cvdHistory[idx - 3] || cvdHistory[idx - 1] || 0;
    const cvdChange = currentCvd - prevCvd;

    if (cvdChange > 0) {
      cvdScore += weights.cvd;
      breakdown.cvd.desc = "Rising CVD (Aggressive Buyers)";
    } else if (cvdChange < 0) {
      cvdScore -= weights.cvd;
      breakdown.cvd.desc = "Falling CVD (Aggressive Sellers)";
    } else {
      breakdown.cvd.desc = "Flat CVD";
    }

    breakdown.cvd.score = Math.round(cvdScore);
    breakdown.cvd.direction = cvdScore > 0 ? "long" : cvdScore < 0 ? "short" : "neutral";
  }

  // 6. Candlestick Pattern Scoring (Weight: 15)
  const pattern = patterns[idx];
  if (pattern) {
    let patternScore = 0;
    if (pattern.direction === 'long') {
      patternScore = weights.pattern * pattern.strength;
    } else if (pattern.direction === 'short') {
      patternScore = -weights.pattern * pattern.strength;
    }

    breakdown.pattern.score = Math.round(patternScore);
    breakdown.pattern.direction = pattern.direction;
    breakdown.pattern.desc = `${pattern.pattern} detected (strength: ${pattern.strength})`;
  }

  // 7. Fear & Greed / Funding Sentiment (Weight: 10)
  if (fearAndGreed !== undefined && fearAndGreed !== null) {
    let fngScore = 0;
    const val = fearAndGreed.value;
    
    if (val <= 20) {
      fngScore += weights.sentiment; // Extreme Fear -> Contrarian Bullish
      breakdown.sentiment.desc = `Extreme Fear (${val}) - Contrarian Buy`;
    } else if (val <= 35) {
      fngScore += weights.sentiment * 0.5;
      breakdown.sentiment.desc = `Fear (${val})`;
    } else if (val >= 80) {
      fngScore -= weights.sentiment; // Extreme Greed -> Contrarian Bearish
      breakdown.sentiment.desc = `Extreme Greed (${val}) - Contrarian Sell`;
    } else if (val >= 65) {
      fngScore -= weights.sentiment * 0.5;
      breakdown.sentiment.desc = `Greed (${val})`;
    } else {
      breakdown.sentiment.desc = `Neutral Sentiment (${val})`;
    }

    breakdown.sentiment.score = Math.round(fngScore);
    breakdown.sentiment.direction = fngScore > 1 ? "long" : fngScore < -1 ? "short" : "neutral";
  }

  // Compile Raw Weighted Score
  let totalWeightedScore = 0;
  let totalWeightsUsed = 0;
  
  for (const key in breakdown) {
    totalWeightedScore += breakdown[key].score;
    totalWeightsUsed += breakdown[key].max;
  }

  // Normalize score between -100 and +100
  // Formula: (sum_of_scores / sum_of_max_weights) * 100
  let finalNormalizedScore = totalWeightsUsed > 0 ? (totalWeightedScore / totalWeightsUsed) * 100 : 0;
  finalNormalizedScore = Math.max(-100, Math.min(100, finalNormalizedScore));

  // Determine Confluence
  // Category agrees if direction is non-neutral
  const categoriesAgreeingLong = [];
  const categoriesAgreeingShort = [];

  for (const key in breakdown) {
    if (breakdown[key].direction === "long") {
      categoriesAgreeingLong.push(key);
    } else if (breakdown[key].direction === "short") {
      categoriesAgreeingShort.push(key);
    }
  }

  const longAgreeCount = categoriesAgreeingLong.length;
  const shortAgreeCount = categoriesAgreeingShort.length;
  
  let confluencePassed = false;
  let confluenceCategories = [];
  let recommendation = "NEUTRAL";

  // Score thresholds
  if (finalNormalizedScore >= 30) {
    confluencePassed = longAgreeCount >= 3;
    confluenceCategories = categoriesAgreeingLong;
    if (confluencePassed) {
      recommendation = finalNormalizedScore > 60 ? "STRONG LONG" : "WEAK LONG";
    } else {
      recommendation = "NEUTRAL (No Confluence)";
    }
  } else if (finalNormalizedScore <= -30) {
    confluencePassed = shortAgreeCount >= 3;
    confluenceCategories = categoriesAgreeingShort;
    if (confluencePassed) {
      recommendation = finalNormalizedScore < -60 ? "STRONG SHORT" : "WEAK SHORT";
    } else {
      recommendation = "NEUTRAL (No Confluence)";
    }
  } else {
    confluencePassed = false;
    recommendation = "NEUTRAL";
  }

  return {
    score: Math.round(finalNormalizedScore),
    recommendation,
    breakdown,
    confluencePassed,
    confluenceCategories
  };
}
