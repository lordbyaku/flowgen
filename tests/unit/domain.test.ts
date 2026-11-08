import { describe, expect, it } from 'vitest';
import { BriefSchema } from '@/schemas/brief.schema';
import { BRIEF_PRESETS, createEmptyBrief } from '@/config/presets';
import { computeCompleteness } from '@/domain/completeness';
import {
  autoFixDurations,
  minScenes,
  recommendedScenes,
  splitEvenly,
  targetSceneCount,
  validateDurations,
  validateManualSceneCount,
} from '@/domain/duration';
import { checkWords, sceneWordBudget, totalWordBudget } from '@/domain/wordBudget';
import { applyBriefAnswer } from '@/domain/briefAnswer';
import { deepMerge, setPath, slugify } from '@/lib/utils';
import { diffWords } from '@/domain/diff';
import { nextMidnightInZone } from '@/lib/time';
import { makeBrief } from './helpers';

describe('Skema Brief (P1-05)', () => {
  it('brief contoh valid lolos', () => {
    expect(BriefSchema.safeParse(makeBrief()).success).toBe(true);
    expect(BriefSchema.safeParse(createEmptyBrief()).success).toBe(true);
  });
  it('semua preset menghasilkan brief valid', () => {
    for (const p of BRIEF_PRESETS) {
      expect(BriefSchema.safeParse(deepMerge(createEmptyBrief(), p.values)).success, p.id).toBe(true);
    }
  });
  it('brief tidak valid ditolak dengan pesan jelas', () => {
    const b = makeBrief();
    const bad = { ...b, project: { ...b.project, durationSec: 200 }, strategy: { ...b.strategy, angles: ['pov', 'demo', 'bts'] } };
    const r = BriefSchema.safeParse(bad);
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toContain('Durasi maksimal 120 detik');
    expect(msgs).toContain('Maksimal 2 angle');
  });
});

describe('Skor kelengkapan (24.1)', () => {
  it('brief kosong punya blockers W dan skor rendah', () => {
    const c = computeCompleteness(createEmptyBrief());
    expect(c.blockers.length).toBeGreaterThan(5);
    expect(c.warn).toBe(true);
    expect(c.blockers.map((b) => b.path)).toContain('project.name');
    expect(c.suggestions).toHaveLength(5);
    expect(c.suggestions.every((s) => s.level === 'W')).toBe(true);
  });
  it('brief lengkap tidak punya blockers', () => {
    const c = computeCompleteness(makeBrief());
    expect(c.blockers).toEqual([]);
    expect(c.score).toBeGreaterThan(70);
  });
  it('softwareScreens hanya dihitung untuk tipe software', () => {
    const b = makeBrief({ product: { type: 'physical', softwareScreens: [] } });
    expect(computeCompleteness(b).missing.map((m) => m.path)).not.toContain('product.softwareScreens');
    const s = makeBrief({ product: { softwareScreens: [] } });
    expect(computeCompleteness(s).missing.map((m) => m.path)).toContain('product.softwareScreens');
  });
  it('field karakter tidak dihitung pada mode no_people', () => {
    const b = makeBrief({ characters: { mode: 'no_people' } });
    expect(computeCompleteness(b).missing.some((m) => m.path.startsWith('characters'))).toBe(false);
  });
  it('angle dianggap terisi bila AI memilihkan', () => {
    const b = makeBrief({ strategy: { angles: [], aiPicksAngle: true } });
    expect(computeCompleteness(b).blockers.map((x) => x.path)).not.toContain('strategy.angles');
  });
  it('skor = round(100 * terisi / berlaku)', () => {
    const c = computeCompleteness(makeBrief());
    expect(Number.isInteger(c.score)).toBe(true);
    expect(c.score).toBeLessThanOrEqual(100);
  });
});

