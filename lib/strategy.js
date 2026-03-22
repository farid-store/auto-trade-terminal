/**
 * Trading Strategy Engine
 * Supports: RSI, MACD, EMA Cross, Bollinger Bands, Combined
 */

// ─── Indicators ────────────────────────────────────────────────────────────────

export function calcSMA(closes, period) {
  const result = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    result.push(slice.reduce((a, b) => a + b, 0) / period)
  }
  return result
}

export function calcEMA(closes, period) {
  const k = 2 / (period + 1)
  const result = []
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    if (i === period - 1) { result.push(ema); continue }
    ema = closes[i] * k + ema * (1 - k)
    result.push(ema)
  }
  return result
}

export function calcRSI(closes, period = 14) {
  const result = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(null); continue }
    const gains = [], losses = []
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1]
      gains.push(diff > 0 ? diff : 0)
      losses.push(diff < 0 ? Math.abs(diff) : 0)
    }
    const avgGain = gains.reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period
    if (avgLoss === 0) { result.push(100); continue }
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macdLine = closes.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i] - emaSlow[i] : null
  )
  const validMacd = macdLine.filter(v => v !== null)
  const signalRaw = calcEMA(validMacd, signal)
  let sigIdx = 0
  const signalLine = macdLine.map(v => {
    if (v === null) return null
    return signalRaw[sigIdx++] ?? null
  })
  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i] : null
  )
  return { macdLine, signalLine, histogram }
}

export function calcBollingerBands(closes, period = 20, stdDev = 2) {
  const sma = calcSMA(closes, period)
  const upper = [], lower = [], middle = sma
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = sma[i]
    const variance = slice.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / period
    const sd = Math.sqrt(variance)
    upper.push(mean + stdDev * sd)
    lower.push(mean - stdDev * sd)
  }
  return { upper, middle, lower }
}

export function calcATR(candles, period = 14) {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low
    const prev = candles[i - 1]
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close))
  })
  return calcSMA(trs, period)
}

// ─── Signals ────────────────────────────────────────────────────────────────────

/**
 * Returns 'buy', 'sell', or 'hold'
 */
export function rsiStrategy(candles, { oversold = 30, overbought = 70, period = 14 } = {}) {
  const closes = candles.map(c => c.close)
  const rsi = calcRSI(closes, period)
  const last = rsi[rsi.length - 1]
  const prev = rsi[rsi.length - 2]
  if (last === null || prev === null) return { signal: 'hold', rsi: last }
  if (prev <= oversold && last > oversold) return { signal: 'buy', rsi: last, reason: `RSI crossed above ${oversold}` }
  if (prev >= overbought && last < overbought) return { signal: 'sell', rsi: last, reason: `RSI crossed below ${overbought}` }
  return { signal: 'hold', rsi: last }
}

export function emaCrossStrategy(candles, { fastPeriod = 9, slowPeriod = 21 } = {}) {
  const closes = candles.map(c => c.close)
  const fast = calcEMA(closes, fastPeriod)
  const slow = calcEMA(closes, slowPeriod)
  const lastFast = fast[fast.length - 1]
  const lastSlow = slow[slow.length - 1]
  const prevFast = fast[fast.length - 2]
  const prevSlow = slow[slow.length - 2]
  if (!lastFast || !lastSlow || !prevFast || !prevSlow) return { signal: 'hold' }
  if (prevFast <= prevSlow && lastFast > lastSlow) return { signal: 'buy', reason: `EMA${fastPeriod} crossed above EMA${slowPeriod}` }
  if (prevFast >= prevSlow && lastFast < lastSlow) return { signal: 'sell', reason: `EMA${fastPeriod} crossed below EMA${slowPeriod}` }
  return { signal: 'hold', fastEMA: lastFast, slowEMA: lastSlow }
}

export function macdStrategy(candles, { fast = 12, slow = 26, signal = 9 } = {}) {
  const closes = candles.map(c => c.close)
  const { macdLine, signalLine, histogram } = calcMACD(closes, fast, slow, signal)
  const lastMACD = macdLine[macdLine.length - 1]
  const lastSignal = signalLine[signalLine.length - 1]
  const prevMACD = macdLine[macdLine.length - 2]
  const prevSignal = signalLine[signalLine.length - 2]
  if (!lastMACD || !lastSignal || !prevMACD || !prevSignal) return { signal: 'hold' }
  if (prevMACD <= prevSignal && lastMACD > lastSignal) return { signal: 'buy', reason: 'MACD crossed above signal' }
  if (prevMACD >= prevSignal && lastMACD < lastSignal) return { signal: 'sell', reason: 'MACD crossed below signal' }
  return { signal: 'hold', macd: lastMACD, signalLine: lastSignal, histogram: histogram[histogram.length - 1] }
}

