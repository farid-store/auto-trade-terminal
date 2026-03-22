/**
 * /api/market
 * GET /api/market?action=ticker&exchange=binance&symbol=BTC/USDT
 * GET /api/market?action=ohlcv&exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=200
 * GET /api/market?action=orderbook&exchange=binance&symbol=BTC/USDT
 * GET /api/market?action=tickers&exchange=binance  (multiple symbols)
 */

import { getBinanceTicker, getBinanceOHLCV, getBinanceOrderBook } from '../../lib/binance'
import { getBybitTicker, getBybitOHLCV, getBybitOrderBook } from '../../lib/bybit'
import { getOKXTicker, getOKXOHLCV, getOKXOrderBook } from '../../lib/okx'
import { mt5GetTicker, mt5GetOHLCV } from '../../lib/mt5bridge'

const POPULAR_SYMBOLS = {
  binance: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'],
  bybit: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'],
  okx: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'OKB/USDT'],
  mt5: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NASDAQ'],
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { action = 'ticker', exchange = 'binance', symbol = 'BTC/USDT', timeframe = '1h', limit = '200' } = req.query

  try {
    let data

    // ── Ticker ────────────────────────────────────────────────────────────────
    if (action === 'ticker') {
      switch (exchange) {
        case 'binance': data = await getBinanceTicker(symbol); break
        case 'bybit':   data = await getBybitTicker(symbol); break
        case 'okx':     data = await getOKXTicker(symbol); break
        case 'mt5':     data = await mt5GetTicker(symbol); break
        default: return res.status(400).json({ error: `Unknown exchange: ${exchange}` })
      }
    }

    // ── OHLCV ─────────────────────────────────────────────────────────────────
    else if (action === 'ohlcv') {
      const lim = parseInt(limit, 10) || 200
      switch (exchange) {
        case 'binance': data = await getBinanceOHLCV(symbol, timeframe, lim); break
        case 'bybit':   data = await getBybitOHLCV(symbol, timeframe, lim); break
        case 'okx':     data = await getOKXOHLCV(symbol, timeframe, lim); break
        case 'mt5':     data = await mt5GetOHLCV(symbol, timeframe, lim); break
        default: return res.status(400).json({ error: `Unknown exchange: ${exchange}` })
      }
    }

    // ── Order Book ────────────────────────────────────────────────────────────
    else if (action === 'orderbook') {
      switch (exchange) {
        case 'binance': data = await getBinanceOrderBook(symbol); break
        case 'bybit':   data = await getBybitOrderBook(symbol); break
        case 'okx':     data = await getOKXOrderBook(symbol); break
        default: return res.status(400).json({ error: 'Order book not supported for this exchange' })
      }
    }

    // ── Multiple Tickers ──────────────────────────────────────────────────────
    else if (action === 'tickers') {
      const symbols = POPULAR_SYMBOLS[exchange] || POPULAR_SYMBOLS.binance
      const tickerFn = exchange === 'binance' ? getBinanceTicker
        : exchange === 'bybit' ? getBybitTicker
        : exchange === 'okx' ? getOKXTicker
        : mt5GetTicker
      const results = await Promise.allSettled(symbols.map(s => tickerFn(s)))
      data = results
        .map((r, i) => r.status === 'fulfilled' ? r.value : { symbol: symbols[i], error: r.reason?.message })
    }

    else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10')
    return res.status(200).json({ success: true, data, exchange, symbol, timestamp: Date.now() })

  } catch (error) {
    console.error('[market API]', error.message)
    return res.status(500).json({ success: false, error: error.message })
  }
}
