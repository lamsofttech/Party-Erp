// src/types.ts
export interface NewJobPayload {
  job_name: string;
  keywords: string;      // e.g. "candidate x, party y"
  platforms: string;     // e.g. "twitter,news"
  start_date?: string;   // ISO date
  end_date?: string;     // ISO date
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ScrapingJob {
  job_id: string;
  job_name: string;
  keywords: string;
  platforms: string;
  status: JobStatus;
  created_at: string;     // ISO datetime
  completed_at?: string;  // ISO datetime
}

export interface SentimentResult {
  id: string;
  job_id: string;
  source: string;         // e.g. "twitter" / "news"
  text: string;           // the snippet/post/headline
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;          // -1..1 or 0..1 depending on your backend
  published_at?: string;  // ISO datetime
}