export function bollingerStrategy(candles, { period = 20, stdDev = 2 } = {}) {
  const closes = candles.map(c => c.close)
  const { upper, lower, middle } = calcBollingerBands(closes, period, stdDev)
  const lastClose = closes[closes.length - 1]
  const prevClose = closes[closes.length - 2]
  const lastUpper = upper[upper.length - 1]
  const lastLower = lower[lower.length - 1]
  const prevUpper = upper[upper.length - 2]
  const prevLower = lower[lower.length - 2]
  if (!lastUpper || !lastLower) return { signal: 'hold' }
  if (prevClose <= prevLower && lastClose > lastLower) return { signal: 'buy', reason: 'Price bounced off lower BB' }
  if (prevClose >= prevUpper && lastClose < lastUpper) return { signal: 'sell', reason: 'Price rejected upper BB' }
  return { signal: 'hold', upper: lastUpper, lower: lastLower, middle: middle[middle.length - 1] }
}

// ─── Combined Strategy ──────────────────────────────────────────────────────────

export function combinedStrategy(candles, config = {}) {
  const rsiResult = rsiStrategy(candles, config.rsi || {})
  const emaResult = emaCrossStrategy(candles, config.ema || {})
  const macdResult = macdStrategy(candles, config.macd || {})
  const bbResult = bollingerStrategy(candles, config.bb || {})

  const signals = [rsiResult.signal, emaResult.signal, macdResult.signal, bbResult.signal]
  const buyCount = signals.filter(s => s === 'buy').length
  const sellCount = signals.filter(s => s === 'sell').length

  let signal = 'hold'
  let confidence = 0
  const reasons = []

  if (buyCount >= 2) {
    signal = 'buy'
    confidence = buyCount / signals.length
    if (rsiResult.signal === 'buy') reasons.push(rsiResult.reason)
    if (emaResult.signal === 'buy') reasons.push(emaResult.reason)
    if (macdResult.signal === 'buy') reasons.push(macdResult.reason)
    if (bbResult.signal === 'buy') reasons.push(bbResult.reason)
  } else if (sellCount >= 2) {
    signal = 'sell'
    confidence = sellCount / signals.length
    if (rsiResult.signal === 'sell') reasons.push(rsiResult.reason)
    if (emaResult.signal === 'sell') reasons.push(emaResult.reason)
    if (macdResult.signal === 'sell') reasons.push(macdResult.reason)
    if (bbResult.signal === 'sell') reasons.push(bbResult.reason)
  }

  return {
    signal,
    confidence: Math.round(confidence * 100),
    reasons,
    indicators: {
      rsi: rsiResult.rsi,
      ema: { fast: emaResult.fastEMA, slow: emaResult.slowEMA },
      macd: { value: macdResult.macd, signal: macdResult.signalLine, histogram: macdResult.histogram },
      bb: { upper: bbResult.upper, lower: bbResult.lower, middle: bbResult.middle },
    },
  }
}

// ─── Position Sizing ────────────────────────────────────────────────────────────

export function calcPositionSize({ balance, riskPercent = 1, entryPrice, stopLossPrice }) {
  const riskAmount = balance * (riskPercent / 100)
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice)
  if (riskPerUnit === 0) return 0
  return riskAmount / riskPerUnit
}

export function calcStopLoss(candles, side, atrMultiplier = 2) {
  const atrs = calcATR(candles)
  const atr = atrs[atrs.length - 1]
  const lastClose = candles[candles.length - 1].close
  if (side === 'buy') return lastClose - atr * atrMultiplier
  return lastClose + atr * atrMultiplier
}

export function calcTakeProfit(entryPrice, stopLoss, riskRewardRatio = 2) {
  const risk = Math.abs(entryPrice - stopLoss)
  if (entryPrice > stopLoss) return entryPrice + risk * riskRewardRatio
  return entryPrice - risk * riskRewardRatio
}
