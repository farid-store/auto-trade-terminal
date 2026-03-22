import ccxt from 'ccxt'

let binanceInstance = null

export function getBinance() {
  if (!binanceInstance) {
    binanceInstance = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true,
      },
      sandbox: process.env.BINANCE_TESTNET === 'true',
    })
  }
  return binanceInstance
}

export async function getBinanceTicker(symbol = 'BTC/USDT') {
  const exchange = getBinance()
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
    throw new Error(`Binance fetchTicker error: ${e.message}`)
  }
}

export async function getBinanceOHLCV(symbol = 'BTC/USDT', timeframe = '1h', limit = 200) {
  const exchange = getBinance()
  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
    return ohlcv.map(([time, open, high, low, close, volume]) => ({
      time: Math.floor(time / 1000),
      open, high, low, close, volume,
    }))
  } catch (e) {
    throw new Error(`Binance fetchOHLCV error: ${e.message}`)
  }
}

export async function getBinanceBalance() {
  const exchange = getBinance()
  try {
    const balance = await exchange.fetchBalance()
    const assets = Object.entries(balance.total)
      .filter(([, amount]) => amount > 0)
      .map(([currency, total]) => ({
        currency,
        total,
        free: balance.free[currency] || 0,
        used: balance.used[currency] || 0,
      }))
    return assets
  } catch (e) {
    throw new Error(`Binance fetchBalance error: ${e.message}`)
  }
}

export async function placeBinanceOrder({ symbol, side, type, amount, price }) {
  const exchange = getBinance()
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
    throw new Error(`Binance createOrder error: ${e.message}`)
  }
}

export async function getBinanceOpenOrders(symbol) {
  const exchange = getBinance()
  try {
    return await exchange.fetchOpenOrders(symbol)
  } catch (e) {
    throw new Error(`Binance fetchOpenOrders error: ${e.message}`)
  }
}

export async function cancelBinanceOrder(id, symbol) {
  const exchange = getBinance()
  try {
    return await exchange.cancelOrder(id, symbol)
  } catch (e) {
    throw new Error(`Binance cancelOrder error: ${e.message}`)
  }
}

export async function getBinanceOrderBook(symbol = 'BTC/USDT', limit = 20) {
  const exchange = getBinance()
  try {
    const ob = await exchange.fetchOrderBook(symbol, limit)
    return {
      symbol,
      bids: ob.bids.slice(0, limit),
      asks: ob.asks.slice(0, limit),
      timestamp: ob.timestamp,
    }
  } catch (e) {
    throw new Error(`Binance fetchOrderBook error: ${e.message}`)
  }
}
