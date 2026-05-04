const router = require('express').Router();
const db = require('../db');

const getActive = db.prepare('SELECT 1 FROM subscribers WHERE client_id = ? AND active = 1');

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

function normalize(e, client_id) {
  return {
    id: String(e.id),
    client_id,
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

router.post('/', (req, res) => {
  const { client_id, entry, entries } = req.body || {};
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  if (!getActive.get(client_id)) {
    return res.status(404).json({ error: 'not subscribed' });
  }

  const items = entries || (entry ? [entry] : []);
  if (!items.length) return res.json({ ok: true, count: 0 });

  const tx = db.transaction(() => {
    let count = 0;
    for (const e of items) {
      const norm = normalize(e, client_id);
      if (!norm.id || !norm.week_start || !norm.platform) continue;
      upsertEntry.run(norm);
      count++;
    }
    return count;
  });

  try {
    const count = tx();
    res.json({ ok: true, count });
  } catch (err) {
    console.error('sync error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.delete('/:entryId', (req, res) => {
  const client_id = req.query.client_id;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  if (!getActive.get(client_id)) {
    return res.status(404).json({ error: 'not subscribed' });
  }
  db.prepare('DELETE FROM synced_entries WHERE id = ? AND client_id = ?')
    .run(req.params.entryId, client_id);
  res.json({ ok: true });
});

module.exports = router;
