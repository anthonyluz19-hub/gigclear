const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 30);
    const stmt = db.prepare(
      'INSERT INTO users (email, password_hash, name, trial_ends_at) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(email.toLowerCase(), hash, name, trialEnds.toISOString());
    const token = jwt.sign({ id: result.lastInsertRowid, email }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    res.json({ token, name, email, trialEndsAt: trialEnds.toISOString() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  res.json({ token, name: user.name, email: user.email, trialEndsAt: user.trial_ends_at });
});

module.exports = router;
