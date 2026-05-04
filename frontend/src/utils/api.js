import axios from 'axios';
import { getClientId } from './clientId';

const baseURL = import.meta.env.VITE_API_URL || '';

const client = axios.create({ baseURL, timeout: 8000 });

function entryToServer(entry) {
  return {
    id: String(entry.id),
    week_start: entry.weekOf,
    platform: entry.platform,
    gross_earnings: entry.gross,
    hours: entry.hours,
    miles_driven: entry.miles,
    gas_expense: entry.gasExpense,
    other_expense: entry.otherExpense,
  };
}

export async function subscribe({ email, locale, entries }) {
  if (!baseURL) throw new Error('API not configured');
  const { data } = await client.post('/api/subscribe', {
    client_id: getClientId(),
    email,
    locale,
    entries: (entries || []).map(entryToServer),
  });
  return data;
}

export async function syncEntry(entry) {
  if (!baseURL) return;
  try {
    await client.post('/api/sync', {
      client_id: getClientId(),
      entry: entryToServer(entry),
    });
  } catch (err) {
    console.warn('sync failed', err.message);
  }
}

export async function deleteEntry(entryId) {
  if (!baseURL) return;
  try {
    await client.delete(`/api/sync/${entryId}`, {
      params: { client_id: getClientId() },
    });
  } catch (err) {
    console.warn('delete sync failed', err.message);
  }
}
