// src/api.ts
// Swap fetch for axios if you prefer. Keep the same named exports used by your page.
import { NewJobPayload, ScrapingJob, SentimentResult } from './types';



// src/api.ts
const BASE = import.meta.env.VITE_API_BASE ?? '';


async function http<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function createJob(payload: NewJobPayload): Promise<{ job_id: string }> {
  return http<{ job_id: string }>('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAllJobs(): Promise<ScrapingJob[]> {
  return http<ScrapingJob[]>('/jobs');
}

export async function getSentimentResults(jobId: string): Promise<SentimentResult[]> {
  return http<SentimentResult[]>(`/jobs/${encodeURIComponent(jobId)}/sentiments`);
}
