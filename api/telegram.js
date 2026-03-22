import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;

  // Cek apakah ini callback dari klik tombol (Inline Keyboard)
  if (update.callback_query) {
    const callbackData = update.callback_query.data;
    const chatId = update.callback_query.message.chat.id;
    const messageId = update.callback_query.message.message_id;

    if (callbackData.startsWith('EXEC_')) {
      const parts = callbackData.split('_'); // Hasil: ['EXEC', 'XAUUSD', 'BUY']
      const pair = parts[1];
      const action = parts[2];

      // Masukkan ke Supabase dengan status PENDING
      const { error } = await supabase
        .from('trade_queue')
        .insert([{ pair: pair, action: action, status: 'PENDING' }]);

      if (!error) {
        // Edit pesan Telegram agar tombolnya hilang dan statusnya berubah
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `✅ Sinyal ${action} ${pair} telah masuk antrean eksekusi MT5.`,
          })
        });
      }
    }
    // Tambahkan logika untuk CANCEL jika diperlukan
  }

  res.status(200).send('OK');
}
