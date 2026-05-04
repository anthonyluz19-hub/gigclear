const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'gigclear.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    client_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    unsubscribe_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_sent_at TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS synced_entries (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    week_start TEXT NOT NULL,
    platform TEXT NOT NULL,
    gross_earnings REAL NOT NULL DEFAULT 0,
    hours REAL NOT NULL DEFAULT 0,
    miles_driven REAL NOT NULL DEFAULT 0,
    gas_expense REAL NOT NULL DEFAULT 0,
    other_expense REAL NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_client ON synced_entries(client_id);
  CREATE INDEX IF NOT EXISTS idx_entries_week ON synced_entries(client_id, week_start);
`);

module.exports = db;
