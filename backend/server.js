require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', require('./routes/subscribers'));
app.use('/api/sync', require('./routes/sync'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/cron/weekly', async (req, res) => {
  const secret = req.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const run = require('./jobs/weekly-summary');
    const result = await run();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('cron error', err);
    res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`GigClear API running on port ${PORT}`));
