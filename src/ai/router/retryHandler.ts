import { MAX_RETRIES_TRANSIENT, RETRY_BACKOFF_MS, RETRY_JITTER_MS } from '@/config/constants';

export interface RetryOptions {
  retries?: number;
  backoffMs?: number[];
  jitterMs?: number;
  shouldRetry: (err: unknown) => boolean;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
  signal?: AbortSignal;
  onRetry?: (attempt: number, err: unknown) => void;
}

/** Retry terbatas (maks `retries` kali tambahan) dengan backoff + jitter. Tidak pernah loop tak terbatas. */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions): Promise<T> {
  const retries = Math.max(0, Math.min(opts.retries ?? MAX_RETRIES_TRANSIENT, 5));
  const backoff = opts.backoffMs ?? RETRY_BACKOFF_MS;
  const jitter = opts.jitterMs ?? RETRY_JITTER_MS;
  const random = opts.random ?? Math.random;
  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !opts.shouldRetry(err) || opts.signal?.aborted) throw err;
      const base = backoff[Math.min(attempt, backoff.length - 1)] ?? 1000;
      attempt++;
      opts.onRetry?.(attempt, err);
      await opts.sleep(base + Math.round(random() * jitter), opts.signal);
    }
  }
}
