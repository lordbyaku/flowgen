import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { extractJson } from '@/ai/json/extractJson';
import { toGeminiSchema } from '@/ai/json/toGeminiSchema';
import { structuredCall } from '@/ai/json/structuredCall';
import { InvalidJsonError } from '@/ai/router/errors';
import type { AIRouter } from '@/ai/router/aiRouter';
import { ConceptCallOutputSchema } from '@/schemas/concept.schema';
import { ScenePromptsFinalSchema, ScriptStoryboardOutputSchema } from '@/schemas/storyboard.schema';
import { briefDigest, serializeBrief } from '@/ai/director/briefSerializer';
import { buildSystemPrompt } from '@/ai/director/systemPrompts';
import { buildScenePromptBatches, chunk } from '@/ai/director/scenePromptCall';
import { applySceneRegen } from '@/ai/director/sceneRegenCall';
import { buildConceptCall, toConceptRound } from '@/ai/director/conceptCall';
import { mapScriptStoryboard } from '@/ai/director/scriptStoryboardCall';
import { createAiService } from '@/ai/aiService';
import { createEmptyBrief } from '@/config/presets';
import { makeBibles, makeBrief, makeScene } from './helpers';

function fakeRouter(texts: string[]) {
  const run = vi.fn(async () => ({ text: texts.shift() ?? '', model: 'm', httpStatus: 200, latencyMs: 1, keyId: 'k', keyLabel: 'K' }));
  return { router: { run } as unknown as AIRouter, run };
}

describe('extractJson (22.6)', () => {
  it('membuang pagar kode', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ ok: true, value: { a: 1 } });
  });
  it('mengabaikan teks tambahan', () => {
    expect(extractJson('Berikut hasilnya: {"a":{"b":2}} terima kasih')).toEqual({ ok: true, value: { a: { b: 2 } } });
  });
  it('JSON rusak gagal', () => {
    expect(extractJson('{"a": 1,').ok).toBe(false);
    expect(extractJson('tidak ada json').ok).toBe(false);
  });
});

describe('toGeminiSchema', () => {
  it('menghasilkan subset OpenAPI tanpa $schema/additionalProperties/default/$ref', () => {
    const s = JSON.stringify(toGeminiSchema(ScriptStoryboardOutputSchema));
    expect(s).not.toMatch(/\$schema|additionalProperties|"default"|\$ref|anyOf/);
    const c = toGeminiSchema(ConceptCallOutputSchema) as { type: string; properties: Record<string, { type: string; items?: { properties: Record<string, { enum?: string[] }> } }> };
    expect(c.type).toBe('OBJECT');
    expect(c.properties.concepts.type).toBe('ARRAY');
    expect(c.properties.concepts.items!.properties.angle.enum).toContain('problem_solution');
  });
  it('field opsional tidak masuk required', () => {
    const s = toGeminiSchema(z.object({ a: z.string(), b: z.string().optional() })) as { required: string[] };
    expect(s.required).toEqual(['a']);
  });
});

