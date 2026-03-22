/**
 * /api/bot
 * POST /api/bot { action: 'start'|'stop'|'status'|'run_once', config }
 * GET  /api/bot
 */

import { getBinanceOHLCV, getBinanceTicker } from '../../lib/binance'
import { getBybitOHLCV, getBybitTicker } from '../../lib/bybit'
import { getOKXOHLCV, getOKXTicker } from '../../lib/okx'
import { mt5GetOHLCV, mt5GetTicker } from '../../lib/mt5bridge'
import { combinedStrategy, rsiStrategy, emaCrossStrategy, macdStrategy, bollingerStrategy, calcStopLoss, calcTakeProfit, calcPositionSize } from '../../lib/strategy'
import { checkCanTrade, addAlert, logTrade, getOpenPositions } from '../../lib/riskManager'

// In-memory bot state (use Redis/DB for persistent multi-instance)
const botState = {
  running: false,
  config: null,
  lastSignal: null,
  lastRun: null,
  runCount: 0,
  errors: [],
}

// ─── Strategy Selector ─────────────────────────────────────────────────────────

async function fetchCandles(exchange, symbol, timeframe, limit = 100) {
  switch (exchange) {
    case 'binance': return getBinanceOHLCV(symbol, timeframe, limit)
    case 'bybit':   return getBybitOHLCV(symbol, timeframe, limit)
    case 'okx':     return getOKXOHLCV(symbol, timeframe, limit)
    case 'mt5':     return mt5GetOHLCV(symbol, timeframe, limit)
    default: throw new Error(`Unknown exchange: ${exchange}`)
  }
}

async function fetchTicker(exchange, symbol) {
  switch (exchange) {
    case 'binance': return getBinanceTicker(symbol)
    case 'bybit':   return getBybitTicker(symbol)
    case 'okx':     return getOKXTicker(symbol)
    case 'mt5':     return mt5GetTicker(symbol)
    default: throw new Error(`Unknown exchange: ${exchange}`)
  }
}

function runStrategy(candles, strategyName, strategyConfig = {}) {
  switch (strategyName) {
    case 'rsi':        return rsiStrategy(candles, strategyConfig)
    case 'ema_cross':  return emaCrossStrategy(candles, strategyConfig)
    case 'macd':       return macdStrategy(candles, strategyConfig)
    case 'bollinger':  return bollingerStrategy(candles, strategyConfig)
    case 'combined':
    default:           return combinedStrategy(candles, strategyConfig)
  }
}

// ─── Main Bot Logic ─────────────────────────────────────────────────────────────

