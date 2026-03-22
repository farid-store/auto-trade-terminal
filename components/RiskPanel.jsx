import { useState, useEffect } from 'react'

export default function RiskPanel() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [riskConfig, setRiskConfig] = useState({
    maxDailyLossPercent: 3,
    maxDrawdownPercent: 10,
    maxOpenPositions: 5,
    maxPositionSizePercent: 10,
    riskPerTradePercent: 1,
    trailingStopPercent: 2,
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [alertRes, pnlRes] = await Promise.all([
        fetch('/api/alerts?limit=30'),
        fetch('/api/portfolio?action=pnl&exchange=binance'),
      ])
      const [alertData, pnlData] = await Promise.all([alertRes.json(), pnlRes.json()])
      if (alertData.success) setAlerts(alertData.alerts)
      if (pnlData.success) setStats(pnlData.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const clearAlerts = async () => {
    await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) })
    setAlerts([])
  }

  const alertColors = {
    info: { bg: 'rgba(56,139,253,0.1)', border: '#388bfd44', text: '#388bfd', icon: 'ℹ' },
    success: { bg: 'rgba(63,185,80,0.1)', border: '#3fb95044', text: '#3fb950', icon: '✓' },
    warning: { bg: 'rgba(210,153,34,0.1)', border: '#d2992244', text: '#d29922', icon: '⚠' },
    danger: { bg: 'rgba(248,81,73,0.1)', border: '#f8514944', text: '#f85149', icon: '✕' },
  }

  const RiskMeter = ({ label, value, max, warningPct = 70, dangerPct = 90 }) => {
    const pct = Math.min((value / max) * 100, 100)
    const color = pct >= dangerPct ? '#f85149' : pct >= warningPct ? '#d29922' : '#3fb950'
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span style={{ color: '#8b949e' }}>{label}</span>
          <span style={{ color, fontWeight: 600 }}>{value} / {max}</span>
        </div>
        <div style={{ height: '6px', background: '#0d1117', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
        </div>
      </div>
    )
  }

  const ConfigInput = ({ label, field, step = 1, min = 0, suffix = '' }) => (
    <div>
      <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="number"
          value={riskConfig[field]}
          onChange={e => setRiskConfig(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
          step={step}
          min={min}
          style={{ flex: 1 }}
        />
        {suffix && <span style={{ color: '#8b949e', fontSize: '12px' }}>{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {/* Left: Risk Status + Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Risk Meters */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#e6edf3' }}>🛡️ Risk Status</h3>
            <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px' }}>
              {loading ? '⏳' : '🔄'}
            </button>
          </div>

          {stats ? (
            <>
              <RiskMeter label="Open Positions" value={stats.openPositions} max={riskConfig.maxOpenPositions} />
              <RiskMeter label="Daily Loss %" value={Math.abs(Math.min(0, stats.dailyPnL / 100))} max={riskConfig.maxDailyLossPercent} />
              <RiskMeter label="Losing Trades" value={stats.losingTrades} max={stats.totalTrades || 1} warningPct={50} dangerPct={70} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                {[
                  { label: 'Win Rate', value: `${stats.winRate}%`, color: Number(stats.winRate) >= 50 ? '#3fb950' : '#f85149' },
                  { label: 'Profit Factor', value: stats.profitFactor, color: Number(stats.profitFactor) >= 1 ? '#3fb950' : '#f85149' },
                  { label: 'Avg Win', value: `$${stats.avgWin}`, color: '#3fb950' },
                  { label: 'Avg Loss', value: `$${stats.avgLoss}`, color: '#f85149' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#0d1117', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: item.color, marginTop: '4px', fontFamily: 'monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#6e7681', padding: '20px' }}>Loading stats...</div>
          )}
        </div>

        {/* Risk Config */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '16px' }}>⚙️ Risk Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <ConfigInput label="Max Daily Loss" field="maxDailyLossPercent" step={0.5} min={0.5} suffix="%" />
            <ConfigInput label="Max Drawdown" field="maxDrawdownPercent" step={1} min={1} suffix="%" />
            <ConfigInput label="Max Open Positions" field="maxOpenPositions" step={1} min={1} />
            <ConfigInput label="Max Position Size" field="maxPositionSizePercent" step={1} min={1} suffix="%" />
            <ConfigInput label="Risk Per Trade" field="riskPerTradePercent" step={0.1} min={0.1} suffix="%" />
            <ConfigInput label="Trailing Stop" field="trailingStopPercent" step={0.1} min={0.1} suffix="%" />
          </div>
          <div style={{ marginTop: '14px', padding: '10px', background: 'rgba(56,139,253,0.08)', borderRadius: '6px', fontSize: '12px', color: '#388bfd' }}>
            ℹ These settings are applied to new bot runs. Pass them as <code>riskConfig</code> in the bot panel.
          </div>
        </div>
      </div>

      {/* Right: Alerts */}
      <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#e6edf3' }}>
            🔔 Alerts
            {alerts.filter(a => !a.read).length > 0 && (
              <span style={{ marginLeft: '8px', background: '#f85149', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                {alerts.filter(a => !a.read).length}
              </span>
            )}
          </h3>
          <button onClick={clearAlerts}
            style={{ background: 'none', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e', cursor: 'pointer', padding: '4px 10px', fontSize: '12px' }}>
            Clear All
          </button>
        </div>

        <div style={{ maxHeight: '540px', overflowY: 'auto', padding: '12px' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6e7681', padding: '40px', fontSize: '13px' }}>
              ✅ No alerts
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.map(alert => {
                const style = alertColors[alert.type] || alertColors.info
                return (
                  <div key={alert.id} style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderLeft: `3px solid ${style.text}`,
                    opacity: alert.read ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: style.text, fontWeight: 700, flexShrink: 0, fontSize: '14px' }}>{style.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e6edf3', fontSize: '12px', lineHeight: 1.5 }}>{alert.message}</div>
                        <div style={{ color: '#6e7681', fontSize: '10px', marginTop: '3px' }}>
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span style={{
                        padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                        background: `${style.text}22`, color: style.text, flexShrink: 0,
                      }}>{alert.type}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
