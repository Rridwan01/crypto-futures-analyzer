/**
 * Quantitative Regime-Aware & Domain-Based Confluence Scoring Engine
 */

// Define standard domain weights per market regime
const REGIME_WEIGHTS = {
  TREND_EXPANSION: {
    trend: 40,
    momentum: 10,       // Discount oscillators in strong trends
    volatility: 10,
    volumeFlow: 25,
    priceAction: 15,
    sentiment: 5
  },
  MEAN_REVERSION: {
    trend: 10,          // Discount trend indicators in choppy ranges
    momentum: 40,       // Boost oscillators for range trading
    volatility: 20,     // High relevance for Bollinger limits
    volumeFlow: 10,
    priceAction: 15,
    sentiment: 5
  },
  COMPRESSION: {
    trend: 20,
    momentum: 20,
    volatility: 30,     // Squeeze indicators weighted heavily
    volumeFlow: 15,
    priceAction: 10,
    sentiment: 5
  },
  VOLATILE_DISTRIBUTION: {
    trend: 15,
    momentum: 15,
    volatility: 30,     // High volatility wicks
    volumeFlow: 20,
    priceAction: 15,
    sentiment: 5
  }
};

/**
 * Main Scoring Engine
 * Incorporates Market Regime detection, Domain categorization, Contextual PA, and HTF Bias mod.
 */
