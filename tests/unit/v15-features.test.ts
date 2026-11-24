import { describe, expect, it, vi } from 'vitest';
import { createAiService } from '@/ai/aiService';
import type { AIRouter } from '@/ai/router/aiRouter';
import { buildClipEditCall } from '@/ai/director/promptFixCall';
import { CONTINUOUS_SHOT, promptFormatRules } from '@/ai/director/sceneContext';
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
