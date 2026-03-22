/**
 * Risk Manager
 * Handles: max drawdown, daily loss limits, position limits, alert generation
 */

// In-memory store (use Redis/DB for production)
const state = {
  dailyPnL: 0,
  startOfDayBalance: null,
  openPositions: [],
  alerts: [],
  tradeLog: [],
  lastReset: new Date().toDateString(),
}

// ─── Config Defaults ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  maxDailyLossPercent: 3,       // Stop trading if daily loss > 3%
  maxDrawdownPercent: 10,        // Max allowed drawdown from peak
  maxOpenPositions: 5,           // Max concurrent positions
  maxPositionSizePercent: 10,    // Max single position size as % of balance
  riskPerTradePercent: 1,        // Risk per trade
  trailingStopPercent: 2,        // Trailing stop %
}

// ─── State Management ──────────────────────────────────────────────────────────

export function resetDailyIfNeeded(balance) {
  const today = new Date().toDateString()
  if (state.lastReset !== today) {
    state.dailyPnL = 0
    state.startOfDayBalance = balance
    state.lastReset = today
    addAlert('info', `Daily stats reset. Starting balance: ${balance}`)
  }
  if (!state.startOfDayBalance) state.startOfDayBalance = balance
}

// ─── Risk Checks ───────────────────────────────────────────────────────────────

export function checkCanTrade(balance, config = DEFAULT_CONFIG) {
  resetDailyIfNeeded(balance)
  const issues = []

  // Daily loss check
  if (state.startOfDayBalance) {
    const dailyLossPct = ((state.startOfDayBalance - balance) / state.startOfDayBalance) * 100
    if (dailyLossPct >= config.maxDailyLossPercent) {
      issues.push(`Daily loss limit reached: ${dailyLossPct.toFixed(2)}% (max ${config.maxDailyLossPercent}%)`)
    }
  }

  // Max open positions
  if (state.openPositions.length >= config.maxOpenPositions) {
    issues.push(`Max open positions reached: ${state.openPositions.length}/${config.maxOpenPositions}`)
  }

  if (issues.length > 0) {
    issues.forEach(msg => addAlert('danger', msg))
    return { allowed: false, reasons: issues }
  }

  return { allowed: true, reasons: [] }
}

export function validateOrderSize(balance, orderValueUSD, config = DEFAULT_CONFIG) {
  const pct = (orderValueUSD / balance) * 100
  if (pct > config.maxPositionSizePercent) {
    const maxAllowed = (balance * config.maxPositionSizePercent) / 100
    addAlert('warning', `Order size too large (${pct.toFixed(1)}%). Capped at ${config.maxPositionSizePercent}%`)
    return { valid: false, maxAllowed, message: `Max position size is ${config.maxPositionSizePercent}% of balance ($${maxAllowed.toFixed(2)})` }
  }
  return { valid: true }
}

// ─── Position Tracking ─────────────────────────────────────────────────────────

export function addPosition(position) {
  state.openPositions.push({ ...position, id: position.id || Date.now().toString() })
}

export function removePosition(id) {
  const idx = state.openPositions.findIndex(p => p.id === id)
  if (idx !== -1) {
    const [pos] = state.openPositions.splice(idx, 1)
    return pos
  }
  return null
}

export function updatePnL(pnlChange) {
  state.dailyPnL += pnlChange
  if (Math.abs(pnlChange) > 0) {
    const type = pnlChange >= 0 ? 'profit' : 'loss'
    addAlert(pnlChange >= 0 ? 'success' : 'warning', `Trade closed: ${pnlChange >= 0 ? '+' : ''}$${pnlChange.toFixed(2)} (${type})`)
  }
}

export function getOpenPositions() {
  return state.openPositions
}

// ─── Trailing Stop ─────────────────────────────────────────────────────────────

export function checkTrailingStop(position, currentPrice, trailingPct = 2) {
  const { side, entryPrice, highestPrice, lowestPrice } = position

  if (side === 'buy') {
    const peak = highestPrice || entryPrice
    const newPeak = Math.max(peak, currentPrice)
    position.highestPrice = newPeak
    const stopPrice = newPeak * (1 - trailingPct / 100)
    if (currentPrice <= stopPrice) {
      addAlert('warning', `Trailing stop hit for ${position.symbol} BUY @ ${currentPrice.toFixed(4)}`)
      return { triggered: true, stopPrice }
    }
  } else {
    const trough = lowestPrice || entryPrice
    const newTrough = Math.min(trough, currentPrice)
    position.lowestPrice = newTrough
    const stopPrice = newTrough * (1 + trailingPct / 100)
    if (currentPrice >= stopPrice) {
      addAlert('warning', `Trailing stop hit for ${position.symbol} SELL @ ${currentPrice.toFixed(4)}`)
      return { triggered: true, stopPrice }
    }
  }

  return { triggered: false }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function addAlert(type, message) {
  const alert = {
    id: Date.now().toString() + Math.random(),
    type, // 'info' | 'success' | 'warning' | 'danger'
    message,
    timestamp: new Date().toISOString(),
    read: false,
  }
  state.alerts.unshift(alert)
  if (state.alerts.length > 100) state.alerts = state.alerts.slice(0, 100)
  return alert
}

export function getAlerts(limit = 20) {
  return state.alerts.slice(0, limit)
}

export function markAlertRead(id) {
  const alert = state.alerts.find(a => a.id === id)
  if (alert) alert.read = true
}

export function clearAlerts() {
  state.alerts = []
}

// ─── Trade Log ─────────────────────────────────────────────────────────────────

export function logTrade(trade) {
  state.tradeLog.unshift({ ...trade, timestamp: new Date().toISOString() })
  if (state.tradeLog.length > 500) state.tradeLog = state.tradeLog.slice(0, 500)
}

export function getTradeLog(limit = 50) {
  return state.tradeLog.slice(0, limit)
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function getRiskStats(balance) {
  const winningTrades = state.tradeLog.filter(t => t.pnl > 0)
  const losingTrades = state.tradeLog.filter(t => t.pnl < 0)
  const totalTrades = state.tradeLog.length
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
  const totalPnL = state.tradeLog.reduce((acc, t) => acc + (t.pnl || 0), 0)
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((a, t) => a + t.pnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((a, t) => a + t.pnl, 0) / losingTrades.length) : 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

  return {
    dailyPnL: state.dailyPnL,
    totalPnL,
    winRate: winRate.toFixed(1),
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    openPositions: state.openPositions.length,
    unreadAlerts: state.alerts.filter(a => !a.read).length,
  }
}
