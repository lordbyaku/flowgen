import { describe, expect, it, vi } from 'vitest';
import { createAiService } from '@/ai/aiService';
import type { AIRouter } from '@/ai/router/aiRouter';
import { applyQuickBrief, buildQuickBriefCall, quickBriefFields } from '@/ai/director/quickBriefCall';
import { createEmptyBrief } from '@/config/presets';
import { HUB_STEPS } from '@/config/hubSteps';
import { computeCompleteness } from '@/domain/completeness';
import { BriefSchema } from '@/schemas/brief.schema';
import { GUIDE_TABS } from '@/features/guide/guideContent';

const seed = () => {
  const b = createEmptyBrief();
  b.project = { ...b.project, platforms: ['tiktok'], durationSec: 30 };
  return b;
};

describe('v1.6 — Brief cepat', () => {
  it('hanya mengisi field W/P yang kosong, tanpa keputusan pengguna dan gambar', () => {
    const paths = quickBriefFields(seed()).map((f) => f.path);
    expect(paths).toContain('product.name');
    expect(paths).toContain('project.objective');
    expect(paths).toContain('characters.list.0.nickname');
    for (const p of ['project.name', 'project.brandId', 'project.platforms', 'product.referenceImages', 'characters.list.0.referenceImages'])
      expect(paths).not.toContain(p);
    expect(quickBriefFields(seed()).every((f) => f.level !== 'O')).toBe(true);
  });

  it('panggilan memuat catatan pemilik, pilihan enum, dan mode karakter', () => {
    const c = buildQuickBriefCall(seed(), 'Kopi susu gula aren botol 250 ml untuk mahasiswa.');
    expect(c.task).toBe('brief_assist');
    expect(c.userPrompt).toContain('<owner_notes>');
    expect(c.userPrompt).toContain('Kopi susu gula aren');
    expect(c.userPrompt).toContain('project.objective (W, one of: awareness');
    expect(c.userPrompt).toContain('product.benefits (W, list');
    expect(c.allowedPaths[0]).toBe('characters.mode');
  });

  it('menerapkan nilai valid, menormalkan enum, dan melewati yang tidak valid/tidak diizinkan', () => {
    const s = seed();
    const c = buildQuickBriefCall(s, 'catatan');
    const r = applyQuickBrief(
      s,
      {
        fields: [
          { path: 'product.name', values: [' Kopi Senja '] },
          { path: 'project.objective', values: ['Direct Sales'] },
          { path: 'visual.tone', values: ['bukan-enum'] },
          { path: 'strategy.angles', values: ['problem_solution', 'demo', 'testimonial_ugc'] },
          { path: 'product.usps', values: ['a', 'b', 'c', 'd', 'e'] },
          { path: 'project.brandId', values: ['curang'] },
          { path: 'characters.mode', values: ['no_people'] },
        ],
        assumptions: [' Harga belum disebut. ', ''],
      },
      c.allowedPaths,
    );
    expect(r.brief.product.name).toBe('Kopi Senja');
    expect(r.brief.project.objective).toBe('direct_sales');
    expect(r.brief.visual.tone).toBeUndefined();
    expect(r.brief.strategy.angles).toEqual(['problem_solution', 'demo']);
    expect(r.brief.product.usps).toEqual(['a', 'b', 'c']);
    expect(r.brief.project.brandId).toBe('');
    expect(r.brief.characters.mode).toBe('no_people');
    expect(r.filled[0]).toBe('characters.mode');
    expect(r.filled).not.toContain('visual.tone');
    expect(r.assumptions).toEqual(['Harga belum disebut.']);
    expect(BriefSchema.safeParse(r.brief).success).toBe(true);
    // Mode tanpa orang → field karakter tidak lagi wajib.
    expect(computeCompleteness(r.brief).blockers.some((b) => b.path.startsWith('characters.'))).toBe(false);
  });

  it('aiService.quickBrief mengembalikan brief terisi', async () => {
    const out = { fields: [{ path: 'product.name', values: ['Kopi Senja'] }], assumptions: [] };
    const run = vi.fn(async () => ({ text: JSON.stringify(out), model: 'm', httpStatus: 200, latencyMs: 1, keyId: 'k', keyLabel: 'K' }));
    const svc = createAiService({ provider: {} as never, keys: {} as never, router: { run } as unknown as AIRouter });
    const r = await svc.quickBrief(seed(), 'Kopi susu gula aren botol 250 ml.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.brief.product.name).toBe('Kopi Senja');
    expect(r.value.filled).toEqual(['product.name']);
  });
});

describe('v1.6 — Panduan', () => {
  it('setiap tab project punya penjelasan, dan tab opsional ditandai', () => {
    expect(GUIDE_TABS).toHaveLength(HUB_STEPS.length);
    expect(GUIDE_TABS.every((t) => t.body.length > 20)).toBe(true);
    expect(HUB_STEPS.filter((s) => s.optional).map((s) => s.to)).toEqual(['hooks', 'production', 'publish', 'export']);
  });
});
