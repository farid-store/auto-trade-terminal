import { createClient } from '@supabase/supabase-js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN; // Token bot dari BotFather
const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // ID Telegram kamu

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Contoh payload dari MT5/TradingView: { "pair": "XAUUSD", "action": "BUY", "price": 2000 }
  const { pair, action, price } = req.body;

  const message = `🚨 **Sinyal Trading Masuk!**\n\nPair: ${pair}\nAction: ${action}\nHarga: ${price}\n\nApakah ingin dieksekusi?`;

  // Membuat tombol Inline Keyboard
  const keyboard = {
    inline_keyboard: [
      [
        { text: `✅ Eksekusi ${action}`, callback_data: `EXEC_${pair}_${action}` },
        { text: '❌ Abaikan', callback_data: `CANCEL_${pair}` }
      ]
    ]
  };

  // Kirim ke Telegram
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  });

  res.status(200).json({ success: true, message: 'Signal sent to Telegram' });
}
