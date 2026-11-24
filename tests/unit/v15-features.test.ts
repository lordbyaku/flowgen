import { describe, expect, it, vi } from 'vitest';
import { createAiService } from '@/ai/aiService';
import type { AIRouter } from '@/ai/router/aiRouter';
import { buildClipEditCall } from '@/ai/director/promptFixCall';
import { CONTINUOUS_SHOT, promptFormatRules } from '@/ai/director/sceneContext';
import { applyPromptItems, buildScenePromptBatches } from '@/ai/director/scenePromptCall';
import { scenePromptTxt } from '@/domain/exporters/txt';
import { clipCredits, estimateFlowCredits } from '@/domain/flowCredits';
import { avoidLineOn, copyText, frameCopyText } from '@/domain/promptText';
import { buildShootQueue } from '@/domain/shootQueue';
import { makeBibles, makeBrief, makeScene } from './helpers';

describe('v1.5 — baris Audio dan satu shot (Gemini Omni)', () => {
  it('aturan format memuat Audio, tanpa musik, dan satu shot', () => {
    const rules = promptFormatRules(makeBrief(), ['standard']);
    expect(rules).toContain('"Audio:"');
    expect(rules).toContain('No background music.');
    expect(rules).toContain(CONTINUOUS_SHOT);
  });

  it('dialog mati → prompt meminta tanpa dialog/narasi', () => {
    const off = promptFormatRules(makeBrief({ audio: { characterDialogue: false } }), ['standard']);
    expect(off).toContain('No dialogue, no narration.');
    const on = promptFormatRules(makeBrief({ audio: { characterDialogue: true } }), ['standard']);
    expect(on).not.toContain('No dialogue, no narration.');
  });
});

describe('v1.5 — baris Avoid opsional', () => {
  it('default ikut, bisa dimatikan per brief', () => {
    const s = makeScene({ negativePrompt: 'blurry' });
    expect(avoidLineOn(makeBrief())).toBe(true);
    expect(copyText(s)).toContain('Avoid: blurry');
    expect(copyText(s, 'standard', false)).not.toContain('Avoid:');
    expect(frameCopyText({ framePrompts: { start: 'A still' } }, 'start', false)).toBe('A still');
    const off = makeBrief({ output: { avoidLine: false } });
    expect(avoidLineOn(off)).toBe(false);
    const q = buildShootQueue(off, { scenes: [s], assets: null, hooks: null });
    expect(q.flatMap((i) => i.copies.map((c) => c.text)).join('\n')).not.toContain('Avoid:');
  });
});

describe('v1.5 — instruksi edit klip Omni', () => {
  const scene = makeScene({ id: 's1', voiceOver: 'VO tetap' });
  const base = { scenes: [scene], sceneId: 's1', bibles: makeBibles(), variant: 'standard' as const, issues: ['outfit_changed' as const], note: 'celemek hilang' };

  it('panggilan memuat prompt yang dirender, masalah, dan aturan "Keep"', () => {
    const c = buildClipEditCall(makeBrief(), base);
    expect(c.task).toBe('prompt_fix');
    expect(c.userPrompt).toContain('<rendered_prompt');
    expect(c.userPrompt).toContain('outfit_changed');
    expect(c.userPrompt).toContain('Edit this video keeping everything else the same.');
    expect(c.userPrompt).toContain('celemek hilang');
  });

  it('aiService mode edit: prompt tidak berubah, instruksi tersimpan di lastFix', async () => {
    const out = { instruction: ' Edit this video keeping everything else the same. Add the green apron. ', changes: ['Celemek dikembalikan'] };
    const run = vi.fn(async () => ({ text: JSON.stringify(out), model: 'm', httpStatus: 200, latencyMs: 1, keyId: 'k', keyLabel: 'K' }));
    const svc = createAiService({ provider: {} as never, keys: {} as never, router: { run } as unknown as AIRouter, now: () => 9 });
    const r = await svc.fixScenePrompt(makeBrief(), { ...base, mode: 'edit' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.flowPrompts).toEqual(scene.flowPrompts);
    expect(r.value.versions).toEqual(scene.versions);
    expect(r.value.lastFix).toMatchObject({ mode: 'edit', editInstruction: 'Edit this video keeping everything else the same. Add the green apron.', at: 9 });
  });
});

describe('v1.5 — prompt Omni Extend', () => {
  it('Panggilan 3 meminta extendPrompt dengan aturannya', () => {
    const s = [makeScene({ id: 'a', order: 0 }), makeScene({ id: 'b', order: 1 })];
    const [batch] = buildScenePromptBatches(makeBrief(), s, s, makeBibles());
    expect(batch.call.userPrompt).toContain('extendPrompt (only when it applies)');
    expect(batch.call.userPrompt).toContain('EXTEND PROMPT');
  });

  it('hanya disimpan untuk scene selain scene pertama, dan ikut ke Mode Produksi + TXT', () => {
    const s = [makeScene({ id: 'a', order: 0 }), makeScene({ id: 'b', order: 1 })];
    const item = (id: string) => ({ sceneId: id, standard: 'P', negativePrompt: '', extendPrompt: ' She keeps walking. ' });
    const out = applyPromptItems(s, [item('a'), item('b')], makeBrief(), 1);
    expect(out[0].extendPrompt).toBeUndefined();
    expect(out[1].extendPrompt).toBe('She keeps walking.');
    const q = buildShootQueue(makeBrief(), { scenes: out, assets: null, hooks: null });
    expect(q[1].copies.map((c) => c.label)).toContain('Prompt Extend dari scene 1 (opsional)');
    expect(scenePromptTxt(out[1], 1)).toContain('[EXTEND DARI SCENE 1 (opsional)]');
  });
});

describe('v1.5 — perkiraan kredit Flow', () => {
  it('360p 1/dtk, 720p 3/dtk; detik di atas 10 dua kali lipat', () => {
    expect(clipCredits(10, 1)).toBe(10);
    expect(clipCredits(15, 1)).toBe(20);
    expect(clipCredits(15, 3)).toBe(60);
    expect(estimateFlowCredits([10, 8, 6])).toEqual({ clips: 3, seconds: 24, draft: 24, hd: 72 });
    expect(estimateFlowCredits([])).toEqual({ clips: 0, seconds: 0, draft: 0, hd: 0 });
  });
});
