import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'chart', label: '📈 Chart' },
  { id: 'bot', label: '🤖 Bot' },
  { id: 'portfolio', label: '💼 Portfolio' },
  { id: 'risk', label: '🛡️ Risk' },
  { id: 'orders', label: '📋 Orders' },
]

export default function Layout({ children, activeTab, onTabChange }) {
  const [alerts, setAlerts] = useState([])
  const [unread, setUnread] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => setTime(new Date().toUTCString().slice(0, 25))
    updateTime()
    const t = setInterval(updateTime, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const r = await fetch('/api/alerts?limit=10')
        const data = await r.json()
        if (data.success) {
          setAlerts(data.alerts)
          setUnread(data.unread)
        }
      } catch (_) {}
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000)
    return () => clearInterval(interval)
  }, [])

  const clearAlerts = async () => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    })
    setAlerts([])
    setUnread(0)
  }

  const alertColor = { info: '#388bfd', success: '#3fb950', warning: '#d29922', danger: '#f85149' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0d1117' }}>
      {/* Header */}
      <header style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#e6edf3' }}>AutoTrade Terminal</span>
          </div>
          <span style={{ color: '#6e7681', fontSize: '12px' }}>
            <span style={{
              display: 'inline-block', width: '6px', height: '6px',
              background: '#3fb950', borderRadius: '50%', marginRight: '5px',
              verticalAlign: 'middle',
            }} />
            {time} UTC
          </span>
        </div>

        {/* Alert bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            style={{
              background: 'none', border: '1px solid #30363d', borderRadius: '6px',
              padding: '6px 12px', cursor: 'pointer', color: '#e6edf3', fontSize: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            🔔
            {unread > 0 && (
              <span style={{
                background: '#f85149', color: '#fff', borderRadius: '10px',
                padding: '0 5px', fontSize: '10px', fontWeight: 700,
              }}>{unread}</span>
            )}
          </button>

          {showAlerts && (
            <div style={{
              position: 'absolute', right: 0, top: '40px',
              background: '#1c2230', border: '1px solid #30363d', borderRadius: '8px',
              width: '340px', maxHeight: '400px', overflow: 'auto',
              zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>Alerts</span>
                <button onClick={clearAlerts} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px' }}>Clear all</button>
              </div>
              {alerts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#8b949e' }}>No alerts</div>
              ) : alerts.map(a => (
                <div key={a.id} style={{
                  padding: '10px 14px', borderBottom: '1px solid rgba(48,54,61,0.5)',
                  borderLeft: `3px solid ${alertColor[a.type] || '#8b949e'}`,
                  opacity: a.read ? 0.6 : 1,
                }}>
                  <div style={{ fontSize: '12px', color: '#e6edf3' }}>{a.message}</div>
                  <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '2px' }}>
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Nav */}
      <nav style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '0 20px',
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
      }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              background: activeTab === item.id ? 'rgba(56,139,253,0.1)' : 'none',
              border: 'none',
              borderBottom: activeTab === item.id ? '2px solid #388bfd' : '2px solid transparent',
              color: activeTab === item.id ? '#388bfd' : '#8b949e',
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === item.id ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '20px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#161b22', borderTop: '1px solid #30363d',
        padding: '10px 20px', textAlign: 'center',
        color: '#6e7681', fontSize: '11px',
      }}>
        AutoTrade Terminal v1.0 — Binance · Bybit · OKX · MT5 — Trading involves significant risk. Use dry run mode first.
      </footer>
    </div>
  )
}
