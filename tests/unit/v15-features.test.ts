import { describe, expect, it } from 'vitest';
import { CONTINUOUS_SHOT, promptFormatRules } from '@/ai/director/sceneContext';
import { avoidLineOn, copyText, frameCopyText } from '@/domain/promptText';
import { buildShootQueue } from '@/domain/shootQueue';
import { makeBrief, makeScene } from './helpers';

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
