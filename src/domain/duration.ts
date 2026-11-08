import { MAX_AUTO_SCENES, MAX_SCENE_SEC, MIN_SCENE_SEC } from '@/config/constants';
import { clamp } from '@/lib/utils';

export function minScenes(durationSec: number, maxSceneSec = MAX_SCENE_SEC): number {
  return Math.max(1, Math.ceil(durationSec / maxSceneSec));
}

export function maxScenes(durationSec: number, minSceneSec = MIN_SCENE_SEC): number {
  return Math.max(1, Math.floor(durationSec / minSceneSec));
}

export function recommendedScenes(durationSec: number): number {
  const min = minScenes(durationSec);
  return clamp(Math.round(durationSec / 5), min, Math.max(min, MAX_AUTO_SCENES));
}

export function validateManualSceneCount(durationSec: number, count: number): string | null {
  const min = minScenes(durationSec);
  const max = maxScenes(durationSec);
  if (!Number.isInteger(count)) return 'Jumlah scene harus bilangan bulat';
  if (count < min) return `Minimal ${min} scene untuk durasi ${durationSec} detik (maks ${MAX_SCENE_SEC} detik per scene)`;
  if (count > max) return `Maksimal ${max} scene untuk durasi ${durationSec} detik (min ${MIN_SCENE_SEC} detik per scene)`;
  return null;
}

/** Jumlah scene target berdasarkan brief (auto atau manual). */
export function targetSceneCount(
  durationSec: number,
  mode: 'auto' | 'manual',
  manualCount?: number,
  conceptRecommended?: number,
): number {
  const min = minScenes(durationSec);
  const max = maxScenes(durationSec);
  if (mode === 'manual' && manualCount) return clamp(manualCount, min, max);
  const base = conceptRecommended ?? recommendedScenes(durationSec);
  return clamp(base, min, max);
}

export interface DurationIssue {
  index: number;
  message: string;
}

export interface DurationCheck {
  ok: boolean;
  total: number;
  target: number;
  diff: number;
  issues: DurationIssue[];
}

export function validateDurations(durations: number[], target: number): DurationCheck {
  const issues: DurationIssue[] = [];
  durations.forEach((d, i) => {
    if (!Number.isInteger(d)) issues.push({ index: i, message: `Scene ${i + 1}: durasi harus bilangan bulat` });
    else if (d > MAX_SCENE_SEC) issues.push({ index: i, message: `Scene ${i + 1}: lebih dari ${MAX_SCENE_SEC} detik` });
    else if (d < MIN_SCENE_SEC) issues.push({ index: i, message: `Scene ${i + 1}: kurang dari ${MIN_SCENE_SEC} detik` });
  });
  const total = durations.reduce((a, b) => a + b, 0);
  return { ok: issues.length === 0 && total === target, total, target, diff: total - target, issues };
}

/**
 * Saran perbaikan durasi: selisih dibagikan satu detik demi satu ke scene terpanjang (jika kelebihan)
 * atau terpendek (jika kurang) tanpa melanggar batas. Mengembalikan null jika mustahil.
 * Tidak menimpa data — hanya saran.
 */
export function autoFixDurations(durations: number[], target: number): number[] | null {
  if (durations.length === 0) return null;
  const out = durations.map((d) => clamp(Math.round(d), MIN_SCENE_SEC, MAX_SCENE_SEC));
  const n = out.length;
  if (target < n * MIN_SCENE_SEC || target > n * MAX_SCENE_SEC) return null;
  let diff = out.reduce((a, b) => a + b, 0) - target;
  let guard = 10_000;
  while (diff !== 0 && guard-- > 0) {
    if (diff > 0) {
      // kurangi scene terpanjang yang masih > MIN
      let idx = -1;
      for (let i = 0; i < n; i++) if (out[i] > MIN_SCENE_SEC && (idx < 0 || out[i] > out[idx])) idx = i;
      if (idx < 0) return null;
      out[idx] -= 1;
      diff -= 1;
    } else {
      let idx = -1;
      for (let i = 0; i < n; i++) if (out[i] < MAX_SCENE_SEC && (idx < 0 || out[i] < out[idx])) idx = i;
      if (idx < 0) return null;
      out[idx] += 1;
      diff += 1;
    }
  }
  return diff === 0 ? out : null;
}

/** Bagi durasi total secara rata ke n scene (untuk scene baru). */
export function splitEvenly(target: number, n: number): number[] {
  const base = Math.floor(target / n);
  const rem = target - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}
