/**
 * /api/portfolio
 * GET /api/portfolio?exchange=binance
 * GET /api/portfolio?action=history&exchange=mt5
 * GET /api/portfolio?action=pnl
 */

import { getBinanceBalance } from '../../lib/binance'
import { getBybitBalance } from '../../lib/bybit'
import { getOKXBalance } from '../../lib/okx'
import { mt5AccountInfo, mt5GetPositions, mt5GetHistory } from '../../lib/mt5bridge'
import { getRiskStats, getTradeLog, getOpenPositions } from '../../lib/riskManager'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { exchange = 'binance', action = 'balance', from, to } = req.query

  try {
    let data

    // ── Balance ───────────────────────────────────────────────────────────────
    if (action === 'balance') {
      switch (exchange) {
        case 'binance': {
          const assets = await getBinanceBalance()
          data = { exchange, assets, total: assets.length }
          break
        }
        case 'bybit': {
          const assets = await getBybitBalance()
          data = { exchange, assets, total: assets.length }
          break
        }
        case 'okx': {
          const assets = await getOKXBalance()
          data = { exchange, assets, total: assets.length }
          break
        }
        case 'mt5': {
          const account = await mt5AccountInfo()
          data = {
            exchange: 'mt5',
            account: {
              balance: account.balance,
              equity: account.equity,
              margin: account.margin,
              freeMargin: account.margin_free,
              marginLevel: account.margin_level,
              profit: account.profit,
              currency: account.currency,
              leverage: account.leverage,
              name: account.name,
              server: account.server,
            },
          }
          break
        }
        case 'all': {
          const results = await Promise.allSettled([
            getBinanceBalance(),
            getBybitBalance(),
            getOKXBalance(),
          ])
          data = {
            binance: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
            bybit: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
            okx: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
          }
          break
        }
        default:
          return res.status(400).json({ error: `Unknown exchange: ${exchange}` })
      }
    }

    // ── Open Positions ────────────────────────────────────────────────────────
    else if (action === 'positions') {
      if (exchange === 'mt5') {
        data = await mt5GetPositions()
      } else {
        data = getOpenPositions().filter(p => p.exchange === exchange || exchange === 'all')
      }
    }

    // ── Trade History ─────────────────────────────────────────────────────────
    else if (action === 'history') {
      if (exchange === 'mt5') {
        const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const toDate = to || new Date().toISOString()
        data = await mt5GetHistory(fromDate, toDate)
      } else {
        data = getTradeLog(100)
      }
    }

    // ── P&L Stats ─────────────────────────────────────────────────────────────
    else if (action === 'pnl') {
      let balance = 0
      try {
        if (exchange === 'mt5') {
          const acc = await mt5AccountInfo()
          balance = acc.balance
        } else if (exchange === 'binance') {
          const assets = await getBinanceBalance()
          const usdt = assets.find(a => a.currency === 'USDT')
          balance = usdt?.total || 0
        }
      } catch (_) {}
      data = getRiskStats(balance)
    }

    else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    return res.status(200).json({ success: true, data, timestamp: Date.now() })

  } catch (error) {
    console.error('[portfolio API]', error.message)
    return res.status(500).json({ success: false, error: error.message })
  }
}