export function calculateSignalScore(data, customWeights = {}, htfBias = null) {
  const {
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
    fearAndGreed,
    volumeProfile
  } = data;

  const len = candles.length;
  if (len < 20) {
    return {
      score: 0,
      recommendation: "NEUTRAL",
      breakdown: {},
      confluencePassed: false,
      confluenceCategories: [],
      regime: "UNKNOWN",
      positives: [],
      negatives: [],
      alignment: "LOW"
    };
  }

  const idx = len - 1;
  const currentCandle = candles[idx];
  const prevCandle = candles[idx - 1];
  const cPrice = currentCandle.close;

  // 1. REGIME DETECTION
  let regime = "MEAN_REVERSION";
  let regimeDesc = "Sideways range consolidation";
  
  // Calculate average Bollinger bandwidth or ATR changes to see if volatility is expanding
  // Let's compute average price distance to EMA21 over last 15 candles
  let crossesCount = 0;
  let priceDiffs = 0;
  const ema21Len = Math.min(15, len - 2);
  for (let i = idx - ema21Len; i <= idx; i++) {
    if (ema21[i] !== null) {
      priceDiffs += Math.abs(candles[i].close - ema21[i]);
      // Count crosses
      if (i > 0 && ema21[i - 1] !== null) {
        const wasAbove = candles[i - 1].close > ema21[i - 1];
        const isAbove = candles[i].close > ema21[i];
        if (wasAbove !== isAbove) crossesCount++;
      }
    }
  }

  const isEmaBullish = ema9[idx] > ema21[idx] && ema21[idx] > ema55[idx];
  const isEmaBearish = ema9[idx] < ema21[idx] && ema21[idx] < ema55[idx];
  
  // Identify Trend Expansion
  if ((isEmaBullish || isEmaBearish) && crossesCount <= 2 && sma200[idx] !== null) {
    regime = "TREND_EXPANSION";
    regimeDesc = "Trending expansion phase";
  } 
  // Identify Volatility Compression (low crosses, flat prices)
  else if (crossesCount > 4 && priceDiffs / ema21Len < cPrice * 0.0015) {
    regime = "COMPRESSION";
    regimeDesc = "Low-volatility compression squeeze";
  }
  // Volatile Distribution
  else if (crossesCount > 3 && priceDiffs / ema21Len >= cPrice * 0.003) {
    regime = "VOLATILE_DISTRIBUTION";
    regimeDesc = "High-volatility choppy distribution";
  }

  const domainWeights = REGIME_WEIGHTS[regime];

  // Positive / Negative Explanations Lists
  const positives = [];
  const negatives = [];

  // 2. DOMAIN CALCULATIONS

  // A. Trend Domain (EMA alignment, SMA200, VWAP)
  let trendScore = 0; // -100 to +100
  if (ema9[idx] !== null && ema21[idx] !== null && ema55[idx] !== null) {
    if (isEmaBullish) {
      trendScore += 60;
      positives.push("Bullish EMA Stack (9 > 21 > 55)");
    } else if (isEmaBearish) {
      trendScore -= 60;
      negatives.push("Bearish EMA Stack (9 < 21 < 55)");
    }
    
    if (sma200[idx] !== null) {
      if (cPrice > sma200[idx]) {
        trendScore += 20;
        positives.push("Price above long-term SMA 200");
      } else {
        trendScore -= 20;
        negatives.push("Price below long-term SMA 200");
      }
    }

    if (vwap[idx] !== null) {
      if (cPrice > vwap[idx]) {
        trendScore += 20;
        positives.push("Price above intraday VWAP");
      } else {
        trendScore -= 20;
        negatives.push("Price below intraday VWAP");
      }
    }
  }

  // B. Momentum Domain (RSI, MACD)
  let momentumScore = 0;
  const currentRsi = rsi[idx];
  const rsiDiv = rsiDivergences[idx];
  if (currentRsi !== null) {
    if (currentRsi < 30) {
      momentumScore += 50;
      positives.push(`Oversold RSI (${currentRsi.toFixed(1)})`);
    } else if (currentRsi > 70) {
      momentumScore -= 50;
      negatives.push(`Overbought RSI (${currentRsi.toFixed(1)})`);
    }

    if (rsiDiv) {
      if (rsiDiv.dir === 'long') {
        momentumScore += 40 * rsiDiv.strength;
        positives.push(`RSI ${rsiDiv.type} detected`);
      } else {
        momentumScore -= 40 * rsiDiv.strength;
        negatives.push(`RSI ${rsiDiv.type} detected`);
      }
    }
  }

  const currentMacd = macd[idx];
  const prevMacd = macd[idx - 1];
  if (currentMacd && currentMacd.macd !== null && currentMacd.signal !== null) {
    const crossoverLong = currentMacd.macd > currentMacd.signal && prevMacd && prevMacd.macd <= prevMacd.signal;
    const crossoverShort = currentMacd.macd < currentMacd.signal && prevMacd && prevMacd.macd >= prevMacd.signal;
    
    if (crossoverLong) {
      momentumScore += 30;
      positives.push("MACD Bullish Crossover");
    } else if (crossoverShort) {
      momentumScore -= 30;
      negatives.push("MACD Bearish Crossover");
    } else if (currentMacd.macd > currentMacd.signal) {
      momentumScore += 10;
    } else {
      momentumScore -= 10;
    }
  }
  momentumScore = Math.max(-100, Math.min(100, momentumScore));

  // C. Volatility Domain (Bollinger BB position, ATR stretch)
  let volatilityScore = 0;
  // Look up if we have BB bands
  // If close is near BB upper, it represents resistance (bearish signal for range setups)
  // If close is near BB lower, it represents support (bullish signal for range setups)
  // Let's check where the price stands relative to the bands
  // (In useTradingStore BB calculations return array of { upper, middle, lower })
  // We can look at this in the store
  const { bb } = data;
  if (bb && bb[idx] && bb[idx].upper !== null && bb[idx].lower !== null) {
    const bUpper = bb[idx].upper;
    const bLower = bb[idx].lower;
    const range = bUpper - bLower || 1;
    const position = (cPrice - bLower) / range; // 0 (lower band) to 1 (upper band)
    
    if (position <= 0.15) {
      volatilityScore += 70;
      positives.push("Reaching Bollinger Band Lower Support");
    } else if (position >= 0.85) {
      volatilityScore -= 70;
      negatives.push("Reaching Bollinger Band Upper Resistance");
    }
  }
  volatilityScore = Math.max(-100, Math.min(100, volatilityScore));

  // D. Volume & Flow Domain (OBV momentum, Volume spikes, CVD buys/sells)
  let volumeFlowScore = 0;
  const volSma = volumeSma[idx];
  const currentVol = currentCandle.volume;
  if (volSma !== null && volSma > 0) {
    const volRatio = currentVol / volSma;
    const priceChange = (cPrice - prevCandle.close) / prevCandle.close;
    if (volRatio > 1.6) {
      if (priceChange > 0.001) {
        volumeFlowScore += 40;
        positives.push(`Bullish breakout volume (${volRatio.toFixed(1)}x spike)`);
      } else if (priceChange < -0.001) {
        volumeFlowScore -= 40;
        negatives.push(`Bearish distribution volume (${volRatio.toFixed(1)}x spike)`);
      }
    }
  }

  if (cvdHistory && cvdHistory.length > idx && cvdHistory[idx] !== null) {
    const currentCvd = cvdHistory[idx];
    const prevCvd = cvdHistory[idx - 3] || cvdHistory[idx - 1] || 0;
    const cvdChange = currentCvd - prevCvd;
    
    if (cvdChange > 0) {
      volumeFlowScore += 50;
      positives.push("CVD Buyers buying aggressive market delta");
    } else if (cvdChange < 0) {
      volumeFlowScore -= 50;
      negatives.push("CVD Sellers selling aggressive market delta");
    }
  }
  volumeFlowScore = Math.max(-100, Math.min(100, volumeFlowScore));

  // E. Contextual Price Action Domain (Candlestick Patterns validated by location/volume)
  let priceActionScore = 0;
  const pattern = patterns[idx];
  if (pattern) {
    const isBullishPattern = pattern.direction === 'long';
    const isBearishPattern = pattern.direction === 'short';
    let isPatternContextValid = false;
    
    // Validate Bullish patterns against supports (BB lower, Volume Profile VAL, or RSI oversold)
    if (isBullishPattern) {
      const nearVal = volumeProfile && volumeProfile.val ? cPrice <= volumeProfile.val * 1.002 : false;
      const rsiOversold = currentRsi !== null && currentRsi < 42;
      const nearBbLower = bb && bb[idx] && bb[idx].upper !== null && (cPrice <= bb[idx].lower + 0.2 * (bb[idx].upper - bb[idx].lower));
      
      if (nearVal || rsiOversold || nearBbLower) {
        isPatternContextValid = true;
        priceActionScore += 100 * pattern.strength;
        positives.push(`Context-validated Bullish ${pattern.pattern} at Support`);
      } else {
        // Pattern in neutral territory gets heavily penalized
        priceActionScore += 20 * pattern.strength;
        positives.push(`Weak Bullish ${pattern.pattern} (neutral zone, unconfirmed)`);
      }
    } 
    // Validate Bearish patterns against resistances (BB upper, Volume Profile VAH, or RSI overbought)
    else if (isBearishPattern) {
      const nearVah = volumeProfile && volumeProfile.vah ? cPrice >= volumeProfile.vah * 0.998 : false;
      const rsiOverbought = currentRsi !== null && currentRsi > 58;
      const nearBbUpper = bb && bb[idx] && bb[idx].upper !== null && (cPrice >= bb[idx].upper - 0.2 * (bb[idx].upper - bb[idx].lower));
      
      if (nearVah || rsiOverbought || nearBbUpper) {
        isPatternContextValid = true;
        priceActionScore -= 100 * pattern.strength;
        negatives.push(`Context-validated Bearish ${pattern.pattern} at Resistance`);
      } else {
        priceActionScore -= 20 * pattern.strength;
        negatives.push(`Weak Bearish ${pattern.pattern} (neutral zone, unconfirmed)`);
      }
    }
  }

  // F. Sentiment Domain (Fear & Greed Contrarian Scoring)
  let sentimentScore = 0;
  if (fearAndGreed && fearAndGreed.value !== undefined) {
    const val = fearAndGreed.value;
    if (val <= 25) {
      sentimentScore += 100;
      positives.push(`Contrarian sentiment: Extreme Fear (${val})`);
    } else if (val <= 40) {
      sentimentScore += 55;
      positives.push(`Contrarian sentiment: Fear (${val})`);
    } else if (val >= 75) {
      sentimentScore -= 100;
      negatives.push(`Contrarian sentiment: Extreme Greed (${val})`);
    } else if (val >= 60) {
      sentimentScore -= 55;
      negatives.push(`Contrarian sentiment: Greed (${val})`);
    }
  }

  // 3. COMPILE BASE WEIGHTED SCORE
  const breakdown = {
    trend: { score: Math.round(trendScore), max: domainWeights.trend, desc: trendScore >= 20 ? "Bullish trend structure" : trendScore <= -20 ? "Bearish trend structure" : "Choppy trend alignment" },
    momentum: { score: Math.round(momentumScore), max: domainWeights.momentum, desc: momentumScore >= 20 ? "Bullish momentum acceleration" : momentumScore <= -20 ? "Bearish momentum acceleration" : "Neutral momentum" },
    volatility: { score: Math.round(volatilityScore), max: domainWeights.volatility, desc: volatilityScore >= 20 ? "At Bollinger Band Support" : volatilityScore <= -20 ? "At Bollinger Band Resistance" : "Neutral volatility range" },
    volumeFlow: { score: Math.round(volumeFlowScore), max: domainWeights.volumeFlow, desc: volumeFlowScore >= 20 ? "Aggressive buying pressure" : volumeFlowScore <= -20 ? "Aggressive selling pressure" : "Neutral delta flow" },
    priceAction: { score: Math.round(priceActionScore), max: domainWeights.priceAction, desc: priceActionScore >= 20 ? "Bullish PA pattern" : priceActionScore <= -20 ? "Bearish PA pattern" : "No PA patterns" },
    sentiment: { score: Math.round(sentimentScore), max: domainWeights.sentiment, desc: sentimentScore >= 20 ? "Bullish Contrarian Sentiment" : sentimentScore <= -20 ? "Bearish Contrarian Sentiment" : "Neutral Sentiment" }
  };

  let totalWeightedScore = 0;
  let totalWeightsUsed = 0;
  for (const key in breakdown) {
    const item = breakdown[key];
    // Map -100 to 100 domain score into weight contribution
    const contribution = (item.score / 100) * item.max;
    totalWeightedScore += contribution;
    totalWeightsUsed += item.max;
  }

  let finalBaseScore = totalWeightsUsed > 0 ? (totalWeightedScore / totalWeightsUsed) * 100 : 0;
  finalBaseScore = Math.max(-100, Math.min(100, finalBaseScore));

  // 4. APPLY HTF BIAS GATES (Confidence Multipliers)
  let score = Math.round(finalBaseScore);
  let biasDescription = "No HTF bias context";
  let htfStatus = "NEUTRAL";
  
  if (htfBias) {
    htfStatus = htfBias.bias;
    biasDescription = htfBias.description;
    
    if (finalBaseScore > 0) {
      // Long Bias Multipliers
      score = Math.round(finalBaseScore * htfBias.longMultiplier);
      if (htfBias.longMultiplier > 1.0) {
        positives.push(`HTF Bias confirmation: ${htfBias.bias} (${htfBias.longMultiplier}x boost)`);
      } else if (htfBias.longMultiplier < 1.0) {
        negatives.push(`HTF Bias conflict: ${htfBias.bias} (${htfBias.longMultiplier}x penalty)`);
      }
    } else if (finalBaseScore < 0) {
      // Short Bias Multipliers
      score = Math.round(finalBaseScore * htfBias.shortMultiplier);
      if (htfBias.shortMultiplier > 1.0) {
        negatives.push(`HTF Bias confirmation: ${htfBias.bias} (${htfBias.shortMultiplier}x boost)`);
      } else if (htfBias.shortMultiplier < 1.0) {
        positives.push(`HTF Bias conflict: ${htfBias.bias} (${htfBias.shortMultiplier}x penalty)`);
      }
    }
  }

  // Cap final score bounds
  score = Math.max(-100, Math.min(100, score));

  // 5. DETERMINISTIC CONFLUENCE PASS CHECKS
  // Confluence counts how many active domains agree in direction
  let longAgreeCount = 0;
  let shortAgreeCount = 0;
  const categoriesAgreeingLong = [];
  const categoriesAgreeingShort = [];

  for (const key in breakdown) {
    if (breakdown[key].score > 15) {
      longAgreeCount++;
      categoriesAgreeingLong.push(key);
    } else if (breakdown[key].score < -15) {
      shortAgreeCount++;
      categoriesAgreeingShort.push(key);
    }
  }

  // Set alignment quality
  let alignment = "LOW";
  let isAligned = false;
  let recommendation = "NEUTRAL";
  let confluencePassed = false;
  let confluenceCategories = [];

  if (score >= 30) {
    confluencePassed = longAgreeCount >= 3;
    confluenceCategories = categoriesAgreeingLong;
    isAligned = htfStatus.includes("BULLISH");
    
    if (confluencePassed) {
      recommendation = score > 60 ? "STRONG LONG" : "WEAK LONG";
    } else {
      recommendation = "NEUTRAL (No Confluence)";
    }
  } else if (score <= -30) {
    confluencePassed = shortAgreeCount >= 3;
    confluenceCategories = categoriesAgreeingShort;
    isAligned = htfStatus.includes("BEARISH");
    
    if (confluencePassed) {
      recommendation = score < -60 ? "STRONG SHORT" : "WEAK SHORT";
    } else {
      recommendation = "NEUTRAL (No Confluence)";
    }
  }

  if (confluencePassed) {
    if (isAligned && (htfStatus.startsWith("STRONG") || htfStatus === "BULLISH" || htfStatus === "BEARISH")) {
      alignment = "HIGH";
    } else if (htfStatus === "NEUTRAL") {
      alignment = "MODERATE";
    } else {
      alignment = "COUNTER_TREND";
    }
  } else {
    alignment = "LOW";
  }

  return {
    score,
    recommendation,
    breakdown,
    confluencePassed,
    confluenceCategories,
    regime,
    regimeDesc,
    positives: positives.slice(0, 5), // return top 5
    negatives: negatives.slice(0, 5),
    alignment
  };
}
