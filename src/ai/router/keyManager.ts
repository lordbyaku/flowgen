import type { LocalKey, VaultMeta } from '@/types';
import { nextAfterCursor } from './roundRobin';

const EXCLUDED: LocalKey['status'][] = ['invalid_key', 'disabled', 'model_unavailable'];

export function isEligible(k: LocalKey, meta: VaultMeta, now: number): boolean {
  const projectCd = meta.projectCooldowns[k.projectId];
  return (
    k.enabled &&
    !EXCLUDED.includes(k.status) &&
    !(k.cooldownUntil && k.cooldownUntil > now) &&
    !(projectCd && projectCd.until > now)
  );
}

export function sortKeys(keys: LocalKey[]): LocalKey[] {
  return [...keys].sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
}

/** Pemilihan key deterministik (22.4). */
export function selectKey(keys: LocalKey[], meta: VaultMeta, now: number): LocalKey | null {
  const eligible = sortKeys(keys.filter((k) => isEligible(k, meta, now)));
  if (eligible.length === 0) return null;
  if (meta.routing === 'single') return eligible.find((k) => k.id === meta.singleKeyId) ?? null;
  if (meta.routing === 'priority') return eligible[0];
  return nextAfterCursor(eligible, meta.rrCursor);
}

/** Waktu cooldown tercepat berakhir di antara key aktif yang hanya tertahan cooldown. */
export function earliestCooldownEnd(keys: LocalKey[], meta: VaultMeta, now: number): number | null {
  let best: number | null = null;
  for (const k of keys) {
    if (!k.enabled || EXCLUDED.includes(k.status)) continue;
    if (meta.routing === 'single' && k.id !== meta.singleKeyId) continue;
    const ends = [k.cooldownUntil ?? 0, meta.projectCooldowns[k.projectId]?.until ?? 0].filter((t) => t > now);
    if (ends.length === 0) continue;
    const t = Math.max(...ends);
    if (best === null || t < best) best = t;
  }
  return best;
}
