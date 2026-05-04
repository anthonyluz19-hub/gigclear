const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEntry(e) {
  return {
    id: String(e.id),
    week_start: e.week_start || e.weekOf,
    platform: e.platform,
    gross_earnings: Number(e.gross_earnings ?? e.gross) || 0,
    hours: Number(e.hours) || 0,
    miles_driven: Number(e.miles_driven ?? e.miles) || 0,
    gas_expense: Number(e.gas_expense ?? e.gasExpense) || 0,
    other_expense: Number(e.other_expense ?? e.otherExpense) || 0,
    notes: e.notes || null,
  };
}

const upsertEntry = db.prepare(`
  INSERT INTO synced_entries (id, client_id, week_start, platform, gross_earnings, hours, miles_driven, gas_expense, other_expense, notes, updated_at)
  VALUES (@id, @client_id, @week_start, @platform, @gross_earnings, @hours, @miles_driven, @gas_expense, @other_expense, @notes, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    week_start=excluded.week_start,
    platform=excluded.platform,
    gross_earnings=excluded.gross_earnings,
    hours=excluded.hours,
    miles_driven=excluded.miles_driven,
    gas_expense=excluded.gas_expense,
    other_expense=excluded.other_expense,
    notes=excluded.notes,
    updated_at=datetime('now')
`);

const upsertSubscriber = db.prepare(`
  INSERT INTO subscribers (client_id, email, locale, unsubscribe_token, active)
  VALUES (?, ?, ?, ?, 1)
  ON CONFLICT(client_id) DO UPDATE SET
    email=excluded.email,
    locale=excluded.locale,
    active=1
`);

router.post('/subscribe', (req, res) => {
  const { client_id, email, locale, entries } = req.body || {};
  if (!client_id || typeof client_id !== 'string') {
    return res.status(400).json({ error: 'client_id required' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'valid email required' });
  }
  const lang = locale === 'es' ? 'es' : 'en';
  const token = crypto.randomBytes(24).toString('hex');

  const tx = db.transaction(() => {
    upsertSubscriber.run(client_id, email.toLowerCase(), lang, token);
    if (Array.isArray(entries)) {
      for (const e of entries) {
        const norm = { ...normalizeEntry(e), client_id };
        if (!norm.id || !norm.week_start || !norm.platform) continue;
        upsertEntry.run(norm);
      }
    }
  });

  try {
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error('subscribe error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/unsubscribe', (req, res) => {
  const token = req.query.token;
  res.set('Content-Type', 'text/html; charset=utf-8');
  if (!token) {
    return res.status(400).send('<h1>Invalid link</h1>');
  }
  const result = db
    .prepare('UPDATE subscribers SET active = 0 WHERE unsubscribe_token = ?')
    .run(token);
  if (result.changes === 0) {
    return res.status(404).send('<h1>Link not found or already used</h1>');
  }
  res.send(`
    <!doctype html>
    <html><head><meta charset="utf-8"><title>Unsubscribed · GigClear</title>
    <style>body{font-family:system-ui;max-width:480px;margin:80px auto;padding:0 20px;text-align:center}h1{color:#111}p{color:#555}</style>
    </head><body>
      <h1>You're unsubscribed</h1>
      <p>You won't receive any more weekly summaries from GigClear.</p>
    </body></html>
  `);
});

module.exports = router;