describe('Durasi (24.2)', () => {
  it.each([
    [10, 2],
    [15, 3],
    [30, 6],
    [60, 12],
  ])('rekomendasi %i detik = %i scene', (d, n) => expect(recommendedScenes(d)).toBe(n));
  it('minimum scene = ceil(D / 8)', () => {
    expect(minScenes(30)).toBe(4);
    expect(minScenes(8)).toBe(1);
    expect(minScenes(9)).toBe(2);
    expect(minScenes(120)).toBe(15);
  });
  it('rekomendasi tidak pernah di bawah minimum', () => {
    expect(recommendedScenes(120)).toBe(15);
  });
  it('validasi jumlah scene manual', () => {
    expect(validateManualSceneCount(30, 3)).toMatch(/Minimal 4/);
    expect(validateManualSceneCount(30, 16)).toMatch(/Maksimal 15/);
    expect(validateManualSceneCount(30, 5)).toBeNull();
  });
  it('targetSceneCount mengikuti konsep tapi di-clamp', () => {
    expect(targetSceneCount(30, 'auto', undefined, 2)).toBe(4);
    expect(targetSceneCount(30, 'manual', 5)).toBe(5);
  });
  it('validateDurations: >8, <2, non-integer, total', () => {
    expect(validateDurations([8, 8, 8, 6], 30).ok).toBe(true);
    const r = validateDurations([9, 1, 2.5], 30);
    expect(r.ok).toBe(false);
    expect(r.issues).toHaveLength(3);
    expect(validateDurations([5, 5], 15).diff).toBe(-5);
  });
  it('autoFixDurations membagi selisih tanpa melanggar batas', () => {
    const fix = autoFixDurations([8, 8, 8, 8], 30)!;
    expect(fix.reduce((a, b) => a + b, 0)).toBe(30);
    expect(fix.every((d) => d >= 2 && d <= 8)).toBe(true);
    const up = autoFixDurations([2, 3, 4], 18)!;
    expect(up.reduce((a, b) => a + b, 0)).toBe(18);
    expect(autoFixDurations([4, 4], 30)).toBeNull();
    expect(autoFixDurations([10, 1], 10)).toEqual([8, 2]);
  });
  it('splitEvenly', () => expect(splitEvenly(30, 4)).toEqual([8, 8, 7, 7]));
});

describe('Anggaran kata VO (24.3)', () => {
  it('total dan per scene', () => {
    expect(totalWordBudget(30, 'id_casual')).toBe(Math.floor(30 * 0.85 * 2.3));
    expect(totalWordBudget(30, 'en')).toBe(Math.floor(30 * 0.85 * 2.5));
    expect(sceneWordBudget(8, 'id_formal')).toBe(15);
  });
  it('checkWords menandai kelebihan', () => {
    expect(checkWords('satu dua tiga', 2).over).toBe(true);
    expect(checkWords('satu dua', 2).over).toBe(false);
  });
});

describe('AI Brief Assistant — tulis balik jawaban', () => {
  it('string, array, dan enum dari label', () => {
    const b = makeBrief({ audience: { desire: '' }, product: { usps: [] } });
    expect(applyBriefAnswer(b, 'audience.desire', 'Untung jelas')!.audience.desire).toBe('Untung jelas');
    expect(applyBriefAnswer(b, 'product.usps', 'Offline')!.product.usps).toEqual(['Offline']);
    expect(applyBriefAnswer(b, 'audience.awareness', 'Sadar masalah')!.audience.awareness).toBe('problem_aware');
  });
  it('jawaban tidak valid untuk enum ditolak', () => {
    expect(applyBriefAnswer(makeBrief(), 'visual.pacing', 'super cepat sekali')).toBeNull();
  });
});

describe('Utilitas', () => {
  it('setPath immutable dengan indeks array', () => {
    const o = { a: [{ b: 1 }, { b: 2 }] };
    const n = setPath(o, 'a.1.b', 5);
    expect(n.a[1].b).toBe(5);
    expect(o.a[1].b).toBe(2);
    expect(Array.isArray(n.a)).toBe(true);
  });
  it('slugify', () => expect(slugify('Promo Kopi Susu — Juli!')).toBe('promo-kopi-susu-juli'));
  it('diffWords menandai tambah/hapus', () => {
    const d = diffWords('a b c', 'a x c');
    expect(d.some((t) => t.type === 'removed' && t.text.includes('b'))).toBe(true);
    expect(d.some((t) => t.type === 'added' && t.text.includes('x'))).toBe(true);
  });
  it('nextMidnightInZone mengembalikan tengah malam berikutnya di Pacific', () => {
    const now = Date.UTC(2026, 10, 8, 12, 0, 0); // 04:00 PST
    const t = nextMidnightInZone(now, 'America/Los_Angeles');
    expect(t).toBe(Date.UTC(2026, 10, 9, 8, 0, 0)); // 00:00 PST = 08:00 UTC
  });
});
