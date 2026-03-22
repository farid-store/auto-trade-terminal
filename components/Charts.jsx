import { useEffect, useRef, useState } from 'react'
import ExchangeSelector from './ExchangeSelector'

export default function Chart({ defaultExchange = 'binance', defaultSymbol = 'BTC/USDT', defaultTf = '1h' }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const candleSeries = useRef(null)
  const ema9Series = useRef(null)
  const ema21Series = useRef(null)
  const volSeries = useRef(null)

  const [exchange, setExchange] = useState(defaultExchange)
  const [symbol, setSymbol] = useState(defaultSymbol)
  const [timeframe, setTimeframe] = useState(defaultTf)
  const [ticker, setTicker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEMA, setShowEMA] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [indicators, setIndicators] = useState(null)

  // Init chart
  useEffect(() => {
    if (!chartRef.current) return
    import('lightweight-charts').then(({ createChart }) => {
      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 420,
        layout: { background: { color: '#0d1117' }, textColor: '#8b949e' },
        grid: { vertLines: { color: '#1c2230' }, horzLines: { color: '#1c2230' } },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: '#30363d' },
        timeScale: { borderColor: '#30363d', timeVisible: true, secondsVisible: false },
      })

      candleSeries.current = chart.addCandlestickSeries({
        upColor: '#3fb950', downColor: '#f85149',
        borderUpColor: '#3fb950', borderDownColor: '#f85149',
        wickUpColor: '#3fb950', wickDownColor: '#f85149',
      })

      ema9Series.current = chart.addLineSeries({ color: '#388bfd', lineWidth: 1, title: 'EMA9' })
      ema21Series.current = chart.addLineSeries({ color: '#d29922', lineWidth: 1, title: 'EMA21' })

      volSeries.current = chart.addHistogramSeries({
        color: '#26a69a', priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
        scaleMargins: { top: 0.85, bottom: 0 },
      })

      chartInstance.current = chart

      const observer = new ResizeObserver(() => {
        if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth })
      })
      observer.observe(chartRef.current)

      return () => { observer.disconnect(); chart.remove() }
    })
  }, [])

  // Fetch and update data
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const [ohlcvRes, tickerRes] = await Promise.all([
          fetch(`/api/market?action=ohlcv&exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=300`),
          fetch(`/api/market?action=ticker&exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`),
        ])
        const [ohlcvData, tickerData] = await Promise.all([ohlcvRes.json(), tickerRes.json()])

        if (cancelled) return

        if (ohlcvData.success && candleSeries.current) {
          const candles = ohlcvData.data
          candleSeries.current.setData(candles)

          // EMA calculations client-side
          const closes = candles.map(c => c.close)
          const ema9 = calcClientEMA(closes, 9)
          const ema21 = calcClientEMA(closes, 21)

          const ema9Data = candles.map((c, i) => ema9[i] !== null ? { time: c.time, value: ema9[i] } : null).filter(Boolean)
          const ema21Data = candles.map((c, i) => ema21[i] !== null ? { time: c.time, value: ema21[i] } : null).filter(Boolean)

          if (showEMA) {
            ema9Series.current?.setData(ema9Data)
            ema21Series.current?.setData(ema21Data)
          } else {
            ema9Series.current?.setData([])
            ema21Series.current?.setData([])
          }

          if (showVolume) {
            volSeries.current?.setData(candles.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(63,185,80,0.4)' : 'rgba(248,81,73,0.4)',
            })))
          }

          // Calculate current indicators
          const rsi = calcClientRSI(closes)
          const lastRSI = rsi[rsi.length - 1]
          const lastEMA9 = ema9[ema9.length - 1]
          const lastEMA21 = ema21[ema21.length - 1]

          setIndicators({
            rsi: lastRSI?.toFixed(2),
            rsiColor: lastRSI > 70 ? '#f85149' : lastRSI < 30 ? '#3fb950' : '#8b949e',
            ema9: lastEMA9?.toFixed(4),
            ema21: lastEMA21?.toFixed(4),
            emaCross: lastEMA9 > lastEMA21 ? 'Bullish' : 'Bearish',
            emaCrossColor: lastEMA9 > lastEMA21 ? '#3fb950' : '#f85149',
          })

          chartInstance.current?.timeScale().fitContent()
        }

        if (tickerData.success) setTicker(tickerData.data)
      } catch (err) {
        console.error('Chart fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [exchange, symbol, timeframe, showEMA, showVolume])

  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', overflow: 'hidden' }}>
      {/* Ticker Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <ExchangeSelector
          exchange={exchange} symbol={symbol} timeframe={timeframe}
          onExchangeChange={setExchange} onSymbolChange={setSymbol} onTimeframeChange={setTimeframe}
        />
        {ticker && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#e6edf3', fontFamily: 'monospace' }}>
              {Number(ticker.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </span>
            <span style={{ color: ticker.changePercent >= 0 ? '#3fb950' : '#f85149', fontWeight: 600 }}>
              {ticker.changePercent >= 0 ? '▲' : '▼'} {Math.abs(ticker.changePercent || 0).toFixed(2)}%
            </span>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>
              <div>H: {Number(ticker.high).toLocaleString()}</div>
              <div>L: {Number(ticker.low).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>
              <div>Vol: {Number(ticker.volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        )}
      </div>

      {/* Indicator bar */}
      <div style={{ padding: '6px 16px', borderBottom: '1px solid #30363d', display: 'flex', gap: '16px', alignItems: 'center', background: '#0d1117' }}>
        <button onClick={() => setShowEMA(!showEMA)} style={{ background: 'none', border: 'none', color: showEMA ? '#388bfd' : '#6e7681', cursor: 'pointer', fontSize: '12px' }}>
          EMA 9/21 {showEMA ? '✓' : '○'}
        </button>
        <button onClick={() => setShowVolume(!showVolume)} style={{ background: 'none', border: 'none', color: showVolume ? '#d29922' : '#6e7681', cursor: 'pointer', fontSize: '12px' }}>
          Volume {showVolume ? '✓' : '○'}
        </button>
        {indicators && (
          <>
            <span style={{ fontSize: '11px', color: indicators.rsiColor, marginLeft: '10px' }}>RSI: {indicators.rsi}</span>
            <span style={{ fontSize: '11px', color: indicators.emaCrossColor }}>EMA Cross: {indicators.emaCross}</span>
            <span style={{ fontSize: '11px', color: '#8b949e' }}>EMA9: {indicators.ema9}</span>
            <span style={{ fontSize: '11px', color: '#8b949e' }}>EMA21: {indicators.ema21}</span>
          </>
        )}
        {loading && <span className="spinner" style={{ width: '12px', height: '12px' }} />}
      </div>

      {/* Chart */}
      <div ref={chartRef} style={{ width: '100%' }} />
    </div>
  )
}

// ─── Client-side indicator helpers ────────────────────────────────────────────

function calcClientEMA(closes, period) {
  const k = 2 / (period + 1)
  const result = new Array(closes.length).fill(null)
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = ema
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

function calcClientRSI(closes, period = 14) {
  const result = new Array(closes.length).fill(null)
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1]
      if (diff > 0) gains += diff
      else losses += Math.abs(diff)
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) { result[i] = 100; continue }
    const rs = avgGain / avgLoss
    result[i] = 100 - 100 / (1 + rs)
  }
  return result
}
