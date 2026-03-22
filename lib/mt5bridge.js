/**
 * MT5 Bridge - Connects to a Python MT5 REST API server
 * Requires running: https://github.com/Saiuz/python-mt5-rest
 * or any compatible MT5 REST bridge on MT5_SERVER_URL
 */
import axios from 'axios'

const MT5_BASE = process.env.MT5_SERVER_URL || 'http://localhost:5000'

const mt5Api = axios.create({
  baseURL: MT5_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Connection ────────────────────────────────────────────────────────────────

export async function mt5Connect() {
  try {
    const res = await mt5Api.post('/connect', {
      account: Number(process.env.MT5_ACCOUNT),
      password: process.env.MT5_PASSWORD,
      server: process.env.MT5_SERVER || 'MetaQuotes-Demo',
    })
    return res.data
  } catch (e) {
    throw new Error(`MT5 connect error: ${e.message}`)
  }
}

export async function mt5Disconnect() {
  try {
    const res = await mt5Api.post('/disconnect')
    return res.data
  } catch (e) {
    throw new Error(`MT5 disconnect error: ${e.message}`)
  }
}

// ─── Account Info ──────────────────────────────────────────────────────────────

export async function mt5AccountInfo() {
  try {
    const res = await mt5Api.get('/account_info')
    return res.data
  } catch (e) {
    throw new Error(`MT5 account_info error: ${e.message}`)
  }
}

// ─── Market Data ──────────────────────────────────────────────────────────────

export async function mt5GetTicker(symbol = 'EURUSD') {
  try {
    const res = await mt5Api.get(`/symbol_info_tick?symbol=${symbol}`)
    const d = res.data
    return {
      symbol,
      price: (d.ask + d.bid) / 2,
      bid: d.bid,
      ask: d.ask,
      spread: ((d.ask - d.bid) * 10000).toFixed(1),
      timestamp: d.time * 1000,
    }
  } catch (e) {
    throw new Error(`MT5 getTicker error: ${e.message}`)
  }
}

export async function mt5GetOHLCV(symbol = 'EURUSD', timeframe = 'H1', count = 200) {
  const tfMap = {
    '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30',
    '1h': 'H1', '4h': 'H4', '1d': 'D1', '1w': 'W1',
  }
  const mt5tf = tfMap[timeframe] || timeframe
  try {
    const res = await mt5Api.get(`/rates?symbol=${symbol}&timeframe=${mt5tf}&count=${count}`)
    return res.data.map(bar => ({
      time: Math.floor(new Date(bar.time).getTime() / 1000),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.tick_volume,
    }))
  } catch (e) {
    throw new Error(`MT5 getOHLCV error: ${e.message}`)
  }
}

// ─── Portfolio ─────────────────────────────────────────────────────────────────

export async function mt5GetPositions() {
  try {
    const res = await mt5Api.get('/positions')
    return res.data.map(p => ({
      id: p.ticket,
      symbol: p.symbol,
      side: p.type === 0 ? 'buy' : 'sell',
      volume: p.volume,
      openPrice: p.price_open,
      currentPrice: p.price_current,
      profit: p.profit,
      swap: p.swap,
      openTime: new Date(p.time * 1000).toISOString(),
    }))
  } catch (e) {
    throw new Error(`MT5 getPositions error: ${e.message}`)
  }
}

export async function mt5GetOrders() {
  try {
    const res = await mt5Api.get('/orders')
    return res.data
  } catch (e) {
    throw new Error(`MT5 getOrders error: ${e.message}`)
  }
}

export async function mt5GetHistory(fromDate, toDate) {
  try {
    const res = await mt5Api.get(`/history_deals?from=${fromDate}&to=${toDate}`)
    return res.data
  } catch (e) {
    throw new Error(`MT5 getHistory error: ${e.message}`)
  }
}

// ─── Trading ───────────────────────────────────────────────────────────────────

export async function mt5PlaceOrder({ symbol, side, volume, price = 0, slPoints = 0, tpPoints = 0, comment = 'auto-trade' }) {
  const orderType = side === 'buy' ? 0 : 1 // 0=BUY, 1=SELL
  try {
    const res = await mt5Api.post('/order_send', {
      symbol,
      action: 1, // TRADE_ACTION_DEAL
      type: orderType,
      volume,
      price,
      sl: slPoints,
      tp: tpPoints,
      comment,
      magic: 20240101,
      type_filling: 2, // ORDER_FILLING_IOC
    })
    return res.data
  } catch (e) {
    throw new Error(`MT5 placeOrder error: ${e.message}`)
  }
}

export async function mt5ClosePosition(ticket, volume = null) {
  try {
    const res = await mt5Api.post('/close_position', { ticket, volume })
    return res.data
  } catch (e) {
    throw new Error(`MT5 closePosition error: ${e.message}`)
  }
}

export async function mt5CloseAllPositions() {
  try {
    const positions = await mt5GetPositions()
    const results = []
    for (const pos of positions) {
      const r = await mt5ClosePosition(pos.id)
      results.push(r)
    }
    return results
  } catch (e) {
    throw new Error(`MT5 closeAllPositions error: ${e.message}`)
  }
}
