# GigClear backend

Express + SQLite. Stores opt-in email subscribers and synced weekly entries; sends weekly summary emails via Resend.

## Local

```
npm install
cp .env.example .env   # fill RESEND_API_KEY, EMAIL_FROM, CRON_SECRET
npm run dev
```

## End-to-end test (no Resend, no Railway)

`npm run test:e2e` spins up the API on port 3099 against a throwaway SQLite file in `tmp/`, walks the full subscribe → sync → cron → unsubscribe flow with `MOCK_EMAIL=1`, and writes the rendered weekly email to `tmp/emails/` so you can open it in a browser to inspect the layout.

To do a manual UI test against this local backend:

```
# terminal 1
npm run dev   # backend on :3001

# terminal 2 (frontend)
echo 'VITE_API_URL=http://localhost:3001' > .env.local
npm run dev   # frontend on :5173
```

Then in the app, save 3+ entries to trigger the email modal. After subscribing, run `MOCK_EMAIL=1 npm run summary` from the backend folder — the rendered email lands in `backend/tmp/emails/`.

## Routes

- `POST /api/subscribe` — `{ client_id, email, locale, entries[] }`
- `POST /api/sync` — `{ client_id, entry }` or `{ client_id, entries[] }`
- `DELETE /api/sync/:entryId?client_id=...`
- `GET /api/unsubscribe?token=...`
- `POST /api/cron/weekly` — header `x-cron-secret: $CRON_SECRET`
- `GET /api/health`

## Railway deploy

1. New service from this folder. Railway picks up `railway.json`.
2. Add env vars from `.env.example`.
3. Mount a Volume at `/data` and set `DATABASE_PATH=/data/gigclear.db` so SQLite persists across deploys.
4. Add a **Scheduled Job** (Railway cron) running weekly Mondays 13:00 UTC:
   ```
   curl -X POST -H "x-cron-secret: $CRON_SECRET" https://$RAILWAY_PUBLIC_DOMAIN/api/cron/weekly
   ```
   Or run `npm run summary` directly as the scheduled command (uses the same DB volume).

## Resend

Verify a sending domain in Resend before going live. For dev you can use `onboarding@resend.dev`.
