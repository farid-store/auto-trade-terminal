import { useState, useEffect } from 'react'

const STRATEGIES = [
  { value: 'combined', label: '🔀 Combined (RSI + EMA + MACD + BB)', desc: 'Requires 2+ indicators to agree' },
  { value: 'rsi', label: '📊 RSI Only', desc: 'Oversold/overbought levels' },
  { value: 'ema_cross', label: '📈 EMA Cross', desc: 'Fast/slow EMA crossover' },
  { value: 'macd', label: '🌊 MACD', desc: 'MACD line vs signal line' },
  { value: 'bollinger', label: '🎯 Bollinger Bands', desc: 'Price touching bands' },
]

const EXCHANGES = ['binance', 'bybit', 'okx', 'mt5']
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
const SYMBOLS_BY_EXCHANGE = {
  binance: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'],
  bybit:   ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'],
  okx:     ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'],
  mt5:     ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'USTEC'],
}

export default function BotPanel() {
  const [botStatus, setBotStatus] = useState({ running: false, lastSignal: null, runCount: 0 })
  const [loading, setLoading] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [config, setConfig] = useState({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    strategy: 'combined',
    dryRun: true,
    tradeAmount: 0.001,
    balance: 10000,
    strategyConfig: { rsi: { oversold: 30, overbought: 70 }, ema: { fastPeriod: 9, slowPeriod: 21 } },
    riskConfig: { maxDailyLossPercent: 3, maxOpenPositions: 5, riskPerTradePercent: 1 },
    atrMultiplier: 2,
    riskReward: 2,
  })

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const r = await fetch('/api/bot')
      const data = await r.json()
      if (data.success) setBotStatus(data.bot)
    } catch (_) {}
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', config }),
      })
      const data = await r.json()
      if (data.bot) setBotStatus(data.bot)
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      })
      setBotStatus(prev => ({ ...prev, running: false }))
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const handleRunOnce = async () => {
    setLoading(true)
    setRunResult(null)
    try {
      const r = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_once', config }),
      })
      const data = await r.json()
      if (data.success) setRunResult(data.result)
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const setField = (field, value) => setConfig(prev => ({ ...prev, [field]: value }))

  const signalColor = { buy: '#3fb950', sell: '#f85149', hold: '#8b949e', error: '#f85149' }

  const Label = ({ children }) => (
    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

      {/* ── Config Panel ── */}
      <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ color: '#e6edf3' }}>🤖 Bot Configuration</h3>
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            background: botStatus.running ? 'rgba(63,185,80,0.15)' : 'rgba(139,148,158,0.15)',
            color: botStatus.running ? '#3fb950' : '#8b949e',
          }}>
            {botStatus.running ? '● RUNNING' : '○ STOPPED'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Exchange */}
          <div>
            <Label>Exchange</Label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {EXCHANGES.map(ex => (
                <button key={ex}
                  onClick={() => { setField('exchange', ex); setField('symbol', SYMBOLS_BY_EXCHANGE[ex][0]) }}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    border: config.exchange === ex ? '1px solid #388bfd' : '1px solid #30363d',
                    background: config.exchange === ex ? 'rgba(56,139,253,0.15)' : 'transparent',
                    color: config.exchange === ex ? '#388bfd' : '#8b949e',
                  }}>
                  {ex.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol & Timeframe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Symbol</Label>
              <select value={config.symbol} onChange={e => setField('symbol', e.target.value)} style={{ width: '100%' }}>
                {(SYMBOLS_BY_EXCHANGE[config.exchange] || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <select value={config.timeframe} onChange={e => setField('timeframe', e.target.value)} style={{ width: '100%' }}>
                {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
          </div>

          {/* Strategy */}
          <div>
            <Label>Strategy</Label>
            <select value={config.strategy} onChange={e => setField('strategy', e.target.value)} style={{ width: '100%' }}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div style={{ fontSize: '11px', color: '#6e7681', marginTop: '4px' }}>
              {STRATEGIES.find(s => s.value === config.strategy)?.desc}
            </div>
          </div>

          {/* Amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Trade Amount</Label>
              <input type="number" value={config.tradeAmount} onChange={e => setField('tradeAmount', parseFloat(e.target.value))} step="0.001" min="0" style={{ width: '100%' }} />
            </div>
            <div>
              <Label>Balance (USD)</Label>
              <input type="number" value={config.balance} onChange={e => setField('balance', parseFloat(e.target.value))} step="100" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Risk */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Risk/Trade %</Label>
              <input type="number" value={config.riskConfig.riskPerTradePercent}
                onChange={e => setConfig(p => ({ ...p, riskConfig: { ...p.riskConfig, riskPerTradePercent: parseFloat(e.target.value) } }))}
                step="0.1" min="0.1" max="10" style={{ width: '100%' }} />
            </div>
            <div>
              <Label>Risk : Reward</Label>
              <input type="number" value={config.riskReward} onChange={e => setField('riskReward', parseFloat(e.target.value))} step="0.5" min="1" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Dry Run */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
            background: config.dryRun ? 'rgba(56,139,253,0.08)' : 'rgba(248,81,73,0.08)',
            borderRadius: '6px', border: `1px solid ${config.dryRun ? '#388bfd' : '#f85149'}44`,
          }}>
            <input type="checkbox" id="dryRun" checked={config.dryRun} onChange={e => setField('dryRun', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="dryRun" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: config.dryRun ? '#388bfd' : '#f85149' }}>
              {config.dryRun ? '🔵 Dry Run Mode (Simulated)' : '🔴 LIVE MODE — Real Money!'}
            </label>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          {!botStatus.running ? (
            <button onClick={handleStart} disabled={loading}
              style={{ flex: 1, padding: '10px', background: '#3fb950', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
              {loading ? '...' : '▶ Start Bot'}
            </button>
          ) : (
            <button onClick={handleStop} disabled={loading}
              style={{ flex: 1, padding: '10px', background: '#f85149', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
              {loading ? '...' : '⏹ Stop Bot'}
            </button>
          )}
          <button onClick={handleRunOnce} disabled={loading}
            style={{ flex: 1, padding: '10px', background: '#388bfd', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
            {loading ? '⏳ Running...' : '▷ Run Once'}
          </button>
        </div>
      </div>

      {/* ── Results Panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Stats */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '14px' }}>📊 Bot Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Status', value: botStatus.running ? 'Running' : 'Stopped', color: botStatus.running ? '#3fb950' : '#8b949e' },
              { label: 'Total Runs', value: botStatus.runCount || 0 },
              { label: 'Last Run', value: botStatus.lastRun ? new Date(botStatus.lastRun).toLocaleTimeString() : '—' },
              { label: 'Last Signal', value: botStatus.lastSignal?.signal?.toUpperCase() || '—', color: signalColor[botStatus.lastSignal?.signal] },
            ].map(item => (
              <div key={item.label} style={{ background: '#0d1117', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '10px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: item.color || '#e6edf3', marginTop: '4px', fontFamily: 'monospace' }}>{String(item.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis result */}
        {runResult && (
          <div style={{ background: '#1c2230', border: `1px solid ${signalColor[runResult.signal] || '#30363d'}55`, borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ color: '#e6edf3', marginBottom: '14px' }}>🔍 Last Analysis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {[
                { k: 'Signal', v: runResult.signal?.toUpperCase(), color: signalColor[runResult.signal], big: true },
                { k: 'Action', v: runResult.action },
                runResult.confidence !== undefined && { k: 'Confidence', v: `${runResult.confidence}%`, color: '#d29922' },
                runResult.entryPrice && { k: 'Entry', v: Number(runResult.entryPrice).toFixed(4) },
                runResult.stopLoss && { k: 'Stop Loss', v: Number(runResult.stopLoss).toFixed(4), color: '#f85149' },
                runResult.takeProfit && { k: 'Take Profit', v: Number(runResult.takeProfit).toFixed(4), color: '#3fb950' },
              ].filter(Boolean).map(item => (
                <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8b949e' }}>{item.k}</span>
                  <span style={{ color: item.color || '#e6edf3', fontWeight: item.big ? 700 : 400, fontSize: item.big ? '16px' : '13px', fontFamily: 'monospace' }}>{item.v}</span>
                </div>
              ))}
              {runResult.reason && (
                <div style={{ marginTop: '6px', padding: '8px', background: 'rgba(63,185,80,0.08)', borderRadius: '6px', color: '#3fb950', fontSize: '12px' }}>
                  💡 {Array.isArray(runResult.reason) ? runResult.reason.join(' • ') : runResult.reason}
                </div>
              )}
              {runResult.error && (
                <div style={{ padding: '8px', background: 'rgba(248,81,73,0.1)', borderRadius: '6px', color: '#f85149', fontSize: '12px' }}>
                  ⚠ {runResult.error}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#6e7681', textAlign: 'right', marginTop: '4px' }}>
                {runResult.dryRun && '🔵 Dry Run · '}{new Date(runResult.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Strategy reference */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '12px' }}>📖 Strategy Reference</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#8b949e' }}>
            <div><span style={{ color: '#388bfd' }}>RSI</span> — Buy when RSI {">"} {config.strategyConfig.rsi?.oversold}, Sell when RSI {"<"} {config.strategyConfig.rsi?.overbought}</div>
            <div><span style={{ color: '#d29922' }}>EMA Cross</span> — Buy EMA{config.strategyConfig.ema?.fastPeriod} above EMA{config.strategyConfig.ema?.slowPeriod}, Sell when crosses below</div>
            <div><span style={{ color: '#a371f7' }}>MACD</span> — Buy on bullish crossover, Sell on bearish crossover</div>
            <div><span style={{ color: '#f0883e' }}>Bollinger</span> — Buy bounce off lower band, Sell rejection of upper band</div>
          </div>
          {config.strategy === 'combined' && (
            <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(56,139,253,0.08)', borderRadius: '6px', fontSize: '12px', color: '#388bfd' }}>
              ℹ Combined mode requires ≥2 indicators to agree before placing an order
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
