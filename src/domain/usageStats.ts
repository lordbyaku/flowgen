import { startOfLocalDay } from '@/lib/time';
import type { UsageLog } from '@/types';

/** Hitungan Requests Today (hari lokal). Bukan kuota resmi Google. */
export function countToday(logs: UsageLog[], keyLabel: string | null, nowMs: number): number {
  const start = startOfLocalDay(nowMs);
  return logs.filter((l) => l.ts >= start && (keyLabel === null || l.keyLabel === keyLabel)).length;
}

export interface UsageSummary {
  keyLabel: string;
  requests: number;
  ok: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  lastError?: string;
}

export function summarizeByKey(logs: UsageLog[]): UsageSummary[] {
  const map = new Map<string, UsageSummary>();
  for (const l of [...logs].sort((a, b) => a.ts - b.ts)) {
    const s = map.get(l.keyLabel) ?? { keyLabel: l.keyLabel, requests: 0, ok: 0, failed: 0, inputTokens: 0, outputTokens: 0 };
    s.requests++;
    if (l.ok) s.ok++;
    else {
      s.failed++;
      s.lastError = l.errorCode;
    }
    s.inputTokens += l.inputTokens ?? 0;
    s.outputTokens += l.outputTokens ?? 0;
    map.set(l.keyLabel, s);
  }
  return [...map.values()];
}
