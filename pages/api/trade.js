/**
 * /api/trade
 * POST /api/trade  { exchange, action, symbol, side, type, amount, price }
 * GET  /api/trade?action=orders&exchange=binance&symbol=BTC/USDT
 * DELETE /api/trade  { exchange, orderId, symbol }
 */

import { placeBinanceOrder, getBinanceOpenOrders, cancelBinanceOrder } from '../../lib/binance'
import { placeBybitOrder, getBybitOpenOrders, cancelBybitOrder } from '../../lib/bybit'
import { placeOKXOrder, getOKXOpenOrders, cancelOKXOrder } from '../../lib/okx'
import { mt5PlaceOrder, mt5ClosePosition, mt5GetOrders, mt5CloseAllPositions } from '../../lib/mt5bridge'
import { checkCanTrade, validateOrderSize, addPosition, removePosition, logTrade, addAlert } from '../../lib/riskManager'

export default async function handler(req, res) {
  const { method } = req

  try {
    // ── GET: Fetch Open Orders ──────────────────────────────────────────────
    if (method === 'GET') {
      const { exchange = 'binance', symbol = 'BTC/USDT' } = req.query
      let data
      switch (exchange) {
        case 'binance': data = await getBinanceOpenOrders(symbol); break
        case 'bybit':   data = await getBybitOpenOrders(symbol); break
        case 'okx':     data = await getOKXOpenOrders(symbol); break
        case 'mt5':     data = await mt5GetOrders(); break
        default: return res.status(400).json({ error: `Unknown exchange: ${exchange}` })
      }
      return res.status(200).json({ success: true, data })
    }

    // ── POST: Place Order ──────────────────────────────────────────────────
    if (method === 'POST') {
      const {
        exchange = 'binance',
        symbol,
        side,        // 'buy' | 'sell'
        type = 'market', // 'market' | 'limit'
        amount,
        price,
        stopLoss,
        takeProfit,
        balance = 10000, // passed from frontend
        riskConfig,
      } = req.body

      if (!symbol || !side || !amount) {
        return res.status(400).json({ error: 'Missing required fields: symbol, side, amount' })
      }

      // Risk checks
      const canTradeResult = checkCanTrade(balance, riskConfig)
      if (!canTradeResult.allowed) {
        return res.status(403).json({ success: false, error: 'Risk check failed', reasons: canTradeResult.reasons })
      }

      const orderValue = amount * (price || 1)
      const sizeCheck = validateOrderSize(balance, orderValue, riskConfig)
      if (!sizeCheck.valid) {
        return res.status(400).json({ success: false, error: sizeCheck.message })
      }

      let order
      switch (exchange) {
        case 'binance':
          order = await placeBinanceOrder({ symbol, side, type, amount, price })
          break
        case 'bybit':
          order = await placeBybitOrder({ symbol, side, type, amount, price })
          break
        case 'okx':
          order = await placeOKXOrder({ symbol, side, type, amount, price })
          break
        case 'mt5':
          order = await mt5PlaceOrder({
            symbol,
            side,
            volume: amount,
            price: price || 0,
            slPoints: stopLoss || 0,
            tpPoints: takeProfit || 0,
          })
          break
        default:
          return res.status(400).json({ error: `Unknown exchange: ${exchange}` })
      }

      // Track position for risk management
      addPosition({
        id: order.id || order.ticket,
        exchange,
        symbol,
        side,
        entryPrice: price || order.price,
        amount,
        stopLoss,
        takeProfit,
        openTime: new Date().toISOString(),
      })

      logTrade({ exchange, symbol, side, type, amount, price, orderId: order.id })
      addAlert('success', `Order placed: ${side.toUpperCase()} ${amount} ${symbol} @ ${price || 'market'} on ${exchange}`)

      return res.status(200).json({ success: true, order })
    }

    // ── DELETE: Cancel Order ───────────────────────────────────────────────
    if (method === 'DELETE') {
      const { exchange = 'binance', orderId, symbol, closeAll } = req.body

      let result
      if (exchange === 'mt5') {
        if (closeAll) {
          result = await mt5CloseAllPositions()
        } else {
          result = await mt5ClosePosition(orderId)
          removePosition(orderId)
        }
      } else {
        switch (exchange) {
          case 'binance': result = await cancelBinanceOrder(orderId, symbol); break
          case 'bybit':   result = await cancelBybitOrder(orderId, symbol); break
          case 'okx':     result = await cancelOKXOrder(orderId, symbol); break
          default: return res.status(400).json({ error: `Unknown exchange: ${exchange}` })
        }
        removePosition(orderId)
      }

      addAlert('info', `Order/position cancelled: ${orderId} on ${exchange}`)
      return res.status(200).json({ success: true, result })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('[trade API]', error.message)
    addAlert('danger', `Trade error: ${error.message}`)
    return res.status(500).json({ success: false, error: error.message })
  }
}
