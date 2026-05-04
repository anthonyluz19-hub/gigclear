/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

process.env.PORT = process.env.PORT || '3099';
process.env.DATABASE_PATH = path.join(__dirname, '..', 'tmp', 'e2e.db');
process.env.MOCK_EMAIL = '1';
process.env.CRON_SECRET = 'test-secret';
process.env.APP_URL = 'http://localhost:5173';
process.env.API_URL = `http://localhost:${process.env.PORT}`;

fs.mkdirSync(path.join(__dirname, '..', 'tmp'), { recursive: true });
fs.rmSync(process.env.DATABASE_PATH, { force: true });
fs.rmSync(process.env.DATABASE_PATH + '-wal', { force: true });
fs.rmSync(process.env.DATABASE_PATH + '-shm', { force: true });
fs.rmSync(path.join(__dirname, '..', 'tmp', 'emails'), { recursive: true, force: true });

const BASE = `http://localhost:${process.env.PORT}`;
const CLIENT_ID = 'e2e-client-' + Date.now();

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

async function http(method, urlPath, body, headers = {}) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + '/api/health');
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}

async function runTests() {
  // 1. health
  let r = await http('GET', '/api/health');
  if (r.status !== 200 || !r.body.ok) fail(`health: ${r.status} ${JSON.stringify(r.body)}`);
  ok('health');

  // 2. sync without subscription should 404
  r = await http('POST', '/api/sync', {
    client_id: CLIENT_ID,
    entry: { id: 'x', weekOf: isoDaysAgo(3), platform: 'Uber', gross: 100 },
  });
  if (r.status !== 404) fail(`sync without subscription should 404, got ${r.status}`);
  ok('sync rejected without subscription');

  // 3. subscribe with bad email
  r = await http('POST', '/api/subscribe', { client_id: CLIENT_ID, email: 'nope', locale: 'en' });
  if (r.status !== 400) fail(`bad email should 400, got ${r.status}`);
  ok('rejects invalid email');

  // 4. subscribe with initial entries (last week)
  const lastWeekStart = isoDaysAgo(7);
  r = await http('POST', '/api/subscribe', {
    client_id: CLIENT_ID,
    email: 'driver@test.local',
    locale: 'en',
    entries: [
      { id: 'a1', weekOf: lastWeekStart, platform: 'Uber',
        gross: 600, hours: 30, miles: 400, gasExpense: 80, otherExpense: 10 },
      { id: 'a2', weekOf: lastWeekStart, platform: 'DoorDash',
        gross: 250, hours: 12, miles: 150, gasExpense: 30, otherExpense: 0 },
    ],
  });
  if (r.status !== 200 || !r.body.ok) fail(`subscribe: ${r.status} ${JSON.stringify(r.body)}`);
  ok('subscribed with initial entries');

  // 5. add an entry via sync
  r = await http('POST', '/api/sync', {
    client_id: CLIENT_ID,
    entry: { id: 'a3', weekOf: lastWeekStart, platform: 'Lyft',
      gross: 180, hours: 8, miles: 110, gasExpense: 22, otherExpense: 0 },
  });
  if (r.status !== 200 || r.body.count !== 1) fail(`sync add: ${JSON.stringify(r.body)}`);
  ok('synced new entry');

  // 6. update existing via upsert
  r = await http('POST', '/api/sync', {
    client_id: CLIENT_ID,
    entry: { id: 'a3', weekOf: lastWeekStart, platform: 'Lyft',
      gross: 200, hours: 8, miles: 110, gasExpense: 22, otherExpense: 0 },
  });
  if (r.status !== 200) fail(`sync upsert: ${JSON.stringify(r.body)}`);
  ok('upserts on duplicate id');

  // 7. delete an entry
  r = await http('DELETE', `/api/sync/a2?client_id=${CLIENT_ID}`);
  if (r.status !== 200) fail(`delete: ${JSON.stringify(r.body)}`);
  ok('deleted entry');

  // 8. cron without secret should 401
  r = await http('POST', '/api/cron/weekly');
  if (r.status !== 401) fail(`cron without secret should 401, got ${r.status}`);
  ok('cron requires secret');

  // 9. cron with secret runs and writes mock emails
  r = await http('POST', '/api/cron/weekly', null, { 'x-cron-secret': 'test-secret' });
  if (r.status !== 200 || !r.body.ok) fail(`cron run: ${r.status} ${JSON.stringify(r.body)}`);
  if (r.body.sent !== 1) fail(`expected 1 email sent, got ${r.body.sent}`);
  ok(`cron sent ${r.body.sent} email`);

  // 10. inspect mock email
  const emailsDir = path.join(__dirname, '..', 'tmp', 'emails');
  const files = fs.readdirSync(emailsDir);
  if (files.length !== 1) fail(`expected 1 mock email file, got ${files.length}`);
  const html = fs.readFileSync(path.join(emailsDir, files[0]), 'utf8');
  // Entry a3 was upserted to gross 200, a1 is 600, a2 deleted. Total gross should be 800.
  if (!html.includes('$800')) fail('email does not contain expected total gross $800');
  if (!html.includes('Uber')) fail('email missing best-platform line for Uber');
  if (!html.includes('Unsubscribe')) fail('email missing unsubscribe link');
  ok('email content has expected totals + unsubscribe');
  console.log(`  → email saved at ${path.join(emailsDir, files[0])}`);

  // 11. unsubscribe
  const tokenMatch = html.match(/token=([a-f0-9]+)/);
  if (!tokenMatch) fail('email missing unsubscribe token');
  const unsubRes = await fetch(BASE + `/api/unsubscribe?token=${tokenMatch[1]}`);
  if (unsubRes.status !== 200) fail(`unsubscribe: ${unsubRes.status}`);
  ok('unsubscribe link works');

  // 12. cron after unsubscribe should send 0 (and not write any new email files)
  const before = fs.readdirSync(emailsDir).length;
  r = await http('POST', '/api/cron/weekly', null, { 'x-cron-secret': 'test-secret' });
  if (r.body.sent !== 0) fail(`after unsubscribe expected 0 sent, got ${r.body.sent}`);
  const after = fs.readdirSync(emailsDir).length;
  if (after !== before) fail(`unexpected new email files after unsubscribe (${before} → ${after})`);
  ok('cron skips unsubscribed users');

  console.log('\nAll e2e checks passed.');
}

const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: process.env,
  stdio: ['ignore', 'inherit', 'inherit'],
});

let exitCode = 1;
(async () => {
  try {
    await waitForServer();
    await runTests();
    exitCode = 0;
  } catch (err) {
    console.error(err);
  } finally {
    server.kill();
    setTimeout(() => process.exit(exitCode), 200);
  }
})();
