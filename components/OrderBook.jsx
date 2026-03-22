import { useState, useEffect } from 'react'
import ExchangeSelector from './ExchangeSelector'

export default function OrderBook() {
  const [exchange, setExchange] = useState('binance')
  const [symbol, setSymbol] = useState('BTC/USDT')
  const [orderBook, setOrderBook] = useState(null)
  const [ticker, setTicker] = useState(null)
  const [loading, setLoading] = useState(false)
  const [openOrders, setOpenOrders] = useState([])

  // Manual order form
  const [form, setForm] = useState({ side: 'buy', type: 'market', amount: '', price: '', stopLoss: '', takeProfit: '' })
  const [placing, setPlacing] = useState(false)
  const [orderMsg, setOrderMsg] = useState(null)

  useEffect(() => {
    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 5000)
    return () => clearInterval(interval)
  }, [exchange, symbol])

  useEffect(() => {
    fetchOpenOrders()
  }, [exchange, symbol])

  const fetchOrderBook = async () => {
    if (exchange === 'mt5') return // MT5 doesn't have order book
    setLoading(true)
    try {
      const [obRes, tickRes] = await Promise.all([
        fetch(`/api/market?action=orderbook&exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`),
        fetch(`/api/market?action=ticker&exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`),
      ])
      const [obData, tickData] = await Promise.all([obRes.json(), tickRes.json()])
      if (obData.success) setOrderBook(obData.data)
      if (tickData.success) setTicker(tickData.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchOpenOrders = async () => {
    try {
      const r = await fetch(`/api/trade?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`)
      const data = await r.json()
      if (data.success) setOpenOrders(Array.isArray(data.data) ? data.data : [])
    } catch (_) {}
  }

  const placeOrder = async () => {
    if (!form.amount) return setOrderMsg({ type: 'error', msg: 'Amount is required' })
    setPlacing(true)
    setOrderMsg(null)
    try {
      const r = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange, symbol,
          side: form.side,
          type: form.type,
          amount: parseFloat(form.amount),
          price: form.price ? parseFloat(form.price) : undefined,
          stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : undefined,
          takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : undefined,
          balance: 10000,
        }),
      })
      const data = await r.json()
      if (data.success) {
        setOrderMsg({ type: 'success', msg: `Order placed! ID: ${data.order?.id || 'N/A'}` })
        setForm(prev => ({ ...prev, amount: '', price: '', stopLoss: '', takeProfit: '' }))
        fetchOpenOrders()
      } else {
        setOrderMsg({ type: 'error', msg: data.error || 'Order failed' })
      }
    } catch (e) {
      setOrderMsg({ type: 'error', msg: e.message })
    }
    setPlacing(false)
  }

  const cancelOrder = async (orderId) => {
    try {
      await fetch('/api/trade', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange, orderId, symbol }),
      })
      fetchOpenOrders()
    } catch (e) { alert(e.message) }
  }

  const maxBidVol = orderBook ? Math.max(...orderBook.bids.map(b => b[1])) : 1
  const maxAskVol = orderBook ? Math.max(...orderBook.asks.map(a => a[1])) : 1

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {/* Order Book */}
      <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d' }}>
          <ExchangeSelector exchange={exchange} symbol={symbol} onExchangeChange={setExchange} onSymbolChange={setSymbol} />
        </div>

        {/* Spread */}
        {ticker && (
          <div style={{ padding: '8px 16px', background: '#0d1117', textAlign: 'center', borderBottom: '1px solid #30363d' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#e6edf3', fontFamily: 'monospace' }}>
              {Number(ticker.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </span>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: ticker.changePercent >= 0 ? '#3fb950' : '#f85149' }}>
              {ticker.changePercent >= 0 ? '▲' : '▼'} {Math.abs(ticker.changePercent || 0).toFixed(2)}%
            </span>
          </div>
        )}

        {orderBook && exchange !== 'mt5' ? (
          <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '6px 16px', borderBottom: '1px solid #30363d' }}>
              <span style={{ color: '#6e7681', fontSize: '10px', textTransform: 'uppercase' }}>Price</span>
              <span style={{ color: '#6e7681', fontSize: '10px', textTransform: 'uppercase', textAlign: 'center' }}>Amount</span>
              <span style={{ color: '#6e7681', fontSize: '10px', textTransform: 'uppercase', textAlign: 'right' }}>Total</span>
            </div>

            {/* Asks (sell orders) - reversed so lowest ask is closest to spread */}
            {[...orderBook.asks].reverse().slice(0, 12).map(([price, amount], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '3px 16px', position: 'relative', cursor: 'pointer' }}
                onClick={() => setForm(prev => ({ ...prev, price: price.toString(), side: 'sell' }))}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(248,81,73,0.07)', width: `${(amount / maxAskVol) * 100}%` }} />
                <span style={{ color: '#f85149', position: 'relative' }}>{Number(price).toFixed(4)}</span>
                <span style={{ color: '#e6edf3', textAlign: 'center', position: 'relative' }}>{Number(amount).toFixed(4)}</span>
                <span style={{ color: '#8b949e', textAlign: 'right', position: 'relative' }}>{(price * amount).toFixed(2)}</span>
              </div>
            ))}

            {/* Spread indicator */}
            {orderBook.asks[0] && orderBook.bids[0] && (
              <div style={{ padding: '4px 16px', background: '#0d1117', textAlign: 'center', fontSize: '11px', color: '#6e7681' }}>
                Spread: {(orderBook.asks[0][0] - orderBook.bids[0][0]).toFixed(4)}
              </div>
            )}

            {/* Bids (buy orders) */}
            {orderBook.bids.slice(0, 12).map(([price, amount], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '3px 16px', position: 'relative', cursor: 'pointer' }}
                onClick={() => setForm(prev => ({ ...prev, price: price.toString(), side: 'buy' }))}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(63,185,80,0.07)', width: `${(amount / maxBidVol) * 100}%` }} />
                <span style={{ color: '#3fb950', position: 'relative' }}>{Number(price).toFixed(4)}</span>
                <span style={{ color: '#e6edf3', textAlign: 'center', position: 'relative' }}>{Number(amount).toFixed(4)}</span>
                <span style={{ color: '#8b949e', textAlign: 'right', position: 'relative' }}>{(price * amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#6e7681', padding: '40px', fontSize: '13px' }}>
            {loading ? 'Loading...' : exchange === 'mt5' ? 'Order book not available for MT5' : 'No order book data'}
          </div>
        )}
      </div>

      {/* Right panel: Trade form + Open orders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Manual Trade Form */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ color: '#e6edf3', marginBottom: '16px' }}>📝 Place Order</h3>

          {/* BUY/SELL toggle */}
          <div style={{ display: 'flex', marginBottom: '14px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #30363d' }}>
            <button onClick={() => setForm(p => ({ ...p, side: 'buy' }))}
              style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', background: form.side === 'buy' ? '#3fb950' : 'transparent', color: form.side === 'buy' ? '#000' : '#8b949e', transition: 'all 0.15s' }}>
              BUY / LONG
            </button>
            <button onClick={() => setForm(p => ({ ...p, side: 'sell' }))}
              style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', background: form.side === 'sell' ? '#f85149' : 'transparent', color: form.side === 'sell' ? '#fff' : '#8b949e', transition: 'all 0.15s' }}>
              SELL / SHORT
            </button>
          </div>

          {/* Order type */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {['market', 'limit'].map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: form.type === t ? '1px solid #388bfd' : '1px solid #30363d', background: form.type === t ? 'rgba(56,139,253,0.15)' : 'transparent', color: form.type === t ? '#388bfd' : '#8b949e', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {form.type === 'limit' && (
              <div>
                <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" style={{ width: '100%' }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</div>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.001" style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#f85149', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stop Loss</div>
                <input type="number" value={form.stopLoss} onChange={e => setForm(p => ({ ...p, stopLoss: e.target.value }))} placeholder="Optional" style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#3fb950', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Take Profit</div>
                <input type="number" value={form.takeProfit} onChange={e => setForm(p => ({ ...p, takeProfit: e.target.value }))} placeholder="Optional" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {orderMsg && (
            <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: orderMsg.type === 'success' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', color: orderMsg.type === 'success' ? '#3fb950' : '#f85149', fontSize: '12px' }}>
              {orderMsg.msg}
            </div>
          )}

          <button onClick={placeOrder} disabled={placing || !form.amount}
            style={{
              width: '100%', marginTop: '14px', padding: '11px',
              background: form.side === 'buy' ? '#3fb950' : '#f85149',
              border: 'none', borderRadius: '6px',
              color: form.side === 'buy' ? '#000' : '#fff',
              fontWeight: 700, fontSize: '14px',
              cursor: placing || !form.amount ? 'not-allowed' : 'pointer',
              opacity: placing ? 0.7 : 1,
            }}>
            {placing ? 'Placing...' : `${form.side === 'buy' ? '▲ BUY' : '▼ SELL'} ${symbol} — ${form.type.toUpperCase()}`}
          </button>
        </div>

        {/* Open Orders */}
        <div style={{ background: '#1c2230', border: '1px solid #30363d', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#e6edf3', fontSize: '14px' }}>📋 Open Orders ({openOrders.length})</h3>
            <button onClick={fetchOpenOrders} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px' }}>🔄</button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {openOrders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6e7681', padding: '20px', fontSize: '12px' }}>No open orders</div>
            ) : openOrders.map(order => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>{order.symbol}</span>
                  <span style={{ marginLeft: '8px', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: order.side === 'buy' ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)', color: order.side === 'buy' ? '#3fb950' : '#f85149' }}>
                    {order.side?.toUpperCase()}
                  </span>
                  <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px', fontFamily: 'monospace' }}>
                    {order.amount} @ {order.price ? Number(order.price).toFixed(4) : 'market'}
                  </div>
                </div>
                <button onClick={() => cancelOrder(order.id)}
                  style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid #f8514944', borderRadius: '5px', color: '#f85149', cursor: 'pointer', padding: '4px 10px', fontSize: '11px' }}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
