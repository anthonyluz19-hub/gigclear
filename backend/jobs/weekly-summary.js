const fs = require('fs');
const path = require('path');
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}
const { Resend } = require('resend');
const db = require('../db');
const { buildEmail } = require('./email-templates');

function mockMailer(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  return {
    emails: {
      send: async ({ to, subject, html }) => {
        const safe = to.replace(/[^a-z0-9]/gi, '_');
        const file = path.join(outDir, `${Date.now()}_${safe}.html`);
        fs.writeFileSync(file, `<!-- to: ${to}\n     subject: ${subject} -->\n${html}`);
        console.log(`[mock] wrote ${file}`);
        return { data: { id: 'mock' }, error: null };
      },
    },
  };
}

function lastWeekRange(now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - end.getUTCDay());
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return {
    startISO: start.toISOString().slice(0, 10),
    endISO: end.toISOString().slice(0, 10),
  };
}

function formatWeekLabel(startISO, locale) {
  const d = new Date(startISO + 'T00:00:00Z');
  return d.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

async function run() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.APP_URL || 'https://gigclear.vercel.app';
  const apiBase = process.env.API_URL || '';

  const useMock = process.env.MOCK_EMAIL === '1';
  if (!useMock) {
    const missing = [];
    if (!apiKey) missing.push('RESEND_API_KEY');
    if (!from) missing.push('EMAIL_FROM');
    if (missing.length) {
      const envFile = path.join(__dirname, '..', '.env');
      throw new Error(
        `Missing env vars: ${missing.join(', ')}. ` +
        `Checked ${envFile}. Either fill them in that file (and re-run), ` +
        `export them in the shell, or set MOCK_EMAIL=1 to write emails to disk instead.`
      );
    }
  }
  const resend = useMock
    ? mockMailer(path.join(__dirname, '..', 'tmp', 'emails'))
    : new Resend(apiKey);
  const fromAddr = useMock ? 'mock@local' : from;

  const { startISO, endISO } = lastWeekRange();
  const subscribers = db
    .prepare('SELECT * FROM subscribers WHERE active = 1')
    .all();

  const getEntries = db.prepare(`
    SELECT * FROM synced_entries
    WHERE client_id = ? AND week_start >= ? AND week_start < ?
  `);
  const markSent = db.prepare(`UPDATE subscribers SET last_sent_at = datetime('now') WHERE client_id = ?`);

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      const entries = getEntries.all(sub.client_id, startISO, endISO);
      const unsubscribeUrl = `${apiBase}/api/unsubscribe?token=${sub.unsubscribe_token}`;
      const weekLabel = formatWeekLabel(startISO, sub.locale);
      const { subject, html } = buildEmail({
        entries,
        locale: sub.locale,
        weekLabel,
        appUrl,
        unsubscribeUrl,
      });
      const { error } = await resend.emails.send({
        from: fromAddr,
        to: sub.email,
        subject,
        html,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      });
      if (error) throw error;
      markSent.run(sub.client_id);
      sent++;
    } catch (err) {
      console.error(`failed to send to ${sub.email}:`, err.message || err);
      failed++;
    }
  }

  return { sent, failed, total: subscribers.length, weekStart: startISO };
}

module.exports = run;

if (require.main === module) {
  run()
    .then((r) => { console.log('weekly summary done:', r); process.exit(0); })
    .catch((e) => { console.error(e.message || e); process.exit(1); });
}
