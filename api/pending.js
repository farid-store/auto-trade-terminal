import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // Ambil 1 trade yang PENDING
  const { data, error } = await supabase
    .from('trade_queue')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || data.length === 0) {
    return res.status(200).json({ pending: false });
  }

  const trade = data[0];

  // Ubah status menjadi EXECUTED agar tidak dieksekusi 2 kali
  await supabase
    .from('trade_queue')
    .update({ status: 'EXECUTED' })
    .eq('id', trade.id);

  // Kirim data trade ke MT5
  res.status(200).json({
    pending: true,
    trade: trade
  });
}
