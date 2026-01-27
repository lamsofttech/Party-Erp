// src/hooks/useTurnoutQueue.ts
import { useCallback, useEffect } from 'react';
import { DeltaEvent, submitEventsBatch } from '../services/turnoutApi';

const QUEUE_KEY = 'turnout:queue';

function readQueue(): DeltaEvent[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') ?? []; }
  catch { return []; }
}
function writeQueue(q: DeltaEvent[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}
export function enqueueEvent(e: DeltaEvent) {
  const q = readQueue(); q.push(e); writeQueue(q);
}

export function useTurnoutQueue(onFlushed?: () => void) {
  const flushQueue = useCallback(async () => {
    const q = readQueue();
    if (!q.length) return { flushed: 0 };
    try {
      const { applied } = await submitEventsBatch(q);
      // If server accepted all, clear queue.
      // If you want partial-success handling, filter here by IDs.
      writeQueue([]);
      onFlushed?.();
      return { flushed: applied };
    } catch {
      // stay queued
      return { flushed: 0 };
    }
  }, [onFlushed]);

  // Auto-flush on online / tab focus
  useEffect(() => {
    const onOnline = () => { void flushQueue(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void flushQueue(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [flushQueue]);

  return { flushQueue };
}

// Tiny helper to create an idempotency key
export function makeKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
