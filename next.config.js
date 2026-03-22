/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BINANCE_API_KEY: process.env.BINANCE_API_KEY,
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
    BYBIT_API_KEY: process.env.BYBIT_API_KEY,
    BYBIT_API_SECRET: process.env.BYBIT_API_SECRET,
    OKX_API_KEY: process.env.OKX_API_KEY,
    OKX_API_SECRET: process.env.OKX_API_SECRET,
    OKX_PASSPHRASE: process.env.OKX_PASSPHRASE,
    MT5_SERVER_URL: process.env.MT5_SERVER_URL,
    MT5_ACCOUNT: process.env.MT5_ACCOUNT,
    MT5_PASSWORD: process.env.MT5_PASSWORD,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
