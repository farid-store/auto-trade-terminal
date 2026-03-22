import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import Chart from '../components/Chart'
import BotPanel from '../components/BotPanel'
import Portfolio from '../components/Portfolio'
import RiskPanel from '../components/RiskPanel'
import OrderBook from '../components/OrderBook'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tickers, setTickers] = useState([])
  const [exchange, setExchange] = useState('binance')

  useEffect(() => {
    fetchTickers()
    const interval = setInterval(fetchTickers, 15000)
    return () => clearInterval(interval)
  }, [exchange])

  const fetchTickers = async () => {
    try {
      const r = await fetch(`/api/market?action=tickers&exchange=${exchange}`)
      const data = await r.json()
      if (data.success) setTickers(data.data.filter(t => !t.error))
    } catch (_) {}
  }

  const pnlColor = (v) => {
    if (!v) return '#8b949e'
    return v >= 0 ? '#3fb950' : '#f85149'
  }

  // ── Dashboard overview ──────────────────────────────────────────────────────
  const Dashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Ticker strip */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '10px 16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {['binance', 'bybit', 'okx'].map(ex => (
            <button key={ex} onClick={() => setExchange(ex)}
              style={{ padding: '3px 10px', borderRadius: '20px', border: exchange === ex ? '1px solid #388bfd' : '1px solid #30363d', background: exchange === ex ? 'rgba(56,139,253,0.15)' : 'transparent', color: exchange === ex ? '#388bfd' : '#8b949e', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
              {ex.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {tickers.length === 0 ? (
            <span style={{ color: '#6e7681', fontSize: '12px' }}>Loading tickers...</span>
          ) : tickers.map(t => (
            <div key={t.symbol} style={{ flexShrink: 0, minWidth: '100px' }}>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '2px' }}>{t.symbol}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e6edf3', fontSize: '13px' }}>
                {Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </div>
              <div style={{ fontSize: '11px', color: pnlColor(t.changePercent) }}>
                {t.changePercent >= 0 ? '▲' : '▼'} {Math.abs(t.changePercent || 0).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <Chart />

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Quick trade */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '12px' }}>⚡ Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: '📈 View Chart', tab: 'chart', color: '#388bfd' },
              { label: '🤖 Configure Bot', tab: 'bot', color: '#3fb950' },
              { label: '💼 Portfolio', tab: 'portfolio', color: '#d29922' },
              { label: '📋 Place Order', tab: 'orders', color: '#a371f7' },
            ].map(item => (
              <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${item.color}33`, background: `${item.color}11`, color: item.color, cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Getting started */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '12px' }}>🚀 Getting Started</h3>
          <ol style={{ color: '#8b949e', fontSize: '12px', lineHeight: 2, paddingLeft: '16px' }}>
            <li>Copy <code style={{ background: '#0d1117', padding: '1px 5px', borderRadius: '3px', color: '#e6edf3' }}>.env.example</code> → <code style={{ background: '#0d1117', padding: '1px 5px', borderRadius: '3px', color: '#e6edf3' }}>.env.local</code></li>
            <li>Add your API keys for Binance, Bybit, OKX</li>
            <li>For MT5, run the Python REST bridge server</li>
            <li>Go to <strong style={{ color: '#e6edf3' }}>Bot</strong> tab → configure strategy</li>
            <li>Start with <strong style={{ color: '#388bfd' }}>Dry Run Mode</strong> first!</li>
            <li>Monitor alerts in the <strong style={{ color: '#e6edf3' }}>Risk</strong> tab</li>
          </ol>
          <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(248,81,73,0.08)', borderRadius: '6px', fontSize: '11px', color: '#f85149' }}>
            ⚠ Trading involves significant financial risk. Always test in dry run first.
          </div>
        </div>
      </div>
    </div>
  )

  // ── Tab renderer ────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />
      case 'chart':     return <Chart />
      case 'bot':       return <BotPanel />
      case 'portfolio': return <Portfolio />
      case 'risk':      return <RiskPanel />
      case 'orders':    return <OrderBook />
      default:          return <Dashboard />
    }
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}
