import { describe, expect, it, vi } from 'vitest';
import { createGeminiProvider, thinkingConfigFor } from '@/ai/providers/geminiProvider';
import { loadReferenceImages, referenceCandidates } from '@/ai/director/referenceImages';
import { framePromptsFor, buildScenePromptBatches } from '@/ai/director/scenePromptCall';
import { buildScriptStoryboardCall } from '@/ai/director/scriptStoryboardCall';
import { createAiService } from '@/ai/aiService';
import type { AIRouter } from '@/ai/router/aiRouter';
import { applyLintFixes, lintScene, isFixable, type LintContext } from '@/domain/linter';
import { frameCopyText } from '@/domain/promptText';
import { scenePromptTxt } from '@/domain/exporters/txt';
import { MAX_AI_IMAGES } from '@/config/constants';
import type { Scene } from '@/types';
import { GOOD_PROMPT, makeBibles, makeBrief, makeScene } from './helpers';

const KEY = 'AIza' + 'Sy' + 'V11XV11XV11XV11XV11XV11XV11XV11X1';
const okBody = { candidates: [{ content: { parts: [{ text: '{}' }] }, finishReason: 'STOP' }] };
const req = { task: 'concepts' as const, systemPrompt: 's', userPrompt: 'u', temperature: 0, maxOutputTokens: 10 };

