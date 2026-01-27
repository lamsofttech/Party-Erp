// src/services/turnoutApi.ts
export type StationDTO = {
  id: string;
  name: string;
  county?: string;
  constituency?: string;
  ward?: string;
  registered: number;
  cap: number;            // server-enforced cap (can be <= registered)
  checked_in: number;     // current server count
  version?: number;       // optional optimistic concurrency marker
};

export type DeltaEvent = {
  stationId: string;
  delta: number;          // +/- integer
  ts: number;             // client timestamp (ms since epoch)
  key: string;            // idempotency key (uuid-ish)
};

const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') ||
  'https://skizagroundsuite.com/API';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token'); // or however you auth
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStation(stationId: string): Promise<StationDTO> {
  const res = await fetch(`${BASE}/stations/${encodeURIComponent(stationId)}`, {
    headers: { 'Accept': 'application/json', ...authHeaders() },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to load station ${stationId}`);
  return res.json();
}

export async function submitEventsBatch(events: DeltaEvent[]): Promise<{ applied: number }> {
  if (!events.length) return { applied: 0 };
  const res = await fetch(`${BASE}/turnout/events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ events }),
    keepalive: true,
  });
  if (!res.ok) throw new Error('Failed to submit events');
  return res.json();
}
