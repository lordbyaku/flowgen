import { MIN_PERFORMANCE_FOR_AI } from '@/config/constants';
import { LABELS } from '@/config/enums';
import type { PerformanceEntry, Project } from '@/types';

/** Engagement rate = (like + komentar + share + simpan) / views. 0 bila views 0. */
export function engagementRate(e: Pick<PerformanceEntry, 'views' | 'likes' | 'comments' | 'shares' | 'saves'>): number {
  return e.views > 0 ? (e.likes + e.comments + e.shares + e.saves) / e.views : 0;
}

export const formatPct = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString('id-ID')}%`;

export interface PerfRow {
  key: string;
  label: string;
  posts: number;
  avgViews: number;
  avgEr: number;
  /** Rata-rata retensi 3 detik dari entri yang mengisinya; null bila tidak ada. */
  avgRetention3s: number | null;
}

export type PerfGroup = 'hookStyle' | 'angle' | 'platform' | 'version';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function groupKey(e: PerformanceEntry, by: PerfGroup): [string, string] | null {
  if (by === 'hookStyle') return e.hookStyle ? [e.hookStyle, LABELS.hookStyle[e.hookStyle]] : null;
  if (by === 'angle') return e.angle ? [e.angle, LABELS.angle[e.angle]] : null;
  if (by === 'platform') return [e.platform, LABELS.platform[e.platform]];
  return [e.version, e.versionLabel];
}

/** Ringkasan per kelompok, diurutkan dari rata-rata views tertinggi. */
export function summarize(entries: PerformanceEntry[], by: PerfGroup): PerfRow[] {
  const groups = new Map<string, { label: string; items: PerformanceEntry[] }>();
  for (const e of entries) {
    const k = groupKey(e, by);
    if (!k) continue;
    const g = groups.get(k[0]) ?? { label: k[1], items: [] };
    g.items.push(e);
    groups.set(k[0], g);
  }
  return [...groups.entries()]
    .map(([key, g]) => {
      const ret = g.items.map((e) => e.retention3sPct).filter((x): x is number => typeof x === 'number');
      return {
        key,
        label: g.label,
        posts: g.items.length,
        avgViews: avg(g.items.map((e) => e.views)),
        avgEr: avg(g.items.map(engagementRate)),
        avgRetention3s: ret.length ? avg(ret) : null,
      };
    })
    .sort((a, b) => b.avgViews - a.avgViews || b.avgEr - a.avgEr);
}

/** Semua entri dari daftar project; bila brandId diberikan dan cukup data, hanya brand itu. */
export function collectEntries(projects: Pick<Project, 'brandId' | 'performance'>[], brandId?: string): PerformanceEntry[] {
  const all = projects.flatMap((p) => p.performance ?? []);
  if (!brandId) return all;
  const own = projects.filter((p) => p.brandId === brandId).flatMap((p) => p.performance ?? []);
  return own.length >= MIN_PERFORMANCE_FOR_AI ? own : all;
}

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/**
 * Wawasan ringkas (Inggris) untuk dikirim ke AI sebagai DATA, maks 6 baris.
 * Kosong bila entri kurang dari MIN_PERFORMANCE_FOR_AI.
 */
export function learningsForAi(entries: PerformanceEntry[]): string[] {
  if (entries.length < MIN_PERFORMANCE_FOR_AI) return [];
  const lines = [`${entries.length} past posts: average ${n(avg(entries.map((e) => e.views)))} views, engagement ${pct(avg(entries.map(engagementRate)))}.`];
  const describe = (r: PerfRow) => `${r.key} (${r.posts} posts, avg ${n(r.avgViews)} views, ER ${pct(r.avgEr)}${r.avgRetention3s !== null ? `, 3s retention ${Math.round(r.avgRetention3s)}%` : ''})`;
  for (const [by, name] of [
    ['hookStyle', 'hook style'],
    ['angle', 'angle'],
  ] as const) {
    const rows = summarize(entries, by);
    if (rows.length >= 2) lines.push(`Best ${name}: ${describe(rows[0])}. Weakest ${name}: ${describe(rows.at(-1)!)}.`);
    else if (rows.length === 1) lines.push(`Only ${name} tested so far: ${describe(rows[0])}.`);
  }
  const top = [...entries].filter((e) => e.hookText.trim()).sort((a, b) => b.views - a.views).slice(0, 2);
  for (const e of top) lines.push(`Top opening line: "${e.hookText.trim().slice(0, 120)}" — ${n(e.views)} views, ER ${pct(engagementRate(e))}.`);
  return lines.slice(0, 6);
}