describe('thinkingConfig (budget berpikir)', () => {
  it('per keluarga model', () => {
    expect(thinkingConfigFor('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfigFor('gemini-2.5-flash-lite')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfigFor('gemini-2.5-pro')).toEqual({ thinkingBudget: 128 });
    expect(thinkingConfigFor('gemini-3-pro-preview')).toEqual({ thinkingLevel: 'low' });
    expect(thinkingConfigFor('gemini-2.0-flash')).toBeUndefined();
  });

  it('dikirim di generationConfig; bila ditolak (400 "thinking") diulang SEKALI tanpa thinkingConfig', async () => {
    const bodies: Record<string, unknown>[] = [];
    let n = 0;
    const f = vi.fn(async (_u: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init!.body)));
      if (n++ === 0) return new Response(JSON.stringify({ error: { code: 400, message: 'thinking_budget is not supported' } }), { status: 400 });
      return new Response(JSON.stringify(okBody), { status: 200 });
    });
    const p = createGeminiProvider(f as unknown as typeof fetch);
    await p.generate(KEY, 'gemini-2.5-flash', req);
    expect(f).toHaveBeenCalledTimes(2);
    expect((bodies[0].generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect((bodies[1].generationConfig as Record<string, unknown>).thinkingConfig).toBeUndefined();
  });

  it('400 lain tidak diulang', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: { code: 400, message: 'bad schema' } }), { status: 400 }));
    const p = createGeminiProvider(f as unknown as typeof fetch);
    await expect(p.generate(KEY, 'gemini-2.5-flash', req)).rejects.toBeTruthy();
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('Gambar referensi multimodal', () => {
  const img = (id: string) => ({ id, kind: 'local' as const, localId: id });
  it('gambar dikirim sebagai inlineData dengan label sebelum prompt', async () => {
    let body: { contents: { parts: Record<string, unknown>[] }[] } = { contents: [] };
    const f = vi.fn(async (_u: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init!.body));
      return new Response(JSON.stringify(okBody), { status: 200 });
    });
    await createGeminiProvider(f as unknown as typeof fetch).generate(KEY, 'm', { ...req, images: [{ label: 'PRODUCT', mimeType: 'image/jpeg', data: 'QUJD' }] });
    const parts = body.contents[0].parts;
    expect(parts[0]).toEqual({ text: 'PRODUCT' });
    expect(parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } });
    expect(parts[2]).toEqual({ text: 'u' });
  });

  it('hanya gambar lokal, produk & karakter bergiliran, maks 6, bisa dimatikan', () => {
    const b = makeBrief();
    b.product.referenceImages = [img('p1'), img('p2'), img('p3'), img('p4'), { id: 'u', kind: 'url', url: 'https://x.test/a.jpg' }];
    b.characters.list[0].referenceImages = [img('c1'), img('c2'), img('c3')];
    const c = referenceCandidates(b);
    expect(c).toHaveLength(MAX_AI_IMAGES);
    expect(c.map((x) => x.img.localId)).toEqual(['p1', 'c1', 'p2', 'c2', 'p3', 'c3']);
    expect(c[1].label).toContain('CHARACTER char_1');
    expect(referenceCandidates({ ...b, output: { ...b.output, sendReferenceImages: false } })).toEqual([]);
    expect(referenceCandidates({ ...b, characters: { ...b.characters, mode: 'no_people' } }).every((x) => x.label.includes('PRODUCT'))).toBe(true);
  });

  it('loader gagal dilewati; Panggilan 2 menerima gambar dan instruksi', async () => {
    const b = makeBrief();
    b.product.referenceImages = [img('ok'), img('bad')];
    const imgs = await loadReferenceImages(b, async (id) => (id === 'ok' ? { mimeType: 'image/png', data: 'AA==' } : null));
    expect(imgs).toHaveLength(1);
    const concept = { id: 'c', title: 't', angle: 'pov' as const, coreMessage: '', emotion: '', visualIdentity: '', storytelling: '', openingHook: '', closingCta: '', recommendedSceneCount: 4, rationale: '' };
    expect(buildScriptStoryboardCall(b, concept, null, 1).userPrompt).toContain('reference image(s) are attached');
    expect(buildScriptStoryboardCall(b, concept, null, 0).userPrompt).not.toContain('reference image(s) are attached');

    const run = vi.fn(async (r: { images?: unknown[] }) => {
      expect(r.images).toHaveLength(1);
      throw new Error('stop');
    });
    const svc = createAiService({ provider: {} as never, keys: {} as never, router: { run } as unknown as AIRouter, imageLoader: async () => ({ mimeType: 'image/png', data: 'AA==' }) });
    const b2 = makeBrief();
    b2.product.referenceImages = [img('x')];
    await svc.generateScriptStoryboard(b2, concept, null);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('Prompt frame (Gambar ke video / Frame awal-akhir)', () => {
  it('framePromptsFor mengikuti mode', () => {
    expect(framePromptsFor(makeBrief(), 'a', 'b')).toBeUndefined();
    expect(framePromptsFor(makeBrief({ output: { flowMode: 'image_to_video' } }), 'a', 'b')).toEqual({ start: 'a' });
    expect(framePromptsFor(makeBrief({ output: { flowMode: 'frames' } }), 'a', 'b')).toEqual({ start: 'a', end: 'b' });
  });
  it('instruksi panggilan 3 meminta startFrame/endFrame hanya di mode gambar', () => {
    const scenes = [makeScene()];
    const t2v = buildScenePromptBatches(makeBrief(), scenes, scenes, makeBibles())[0].call.userPrompt;
    const frames = buildScenePromptBatches(makeBrief({ output: { flowMode: 'frames' } }), scenes, scenes, makeBibles())[0].call.userPrompt;
    expect(t2v).toContain('omit startFrame and endFrame');
    expect(frames).toContain('startFrame:');
    expect(frames).toContain('endFrame:');
    expect(frames).toContain('focuses on MOTION');
  });
  it('salin dan ekspor TXT memuat frame', () => {
    const s = makeScene({ framePrompts: { start: 'START IMG', end: 'END IMG' } });
    expect(frameCopyText(s, 'start')).toMatch(/^START IMG\n\nAvoid: text/);
    expect(frameCopyText(makeScene(), 'start')).toBe('');
    const t = scenePromptTxt(s, 0);
    expect(t).toContain('[FRAME AWAL]\nSTART IMG');
    expect(t).toContain('[FRAME AKHIR]\nEND IMG');
  });
});

describe('Perbaikan otomatis linter', () => {
  const ctx = (scenes: Scene[] = []): LintContext => ({ brief: makeBrief(), bibles: makeBibles(), scenes, variant: 'standard' });
  const ruleIds = (s: Scene) => lintScene(s, ctx([s])).map((i) => i.ruleId);

  it('L04, L02, L03, L07, L10 diperbaiki sehingga linter bersih', () => {
    const broken = makeScene({
      flowPrompts: { standard: 'A woman taps a phone in a busy warung, gentle push-in, soft window light, cheerful mood. Show a title card with the brand name.' },
      negativePrompt: '',
    });
    const before = ruleIds(broken);
    for (const r of ['L02', 'L03', 'L04', 'L07', 'L10']) expect(before).toContain(r);
    const fixed = applyLintFixes(broken, ctx([broken]), ['L02', 'L03', 'L04', 'L07', 'L10']);
    const after = ruleIds(fixed);
    for (const r of ['L02', 'L03', 'L04', 'L07', 'L10']) expect(after).not.toContain(r);
    expect(fixed.flowPrompts.standard).not.toMatch(/title card/);
    expect(fixed.flowPrompts.standard.trim().endsWith('Aspect ratio 9:16.')).toBe(true);
    expect(fixed.negativePrompt).toContain('watermark');
  });

  it('prompt yang sudah baik tidak diubah', () => {
    const s = makeScene();
    expect(applyLintFixes(s, ctx([s]), ['L02', 'L03', 'L04']).flowPrompts.standard).toBe(GOOD_PROMPT);
  });

  it('aturan yang mengubah durasi/naskah tidak bisa diperbaiki otomatis', () => {
    expect(['L01', 'L08', 'L09', 'L11'].some(isFixable)).toBe(false);
    expect(isFixable('L04')).toBe(true);
  });
});

describe('Estimasi biaya', () => {
  const svc = createAiService({ provider: {} as never, keys: {} as never, router: {} as AIRouter });
  it('konsep 1 panggilan; prompt mengikuti jumlah batch', () => {
    const c = svc.estimate('concepts', { brief: makeBrief() });
    expect(c.calls).toBe(1);
    expect(c.inputTokens).toBeGreaterThan(200);
    const scenes = Array.from({ length: 8 }, (_, i) => makeScene({ id: `s${i}`, order: i }));
    const p = svc.estimate('prompts', { brief: makeBrief(), scenes, bibles: makeBibles() });
    expect(p.calls).toBe(2);
    expect(svc.estimate('prompts', { brief: makeBrief(), scenes: scenes.map((s) => ({ ...s, approved: true })), bibles: makeBibles() }).calls).toBe(0);
  });
  it('gambar referensi menambah token', () => {
    const b = makeBrief();
    b.product.referenceImages = [{ id: 'a', kind: 'local', localId: 'a' }];
    const concept = { id: 'c', title: 't', angle: 'pov' as const, coreMessage: '', emotion: '', visualIdentity: '', storytelling: '', openingHook: '', closingCta: '', recommendedSceneCount: 4, rationale: '' };
    const withImg = svc.estimate('script', { brief: b, concept });
    expect(withImg.images).toBe(1);
    expect(withImg.inputTokens).toBeGreaterThan(svc.estimate('script', { brief: makeBrief(), concept }).inputTokens);
  });
});
