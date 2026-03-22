import ccxt from 'ccxt'

let okxInstance = null

export function getOKX() {
  if (!okxInstance) {
    okxInstance = new ccxt.okx({
      apiKey: process.env.OKX_API_KEY,
      secret: process.env.OKX_API_SECRET,
      password: process.env.OKX_PASSPHRASE,
      options: { defaultType: 'spot' },
    })
  }
  return okxInstance
}

export async function getOKXTicker(symbol = 'BTC/USDT') {
  const exchange = getOKX()
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
    throw new Error(`OKX fetchTicker error: ${e.message}`)
  }
}

export async function getOKXOHLCV(symbol = 'BTC/USDT', timeframe = '1h', limit = 200) {
  const exchange = getOKX()
  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
    return ohlcv.map(([time, open, high, low, close, volume]) => ({
      time: Math.floor(time / 1000),
      open, high, low, close, volume,
    }))
  } catch (e) {
    throw new Error(`OKX fetchOHLCV error: ${e.message}`)
  }
}

export async function getOKXBalance() {
  const exchange = getOKX()
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
    throw new Error(`OKX fetchBalance error: ${e.message}`)
  }
}

export async function placeOKXOrder({ symbol, side, type, amount, price }) {
  const exchange = getOKX()
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
    throw new Error(`OKX createOrder error: ${e.message}`)
  }
}

export async function getOKXOpenOrders(symbol) {
  const exchange = getOKX()
  try {
    return await exchange.fetchOpenOrders(symbol)
  } catch (e) {
    throw new Error(`OKX fetchOpenOrders error: ${e.message}`)
  }
}

export async function cancelOKXOrder(id, symbol) {
  const exchange = getOKX()
  try {
    return await exchange.cancelOrder(id, symbol)
  } catch (e) {
    throw new Error(`OKX cancelOrder error: ${e.message}`)
  }
}

export async function getOKXOrderBook(symbol = 'BTC/USDT', limit = 20) {
  const exchange = getOKX()
  try {
    const ob = await exchange.fetchOrderBook(symbol, limit)
    return {
      symbol,
      bids: ob.bids.slice(0, limit),
      asks: ob.asks.slice(0, limit),
      timestamp: ob.timestamp,
    }
  } catch (e) {
    throw new Error(`OKX fetchOrderBook error: ${e.message}`)
  }
}
