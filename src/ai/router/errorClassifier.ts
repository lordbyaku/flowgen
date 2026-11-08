import { ProviderError } from '@/ai/providers/aiProvider';
import type { AppErrorCode } from '@/types';
import { redactSecrets } from '@/ai/sanitize';

export interface Classified {
  code: AppErrorCode;
  httpStatus?: number;
  retryDelaySec?: number;
  /** Pesan teknis yang sudah disanitasi (untuk log lokal). */
  detail: string;
  retryable: boolean;
}

/** Klasifikasi error sesuai tabel 22.3. */
export function classifyError(err: unknown): Classified {
  if (err instanceof ProviderError) {
    const detail = redactSecrets(err.message);
    switch (err.kind) {
      case 'aborted':
        return { code: 'aborted', detail, retryable: false };
      case 'timeout':
      case 'network':
        return { code: 'network', detail, retryable: true };
      case 'blocked':
        return { code: 'blocked', httpStatus: err.httpStatus, detail, retryable: false };
      case 'truncated':
        return { code: 'truncated', httpStatus: err.httpStatus, detail, retryable: false };
      case 'http': {
        const s = err.httpStatus ?? 0;
        if (s === 400) return { code: 'validation', httpStatus: s, detail, retryable: false };
        if (s === 401 || s === 403) return { code: 'auth', httpStatus: s, detail, retryable: false };
        if (s === 404) return { code: 'model_not_found', httpStatus: s, detail, retryable: false };
        if (s === 429)
          return {
            code: err.quotaDaily ? 'quota_daily' : 'rate_limit',
            httpStatus: s,
            retryDelaySec: err.retryDelaySec,
            detail,
            retryable: false,
          };
        if (s === 500 || s === 502 || s === 503 || s === 504)
          return { code: 'server', httpStatus: s, detail, retryable: true };
        return { code: 'unknown', httpStatus: s, detail, retryable: false };
      }
    }
  }
  if (err instanceof DOMException && err.name === 'AbortError') return { code: 'aborted', detail: 'aborted', retryable: false };
  const msg = err instanceof Error ? err.message : String(err);
  return { code: 'unknown', detail: redactSecrets(msg).slice(0, 300), retryable: false };
}
