const EXCHANGE_SYMBOLS = {
  binance: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT'],
  bybit:   ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'MATIC/USDT', 'DOT/USDT'],
  okx:     ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'OKB/USDT', 'DOT/USDT'],
  mt5:     ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'XAUUSD', 'XAGUSD', 'USTEC', 'US30', 'USOIL'],
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']

const EXCHANGE_INFO = {
  binance: { label: 'Binance', emoji: '🟡', color: '#F3BA2F' },
  bybit:   { label: 'Bybit',   emoji: '🟠', color: '#FF6B35' },
  okx:     { label: 'OKX',     emoji: '⚫', color: '#fff' },
  mt5:     { label: 'MT5',     emoji: '🔵', color: '#388bfd' },
}

export default function ExchangeSelector({ exchange, symbol, timeframe, onExchangeChange, onSymbolChange, onTimeframeChange }) {
  const symbols = EXCHANGE_SYMBOLS[exchange] || EXCHANGE_SYMBOLS.binance
  const info = EXCHANGE_INFO[exchange]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
      {/* Exchange */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {Object.entries(EXCHANGE_INFO).map(([ex, info]) => (
          <button
            key={ex}
            onClick={() => {
              onExchangeChange(ex)
              onSymbolChange(EXCHANGE_SYMBOLS[ex][0])
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: exchange === ex ? `1px solid ${info.color}` : '1px solid #30363d',
              background: exchange === ex ? `rgba(${info.color === '#fff' ? '255,255,255' : '56,139,253'},0.1)` : '#161b22',
              color: exchange === ex ? info.color : '#8b949e',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {info.emoji} {info.label}
          </button>
        ))}
      </div>

      {/* Symbol */}
      <select
        value={symbol}
        onChange={e => onSymbolChange(e.target.value)}
        style={{ minWidth: '120px' }}
      >
        {symbols.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Timeframe */}
      {onTimeframeChange && (
        <div style={{ display: 'flex', gap: '3px' }}>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: timeframe === tf ? '1px solid #388bfd' : '1px solid #30363d',
                background: timeframe === tf ? 'rgba(56,139,253,0.15)' : 'transparent',
                color: timeframe === tf ? '#388bfd' : '#8b949e',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
