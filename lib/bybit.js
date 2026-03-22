import ccxt from 'ccxt'

let bybitInstance = null

export function getBybit() {
  if (!bybitInstance) {
    bybitInstance = new ccxt.bybit({
      apiKey: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_API_SECRET,
      options: { defaultType: 'linear' },
      sandbox: process.env.BYBIT_TESTNET === 'true',
    })
  }
  return bybitInstance
}

export async function getBybitTicker(symbol = 'BTC/USDT') {
  const exchange = getBybit()
  try {
    const ticker = await exchange.fetchTicker(symbol)
    return {
      symbol,
      price: ticker.last,
      bid: ticker.bid,
      ask: ticker.ask,
      high: ticker.high,
      low: ticker.low,
      volume: ticker.baseVolume,
      change: ticker.change,
      changePercent: ticker.percentage,
      timestamp: ticker.timestamp,
    }
  } catch (e) {
    throw new Error(`Bybit fetchTicker error: ${e.message}`)
  }
}

export async function getBybitOHLCV(symbol = 'BTC/USDT', timeframe = '1h', limit = 200) {
  const exchange = getBybit()
  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
    return ohlcv.map(([time, open, high, low, close, volume]) => ({
      time: Math.floor(time / 1000),
      open, high, low, close, volume,
    }))
  } catch (e) {
    throw new Error(`Bybit fetchOHLCV error: ${e.message}`)
  }
}

export async function getBybitBalance() {
  const exchange = getBybit()
  try {
    const balance = await exchange.fetchBalance()
    return Object.entries(balance.total)
      .filter(([, amount]) => amount > 0)
      .map(([currency, total]) => ({
        currency,
        total,
        free: balance.free[currency] || 0,
        used: balance.used[currency] || 0,
      }))
  } catch (e) {
    throw new Error(`Bybit fetchBalance error: ${e.message}`)
  }
}

export async function placeBybitOrder({ symbol, side, type, amount, price }) {
  const exchange = getBybit()
  try {
    const order = await exchange.createOrder(symbol, type, side, amount, price)
    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      amount: order.amount,
      price: order.price,
      status: order.status,
      timestamp: order.timestamp,
    }
  } catch (e) {
    throw new Error(`Bybit createOrder error: ${e.message}`)
  }
}

export async function getBybitOpenOrders(symbol) {
  const exchange = getBybit()
  try {
    return await exchange.fetchOpenOrders(symbol)
  } catch (e) {
    throw new Error(`Bybit fetchOpenOrders error: ${e.message}`)
  }
}

export async function cancelBybitOrder(id, symbol) {
  const exchange = getBybit()
  try {
    return await exchange.cancelOrder(id, symbol)
  } catch (e) {
    throw new Error(`Bybit cancelOrder error: ${e.message}`)
  }
}

export async function getBybitOrderBook(symbol = 'BTC/USDT', limit = 20) {
  const exchange = getBybit()
  try {
    const ob = await exchange.fetchOrderBook(symbol, limit)
    return {
      symbol,
      bids: ob.bids.slice(0, limit),
      asks: ob.asks.slice(0, limit),
      timestamp: ob.timestamp,
    }
  } catch (e) {
    throw new Error(`Bybit fetchOrderBook error: ${e.message}`)
  }
}