async function executeBotCycle(config) {
  const {
    exchange = 'binance',
    symbol = 'BTC/USDT',
    timeframe = '1h',
    strategy = 'combined',
    strategyConfig = {},
    tradeAmount = 0.001,
    balance = 10000,
    riskConfig = {},
    dryRun = true,
    atrMultiplier = 2,
    riskReward = 2,
  } = config

  const result = {
    timestamp: new Date().toISOString(),
    exchange, symbol, timeframe, strategy,
    signal: null, action: null, order: null, error: null,
    indicators: null, dryRun,
  }

  try {
    // 1. Fetch candle data
    const candles = await fetchCandles(exchange, symbol, timeframe, 200)
    if (!candles || candles.length < 50) {
      result.error = 'Insufficient candle data'
      return result
    }

    // 2. Run strategy
    const stratResult = runStrategy(candles, strategy, strategyConfig)
    result.signal = stratResult.signal
    result.indicators = stratResult.indicators || {}
    result.reason = stratResult.reason || stratResult.reasons

    // 3. Risk check
    const canTrade = checkCanTrade(balance, riskConfig)
    if (!canTrade.allowed) {
      result.action = 'blocked_by_risk'
      result.error = canTrade.reasons.join(', ')
      return result
    }

    // 4. Check for conflicting open positions
    const openPositions = getOpenPositions()
    const existingPosition = openPositions.find(p => p.symbol === symbol && p.exchange === exchange)

    // 5. Execute trade
    const lastPrice = candles[candles.length - 1].close
    const stopLoss = calcStopLoss(candles, stratResult.signal, atrMultiplier)
    const takeProfit = calcTakeProfit(lastPrice, stopLoss, riskReward)
    const positionSize = calcPositionSize({ balance, riskPercent: riskConfig.riskPerTradePercent || 1, entryPrice: lastPrice, stopLossPrice: stopLoss })

    if (stratResult.signal === 'buy' && !existingPosition) {
      result.action = 'buy'
      result.entryPrice = lastPrice
      result.stopLoss = stopLoss
      result.takeProfit = takeProfit
      result.positionSize = positionSize

      if (!dryRun) {
        const { default: handler } = await import('./trade')
        // For Vercel serverless, we call the lib directly
        const { placeBinanceOrder } = await import('../../lib/binance')
        // TODO: call appropriate exchange order function
        addAlert('success', `BOT BUY: ${symbol} @ ${lastPrice.toFixed(4)} | SL: ${stopLoss.toFixed(4)} | TP: ${takeProfit.toFixed(4)}`)
        logTrade({ source: 'bot', exchange, symbol, side: 'buy', price: lastPrice, amount: positionSize, stopLoss, takeProfit })
      } else {
        addAlert('info', `[DRY RUN] BOT BUY signal: ${symbol} @ ${lastPrice.toFixed(4)} | Reason: ${Array.isArray(result.reason) ? result.reason.join(', ') : result.reason}`)
      }
    }

    else if (stratResult.signal === 'sell' && !existingPosition) {
      result.action = 'sell'
      result.entryPrice = lastPrice
      result.stopLoss = stopLoss
      result.takeProfit = takeProfit
      result.positionSize = positionSize

      if (!dryRun) {
        addAlert('warning', `BOT SELL: ${symbol} @ ${lastPrice.toFixed(4)} | SL: ${stopLoss.toFixed(4)} | TP: ${takeProfit.toFixed(4)}`)
        logTrade({ source: 'bot', exchange, symbol, side: 'sell', price: lastPrice, amount: positionSize, stopLoss, takeProfit })
      } else {
        addAlert('info', `[DRY RUN] BOT SELL signal: ${symbol} @ ${lastPrice.toFixed(4)} | Reason: ${Array.isArray(result.reason) ? result.reason.join(', ') : result.reason}`)
      }
    }

    else if (existingPosition && stratResult.signal !== 'hold') {
      // Close if opposite signal
      const oppSide = existingPosition.side === 'buy' ? 'sell' : 'buy'
      if (stratResult.signal === oppSide) {
        result.action = 'close_position'
        addAlert('info', `BOT: Closing ${existingPosition.side} position on ${symbol} - opposite signal received`)
      } else {
        result.action = 'hold_existing'
      }
    }

    else {
      result.action = 'hold'
    }

  } catch (e) {
    result.error = e.message
    result.action = 'error'
    botState.errors.unshift({ time: new Date().toISOString(), message: e.message })
    if (botState.errors.length > 20) botState.errors = botState.errors.slice(0, 20)
  }

  return result
}

// ─── API Handler ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // ── GET: Status ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      bot: {
        running: botState.running,
        config: botState.config,
        lastSignal: botState.lastSignal,
        lastRun: botState.lastRun,
        runCount: botState.runCount,
        errors: botState.errors.slice(0, 5),
      },
    })
  }

  // ── POST: Bot Control ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, config } = req.body

    switch (action) {
      // Start bot
      case 'start': {
        if (botState.running) {
          return res.status(200).json({ success: false, message: 'Bot already running' })
        }
        botState.running = true
        botState.config = config
        addAlert('success', `Bot started: ${config?.strategy || 'combined'} strategy on ${config?.symbol || 'BTC/USDT'} (${config?.dryRun ? 'DRY RUN' : 'LIVE'})`)
        return res.status(200).json({ success: true, message: 'Bot started', bot: botState })
      }

      // Stop bot
      case 'stop': {
        botState.running = false
        addAlert('info', 'Bot stopped by user')
        return res.status(200).json({ success: true, message: 'Bot stopped' })
      }

      // Run once manually
      case 'run_once': {
        const cfg = config || botState.config
        if (!cfg) return res.status(400).json({ error: 'No config provided' })

        const result = await executeBotCycle(cfg)
        botState.lastSignal = result
        botState.lastRun = new Date().toISOString()
        botState.runCount++

        return res.status(200).json({ success: true, result })
      }

      // Update config
      case 'update_config': {
        botState.config = { ...botState.config, ...config }
        return res.status(200).json({ success: true, config: botState.config })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