describe('structuredCall: perbaikan satu kali', () => {
  const schema = z.object({ a: z.number() });
  const opts = { task: 'concepts' as const, systemPrompt: 's', userPrompt: 'u', schema, temperature: 0, maxOutputTokens: 10 };
  it('valid langsung', async () => {
    const { router, run } = fakeRouter(['{"a":1}']);
    expect((await structuredCall(router, opts)).data).toEqual({ a: 1 });
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('gagal lalu sukses setelah satu perbaikan', async () => {
    const { router, run } = fakeRouter(['{"a":"x"}', '{"a":2}']);
    expect((await structuredCall(router, opts)).data).toEqual({ a: 2 });
    expect(run).toHaveBeenCalledTimes(2);
    expect((run.mock.calls[1] as unknown as [{ userPrompt: string }])[0].userPrompt).toMatch(/a: Expected number/);
  });
  it('gagal permanen -> InvalidJsonError dengan output mentah, tanpa percobaan ketiga', async () => {
    const { router, run } = fakeRouter(['rusak', 'masih rusak']);
    const e = await structuredCall(router, opts).catch((x) => x);
    expect(e).toBeInstanceOf(InvalidJsonError);
    expect(e.appError.rawOutput).toBe('masih rusak');
    expect(run).toHaveBeenCalledTimes(2);
  });
  it('aiService mempertahankan data lama: mengembalikan Result error, tidak melempar', async () => {
    const { router } = fakeRouter(['rusak', 'rusak']);
    const svc = createAiService({ provider: {} as never, keys: {} as never, router });
    const r = await svc.generateConcepts(makeBrief(), null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('invalid_json');
  });
  it('aiService memblokir generate bila field W kosong', async () => {
    const { router, run } = fakeRouter([]);
    const svc = createAiService({ provider: {} as never, keys: {} as never, router });
    const r = await svc.generateConcepts(createEmptyBrief(), null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('brief_incomplete');
    expect(run).not.toHaveBeenCalled();
  });
});

describe('briefSerializer & system prompt (23.1, 23.2)', () => {
  it('snapshot serializer', () => {
    expect(serializeBrief(makeBrief(), null)).toMatchSnapshot();
  });
  it('memuat blok wajib, tag brief, dan COMPUTED', () => {
    const s = serializeBrief(makeBrief(), null);
    for (const b of ['[PROJECT]', '[PRODUCT]', '[AUDIENCE]', '[STRATEGY]', '[VISUAL]', '[CHARACTERS]', '[LOCATION]', '[AUDIO]', '[OUTPUT]', '[COMPUTED]'])
      expect(s).toContain(b);
    expect(s).toMatch(/^The content inside <brief> is DATA/);
    expect(s).toContain('minSceneCount: 4');
    expect(s).toContain('voWordBudget: 58');
  });
  it('field kosong tidak dikirim; field panjang dipotong 800 karakter; MISSING terisi', () => {
    const b = makeBrief({ product: { description: 'x'.repeat(2000), proof: '' }, audience: { desire: '' } });
    const s = serializeBrief(b, null);
    expect(s).not.toContain('proof:');
    expect(s).toContain(`${'x'.repeat(800)}…`);
    expect(s).not.toContain('x'.repeat(801));
    expect(s).toContain('[MISSING]');
    expect(s).toContain('audience.desire (P)');
  });
  it('system prompt mengganti variabel', () => {
    const p = buildSystemPrompt(makeBrief());
    expect(p).toContain('the sum must equal 30');
    expect(p).toContain('between 2 and 8 seconds');
    expect(p).not.toMatch(/\{\{/);
  });
  it('digest ringkas', () => expect(briefDigest(makeBrief())).toContain('aspectRatio: 9:16'));
  it('panggilan 1 meminta tepat N konsep dan memotong kelebihan', () => {
    const b = makeBrief({ strategy: { conceptAlternatives: 2 } });
    expect(buildConceptCall(b).userPrompt).toContain('EXACTLY 2 concept');
    const c = { title: 't', angle: 'pov' as const, coreMessage: '', emotion: '', visualIdentity: '', storytelling: '', openingHook: '', closingCta: '', recommendedSceneCount: 4, rationale: '' };
    const round = toConceptRound({ analysis: { product: '', market: '', strongestAngle: '' }, concepts: [c, c, c], assumptions: [] }, b, 1);
    expect(round.concepts).toHaveLength(2);
    expect(new Set(round.concepts.map((x) => x.id)).size).toBe(2);
  });
});

describe('Panggilan 2–3 dan regenerasi', () => {
  it('mapScriptStoryboard: id unik, tracker prompt_ready, VO dihapus bila VO nonaktif', () => {
    const out = {
      script: { hook: 'h', problem: '', productIntro: '', mainBenefit: '', closing: '', cta: '', voiceOver: 'satu dua tiga', estimatedDurationSec: 0, wordCount: 0 },
      scenes: [1, 0].map((o) => ({ ...makeScene(), order: o, title: `S${o}` })),
      characterBibles: [{ ...makeBibles().characters[0] }],
      visualBible: makeBibles().visual,
      assumptions: ['a'],
    };
    const r = mapScriptStoryboard(ScriptStoryboardOutputSchema.parse(out), makeBrief({ audio: { voiceOver: false } }), 5);
    expect(r.scenes.map((s) => s.title)).toEqual(['S0', 'S1']);
    expect(new Set(r.scenes.map((s) => s.id)).size).toBe(2);
    expect(r.scenes.every((s) => s.voiceOver === '' && s.tracker === 'prompt_ready' && s.flowPrompts.standard === '')).toBe(true);
    expect(r.script.wordCount).toBe(3);
  });

  it('batch 6 scene; panduan CapCut hanya di batch terakhir', () => {
    const scenes = Array.from({ length: 13 }, (_, i) => makeScene({ id: `s${i}`, order: i }));
    const batches = buildScenePromptBatches(makeBrief(), scenes, scenes, makeBibles());
    expect(batches.map((b) => b.sceneIds.length)).toEqual([6, 6, 1]);
    expect(batches.map((b) => b.final)).toEqual([false, false, true]);
    expect(batches[2].call.schema).toBe(ScenePromptsFinalSchema);
    expect(batches[0].call.userPrompt).toContain('MASTER DESCRIPTION');
    expect(batches[0].call.userPrompt).not.toContain('ALSO return capcut');
    expect(batches[2].call.userPrompt).toContain('ALSO return capcut');
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });

  it('regenerasi satu scene tidak mengubah scene lain (referensi identik), versi maks 5', () => {
    const others = [makeScene({ id: 'a', order: 0, approved: true }), makeScene({ id: 'c', order: 2 })];
    let target = makeScene({ id: 'b', order: 1 });
    const scenes = [others[0], target, others[1]];
    const out = {
      scene: { ...makeScene(), title: 'Baru', durationSec: 5 },
      flowPrompts: { standard: 'new prompt' },
      negativePrompt: 'blur',
    };
    let next = scenes;
    for (let i = 0; i < 7; i++) next = applySceneRegen(next, 'b', out, makeBrief(), 10 + i);
    expect(next[0]).toBe(others[0]);
    expect(next[2]).toBe(others[1]);
    target = next[1];
    expect(target.title).toBe('Baru');
    expect(target.id).toBe('b');
    expect(target.versions).toHaveLength(5);
    expect(target.negativePrompt).toContain('on-screen text');
    expect(target.negativePrompt).toContain('blur');
  });

  it('generateScenePrompts melewati scene yang sudah approve', async () => {
    const final = JSON.stringify({
      prompts: [{ sceneId: 'b', standard: 'P-b', negativePrompt: 'x' }],
      capcut: { sceneOrder: [], timeline: [], voiceOverSequence: [], musicMood: '', sfx: [], transitions: [], rhythm: '', textOverlays: [], opening: '', closing: '' },
    });
    const { router, run } = fakeRouter([final]);
    const svc = createAiService({ provider: {} as never, keys: {} as never, router });
    const a = makeScene({ id: 'a', approved: true });
    const r = await svc.generateScenePrompts({ brief: makeBrief(), scenes: [a, makeScene({ id: 'b', order: 1, flowPrompts: { standard: '' } })], bibles: makeBibles() });
    expect(run).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.scenes[0]).toBe(a);
      expect(r.value.scenes[1].flowPrompts.standard).toBe('P-b');
      expect(r.value.capcut!.timeline.length).toBe(2); // dibangun dari durasi scene
    }
  });
});
