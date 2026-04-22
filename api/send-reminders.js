import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = 'https://one-percent-better-app-three.vercel.app/challenge';

const MESSAGES = {
  en: (name) => `Hey ${name}! 🌟 Don't forget your daily submission on One % Better. Keep your streak going! 🔥\n\n👉 ${APP_URL}`,
  ru: (name) => `Привет ${name}! 🌟 Не забудь сделать ежедневную запись в One % Better. Не прерывай свою серию! 🔥\n\n👉 ${APP_URL}`,
  ky: (name) => `Салам ${name}! 🌟 One % Better'де күндөлүк жазууңду унутпа. Серияңды үзбө! 🔥\n\n👉 ${APP_URL}`,
};

async function sendTelegramMessage(chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  return res.json();
}

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isManualWithSecret = req.headers['authorization']?.replace('Bearer ', '') === process.env.CRON_SECRET;
  if (!isVercelCron && !isManualWithSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get today's date string in YYYY-MM-DD format (Chicago time UTC-5)
    const now = new Date();
    const chicagoOffset = -5 * 60;
    const chicagoTime = new Date(now.getTime() + chicagoOffset * 60000);
    const todayStr = chicagoTime.toISOString().split('T')[0];

    // Get all active students with telegram usernames
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, telegram_username, preferred_language')
      .eq('status', 'active')
      .neq('telegram_username', '');

    if (studentsError) throw studentsError;

    // Get all submissions for today
    const { data: todaySubmissions, error: subsError } = await supabase
      .from('submissions')
      .select('student_id')
      .eq('date', todayStr);

    if (subsError) throw subsError;

    // Build a set of student IDs who already submitted today
    const submittedTodayIds = new Set((todaySubmissions || []).map(s => s.student_id));

    let sent = 0;
    let skipped = 0;

    for (const student of students || []) {
      if (!student.telegram_username) continue;

      if (submittedTodayIds.has(student.id)) {
        skipped++;
        continue;
      }

      const lang = student.preferred_language || 'en';
      const message = MESSAGES[lang] ? MESSAGES[lang](student.full_name) : MESSAGES.en(student.full_name);

      const username = student.telegram_username.replace('@', '');
      const result = await sendTelegramMessage('@' + username, message);

      if (result.ok) {
        sent++;
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      skipped,
      date: todayStr,
    });
  } catch (err) {
    console.error('Reminder error:', err);
    return res.status(500).json({ error: err.message });
  }
}
