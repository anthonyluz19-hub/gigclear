const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

const SE_TAX_RATE = 0.153;
const IRS_MILEAGE_RATE = 0.67; // 2024 IRS standard mileage rate

function calcEntry(entry) {
  const totalExpenses = entry.gas_expense + entry.other_expense;
  const netIncome = entry.gross_earnings - totalExpenses;
  const seTax = Math.max(0, netIncome * SE_TAX_RATE);
  const taxSavings = Math.max(0, netIncome * (SE_TAX_RATE + 0.12)); // SE tax + estimated income tax
  const costPerMile = entry.miles_driven > 0
    ? totalExpenses / entry.miles_driven
    : 0;
  const irsDeduction = entry.miles_driven * IRS_MILEAGE_RATE;
  return { ...entry, netIncome, seTax, taxSavings, costPerMile, irsDeduction };
}

// GET all entries for user
router.get('/', auth, (req, res) => {
  const entries = db
    .prepare('SELECT * FROM entries WHERE user_id = ? ORDER BY week_start DESC')
    .all(req.user.id);
  res.json(entries.map(calcEntry));
});

// GET summary stats
router.get('/summary', auth, (req, res) => {
  const entries = db
    .prepare('SELECT * FROM entries WHERE user_id = ?')
    .all(req.user.id);

  const calculated = entries.map(calcEntry);

  const totalGross = calculated.reduce((s, e) => s + e.gross_earnings, 0);
  const totalExpenses = calculated.reduce((s, e) => s + e.gas_expense + e.other_expense, 0);
  const totalNet = calculated.reduce((s, e) => s + e.netIncome, 0);
  const totalMiles = calculated.reduce((s, e) => s + e.miles_driven, 0);
  const totalSeTax = calculated.reduce((s, e) => s + e.seTax, 0);
  const totalTaxSavings = calculated.reduce((s, e) => s + e.taxSavings, 0);
  const avgCostPerMile = totalMiles > 0 ? totalExpenses / totalMiles : 0;

  // Monthly aggregation for charts (last 6 months)
  const monthlyMap = {};
  for (const e of calculated) {
    const month = e.week_start.slice(0, 7); // YYYY-MM
    if (!monthlyMap[month]) {
      monthlyMap[month] = { month, gross: 0, expenses: 0, net: 0, miles: 0 };
    }
    monthlyMap[month].gross += e.gross_earnings;
    monthlyMap[month].expenses += e.gas_expense + e.other_expense;
    monthlyMap[month].net += e.netIncome;
    monthlyMap[month].miles += e.miles_driven;
  }
  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  // Platform breakdown
  const platformMap = {};
  for (const e of calculated) {
    if (!platformMap[e.platform]) platformMap[e.platform] = 0;
    platformMap[e.platform] += e.gross_earnings;
  }
  const byPlatform = Object.entries(platformMap).map(([platform, gross]) => ({ platform, gross }));

  res.json({
    totalGross,
    totalExpenses,
    totalNet,
    totalMiles,
    totalSeTax,
    totalTaxSavings,
    avgCostPerMile,
    monthly,
    byPlatform,
    entryCount: entries.length,
  });
});

// POST create entry
router.post('/', auth, (req, res) => {
  const { week_start, platform, gross_earnings, miles_driven, gas_expense, other_expense, notes } = req.body;
  if (!week_start || !platform || gross_earnings == null) {
    return res.status(400).json({ error: 'week_start, platform, and gross_earnings are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO entries (user_id, week_start, platform, gross_earnings, miles_driven, gas_expense, other_expense, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.user.id,
    week_start,
    platform,
    Number(gross_earnings),
    Number(miles_driven) || 0,
    Number(gas_expense) || 0,
    Number(other_expense) || 0,
    notes || null
  );
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
  res.json(calcEntry(entry));
});

// PUT update entry
router.put('/:id', auth, (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const { week_start, platform, gross_earnings, miles_driven, gas_expense, other_expense, notes } = req.body;
  db.prepare(`
    UPDATE entries SET week_start=?, platform=?, gross_earnings=?, miles_driven=?, gas_expense=?, other_expense=?, notes=?
    WHERE id = ? AND user_id = ?
  `).run(
    week_start ?? entry.week_start,
    platform ?? entry.platform,
    gross_earnings != null ? Number(gross_earnings) : entry.gross_earnings,
    miles_driven != null ? Number(miles_driven) : entry.miles_driven,
    gas_expense != null ? Number(gas_expense) : entry.gas_expense,
    other_expense != null ? Number(other_expense) : entry.other_expense,
    notes !== undefined ? notes : entry.notes,
    req.params.id,
    req.user.id
  );
  const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  res.json(calcEntry(updated));
});

// DELETE entry
router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM entries WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ success: true });
});

module.exports = router;
