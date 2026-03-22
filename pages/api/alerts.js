/**
 * /api/alerts
 * GET  /api/alerts?limit=20
 * POST /api/alerts { action: 'read'|'clear', id? }
 */

import { getAlerts, markAlertRead, clearAlerts, addAlert, getRiskStats } from '../../lib/riskManager'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { limit = '20' } = req.query
    const alerts = getAlerts(parseInt(limit, 10))
    const stats = getRiskStats(0)
    return res.status(200).json({
      success: true,
      alerts,
      unread: stats.unreadAlerts,
    })
  }

  if (req.method === 'POST') {
    const { action, id, type, message } = req.body

    switch (action) {
      case 'read':
        if (id) markAlertRead(id)
        return res.status(200).json({ success: true })

      case 'clear':
        clearAlerts()
        return res.status(200).json({ success: true, message: 'All alerts cleared' })

      case 'add':
        if (!type || !message) return res.status(400).json({ error: 'type and message required' })
        const alert = addAlert(type, message)
        return res.status(200).json({ success: true, alert })

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
