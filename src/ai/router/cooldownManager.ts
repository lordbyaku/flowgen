import { COOLDOWN_STEPS_SEC, QUOTA_RESET_TIMEZONE } from '@/config/constants';
import { nextMidnightInZone } from '@/lib/time';
import type { VaultMeta } from '@/types';

/**
 * Terapkan cooldown pada satu Google Cloud project. `level` naik 1 tiap 429 berturut-turut.
 * Durasi = max(COOLDOWN_STEPS_SEC[level], retryDelay dari provider).
 * Kuota harian: cooldown sampai reset harian (tengah malam Pacific) [VERIFIKASI].
 */
export function applyCooldown(
  meta: VaultMeta,
  projectId: string,
  opts: { daily: boolean; retryDelaySec?: number; now: number },
): { meta: VaultMeta; until: number } {
  const prev = meta.projectCooldowns[projectId];
  // Level naik hanya jika 429 berturut-turut (entri belum di-reset oleh sukses).
  const level = prev ? Math.min(prev.level + 1, COOLDOWN_STEPS_SEC.length - 1) : 0;
  let until: number;
  if (opts.daily) {
    until = nextMidnightInZone(opts.now, QUOTA_RESET_TIMEZONE);
  } else {
    const sec = Math.max(COOLDOWN_STEPS_SEC[level], opts.retryDelaySec ?? 0);
    until = opts.now + sec * 1000;
  }
  return {
    meta: { ...meta, projectCooldowns: { ...meta.projectCooldowns, [projectId]: { until, level } } },
    until,
  };
}

/** Reset level cooldown setelah sukses. */
export function resetCooldown(meta: VaultMeta, projectId: string): VaultMeta {
  if (!meta.projectCooldowns[projectId]) return meta;
  const { [projectId]: _removed, ...rest } = meta.projectCooldowns;
  return { ...meta, projectCooldowns: rest };
}

export function projectCooldownUntil(meta: VaultMeta, projectId: string, now: number): number | null {
  const cd = meta.projectCooldowns[projectId];
  return cd && cd.until > now ? cd.until : null;
}
