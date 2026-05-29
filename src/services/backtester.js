import { calculateSignalScore } from './scorer';

/**
 * Historical Strategy Backtesting Engine
 * Simulates signal executions over the loaded candle history.
 */
export function runBacktest(candles, cvdHistory, fearAndGreed, settings, runSignalCalculation) {
  const len = candles.length;
  // We need at least 100 candles for a valid historical simulation
  if (len < 100) {
    return {
      trades: [],
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      netProfit: 0,
      equityCurve: [100]
    };
  }

  const trades = [];
  let position = null; // null, or { type: 'LONG'|'SHORT', entryPrice, time }

  // Target ratios (TP: 3%, SL: 1.5%)
  const TP_PCT = 0.03;
  const SL_PCT = 0.015;

  // We start simulating from index 60 to ensure indicators (SMA200, EMA55) have settled
  for (let i = 60; i < len; i++) {
    const candle = candles[i];
    
    // 1. If in a position, check exit conditions (TP/SL)
    if (position) {
      const entry = position.entryPrice;
      const isLong = position.type === 'LONG';
      
      const tpTarget = isLong ? entry * (1 + TP_PCT) : entry * (1 - TP_PCT);
      const slTarget = isLong ? entry * (1 - SL_PCT) : entry * (1 + SL_PCT);
      
      let exitPrice = null;
      let pnl = 0;
      let win = false;
      let exitTime = candle.time;

      if (isLong) {
        // High hits TP first
        if (candle.high >= tpTarget) {
          exitPrice = tpTarget;
          pnl = TP_PCT * 100;
          win = true;
        } 
        // Low hits SL
        else if (candle.low <= slTarget) {
          exitPrice = slTarget;
          pnl = -SL_PCT * 100;
          win = false;
        }
      } else {
        // Low hits TP first (short profit)
        if (candle.low <= tpTarget) {
          exitPrice = tpTarget;
          pnl = TP_PCT * 100;
          win = true;
        } 
        // High hits SL
        else if (candle.high >= slTarget) {
          exitPrice = slTarget;
          pnl = -SL_PCT * 100;
          win = false;
        }
      }

      if (exitPrice !== null) {
        trades.push({
          id: `trade-${position.index}-${i}`,
          type: position.type,
          entryPrice: entry,
          exitPrice,
          pnl,
          win,
          entryTime: new Date(position.time).toLocaleTimeString(),
          exitTime: new Date(exitTime).toLocaleTimeString()
        });
        position = null;
      }
      continue;
    }

    // 2. If NOT in a position, calculate signal at index i (look-back slice)
    const candlesSlice = candles.slice(0, i + 1);
    const cvdSlice = cvdHistory.slice(0, i + 1);
    
    // We run the indicator and score computations Deterministically
    const calc = runSignalCalculation(candlesSlice, cvdSlice, fearAndGreed, settings);
    if (calc && calc.signal && calc.signal.confluencePassed) {
      const rec = calc.signal.recommendation;
      const score = calc.signal.score;
      
      if (rec === 'STRONG LONG') {
        position = {
          type: 'LONG',
          entryPrice: candle.close,
          time: candle.time,
          index: i
        };
      } else if (rec === 'STRONG SHORT') {
        position = {
          type: 'SHORT',
          entryPrice: candle.close,
          time: candle.time,
          index: i
        };
      }
    }
  }

  // Close out active position at final bar if still open
  if (position) {
    const finalPrice = candles[len - 1].close;
    const entry = position.entryPrice;
    const isLong = position.type === 'LONG';
    const pnl = isLong ? ((finalPrice - entry) / entry) * 100 : ((entry - finalPrice) / entry) * 100;
    
    trades.push({
      id: `trade-${position.index}-final`,
      type: position.type,
      entryPrice: entry,
      exitPrice: finalPrice,
      pnl,
      win: pnl > 0,
      entryTime: new Date(position.time).toLocaleTimeString(),
      exitTime: new Date(candles[len - 1].time).toLocaleTimeString()
    });
  }

  // 3. STATISTICAL METRICS CALCULATION
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let equity = 100;
  const equityCurve = [100];
  let peakEquity = 100;
  let maxDrawdown = 0;
  
  const pnls = trades.map(t => t.pnl);

  trades.forEach(t => {
    if (t.win) {
      wins++;
      grossProfit += t.pnl;
    } else {
      losses++;
      grossLoss += Math.abs(t.pnl);
    }
    // Update equity compounding
    equity = equity * (1 + t.pnl / 100);
    equityCurve.push(equity);

    // Calculate drawdown
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const dd = ((peakEquity - equity) / peakEquity) * 100;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  });

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
  const netProfit = equity - 100;

  // Normalized Sharpe Ratio (ratio of average trade return to trade return stddev)
  let sharpeRatio = 0;
  if (total > 1) {
    const avgReturn = pnls.reduce((a, b) => a + b, 0) / total;
    const variance = pnls.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (total - 1);
    const stdDev = Math.sqrt(variance);
    // Sharpe = average excess return / standard deviation
    // We assume risk-free rate is 0 for simulated short-term trades
    sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  }

  return {
    trades,
    winRate,
    profitFactor,
    maxDrawdown,
    sharpeRatio,
    netProfit,
    equityCurve
  };
}
