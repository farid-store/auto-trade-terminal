import { useState, useEffect } from 'react'

export default function Portfolio() {
  const [exchange, setExchange] = useState('binance')
  const [balance, setBalance] = useState(null)
  const [positions, setPositions] = useState([])
  const [history, setHistory] = useState([])
  const [pnl, setPnl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('balance')
  const [mt5Account, setMt5Account] = useState(null)

  const EXCHANGES = ['binance', 'bybit', 'okx', 'mt5']

  useEffect(() => { fetchAll() }, [exchange])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [balRes, posRes, pnlRes] = await Promise.all([
        fetch(`/api/portfolio?action=balance&exchange=${exchange}`),
        fetch(`/api/portfolio?action=positions&exchange=${exchange}`),
        fetch(`/api/portfolio?action=pnl&exchange=${exchange}`),
      ])
      const [balData, posData, pnlData] = await Promise.all([balRes.json(), posRes.json(), pnlRes.json()])

      if (balData.success) {
        if (exchange === 'mt5') setMt5Account(balData.data.account)
        else setBalance(balData.data.assets || [])
      }
      if (posData.success) setPositions(Array.isArray(posData.data) ? posData.data : [])
      if (pnlData.success) setPnl(pnlData.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/portfolio?action=history&exchange=${exchange}`)
      const data = await r.json()
      if (data.success) setHistory(Array.isArray(data.data) ? data.data : [])
    } catch (e) {}
    setLoading(false)
  }

  const pnlColor = (val) => {
    const n = Number(val)
    if (n > 0) return '#3fb950'
    if (n < 0) return '#f85149'
    return '#8b949e'
  }

  const StatCard = ({ label, value, color, prefix = '', suffix = '' }) => (
    <div style={{ background: '#0d1117', borderRadius: '8px', padding: '14px' }}>
      <div style={{ fontSize: '10px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: color || '#e6edf3', fontFamily: 'monospace' }}>
        {prefix}{value}{suffix}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {EXCHANGES.map(ex => (
            <button key={ex} onClick={() => setExchange(ex)}
              style={{
                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                border: exchange === ex ? '1px solid #388bfd' : '1px solid #30363d',
                background: exchange === ex ? 'rgba(56,139,253,0.15)' : 'transparent',
                color: exchange === ex ? '#388bfd' : '#8b949e',
              }}>
              {ex.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={fetchAll} disabled={loading}
          style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px' }}>
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      {/* P&L Summary Cards */}
      {pnl && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Daily P&L" value={`${Number(pnl.dailyPnL) >= 0 ? '+' : ''}$${Number(pnl.dailyPnL).toFixed(2)}`} color={pnlColor(pnl.dailyPnL)} />
          <StatCard label="Total P&L" value={`${Number(pnl.totalPnL) >= 0 ? '+' : ''}$${Number(pnl.totalPnL).toFixed(2)}`} color={pnlColor(pnl.totalPnL)} />
          <StatCard label="Win Rate" value={pnl.winRate} suffix="%" color={Number(pnl.winRate) >= 50 ? '#3fb950' : '#f85149'} />
          <StatCard label="Profit Factor" value={pnl.profitFactor} color={Number(pnl.profitFactor) >= 1 ? '#3fb950' : '#f85149'} />
        </div>
      )}

      {/* Secondary stats */}
      {pnl && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Total Trades" value={pnl.totalTrades} />
          <StatCard label="Wins" value={pnl.winningTrades} color="#3fb950" />
          <StatCard label="Losses" value={pnl.losingTrades} color="#f85149" />
          <StatCard label="Open Positions" value={pnl.openPositions} color="#388bfd" />
        </div>
      )}

      {/* MT5 Account Info */}
      {exchange === 'mt5' && mt5Account && (
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '14px' }}>🔵 MT5 Account — {mt5Account.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <StatCard label="Balance" value={`$${Number(mt5Account.balance || 0).toFixed(2)}`} />
            <StatCard label="Equity" value={`$${Number(mt5Account.equity || 0).toFixed(2)}`} />
            <StatCard label="Free Margin" value={`$${Number(mt5Account.freeMargin || 0).toFixed(2)}`} />
            <StatCard label="Margin Level" value={`${Number(mt5Account.marginLevel || 0).toFixed(1)}%`} color={mt5Account.marginLevel > 200 ? '#3fb950' : '#f85149'} />
            <StatCard label="Floating P&L" value={`$${Number(mt5Account.profit || 0).toFixed(2)}`} color={pnlColor(mt5Account.profit)} />
            <StatCard label="Leverage" value={`1:${mt5Account.leverage}`} color="#d29922" />
          </div>
        </div>
      )}

      {/* Tabs: Balance / Positions / History */}
      <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #30363d' }}>
          {[
            { id: 'balance', label: '💰 Balance' },
            { id: 'positions', label: '📌 Open Positions' },
            { id: 'history', label: '📋 Trade History' },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'history') fetchHistory() }}
              style={{
                padding: '12px 18px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                borderBottom: activeTab === tab.id ? '2px solid #388bfd' : '2px solid transparent',
                background: activeTab === tab.id ? 'rgba(56,139,253,0.08)' : 'transparent',
                color: activeTab === tab.id ? '#388bfd' : '#8b949e',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px' }}>
          {/* Balance */}
          {activeTab === 'balance' && (
            <div>
              {exchange !== 'mt5' ? (
                balance && balance.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Asset', 'Total', 'Free', 'In Use'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: '11px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #30363d' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {balance.map(asset => (
                        <tr key={asset.currency} style={{ borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
                          <td style={{ padding: '10px 12px', color: '#e6edf3', fontWeight: 600 }}>{asset.currency}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#e6edf3' }}>{Number(asset.total).toFixed(6)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#3fb950' }}>{Number(asset.free).toFixed(6)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#d29922' }}>{Number(asset.used).toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', color: '#6e7681', padding: '30px' }}>
                    {loading ? 'Loading...' : 'No assets found or API key not configured'}
                  </div>
                )
              ) : (
                <div style={{ color: '#8b949e', fontSize: '13px' }}>MT5 account details shown above</div>
              )}
            </div>
          )}

          {/* Positions */}
          {activeTab === 'positions' && (
            <div>
              {positions.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Symbol', 'Side', 'Amount', 'Entry', 'Current', 'P&L', 'Open Time'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: '11px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #30363d' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => {
                      const pnlVal = pos.profit ?? ((pos.currentPrice || pos.entryPrice) - pos.entryPrice) * pos.amount * (pos.side === 'buy' ? 1 : -1)
                      return (
                        <tr key={pos.id} style={{ borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
                          <td style={{ padding: '10px 12px', color: '#e6edf3', fontWeight: 600 }}>{pos.symbol}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: pos.side === 'buy' ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)', color: pos.side === 'buy' ? '#3fb950' : '#f85149' }}>
                              {pos.side?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#e6edf3' }}>{pos.volume || pos.amount}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#8b949e' }}>{Number(pos.openPrice || pos.entryPrice || 0).toFixed(4)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#e6edf3' }}>{Number(pos.currentPrice || pos.entryPrice || 0).toFixed(4)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: pnlColor(pnlVal), fontWeight: 600 }}>
                            {pnlVal >= 0 ? '+' : ''}${Number(pnlVal).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#6e7681', fontSize: '11px' }}>
                            {pos.openTime ? new Date(pos.openTime).toLocaleString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', color: '#6e7681', padding: '30px' }}>
                  {loading ? 'Loading...' : 'No open positions'}
                </div>
              )}
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div>
              {history.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Time', 'Symbol', 'Side', 'Amount', 'Price', 'P&L', 'Source'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: '11px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #30363d' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 50).map((trade, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
                        <td style={{ padding: '9px 12px', color: '#6e7681', fontSize: '11px' }}>{new Date(trade.timestamp || trade.time).toLocaleString()}</td>
                        <td style={{ padding: '9px 12px', color: '#e6edf3', fontWeight: 600 }}>{trade.symbol}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: trade.side === 'buy' ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)', color: trade.side === 'buy' ? '#3fb950' : '#f85149' }}>
                            {(trade.side || trade.type)?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#e6edf3' }}>{trade.amount || trade.volume}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#8b949e' }}>{Number(trade.price || 0).toFixed(4)}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: pnlColor(trade.pnl), fontWeight: 600 }}>
                          {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}$${Number(trade.pnl).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', color: '#6e7681', fontSize: '11px' }}>{trade.source || exchange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', color: '#6e7681', padding: '30px' }}>
                  {loading ? 'Loading...' : 'No trade history'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
