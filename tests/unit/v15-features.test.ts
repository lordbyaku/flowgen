import { describe, expect, it } from 'vitest';
import { CONTINUOUS_SHOT, promptFormatRules } from '@/ai/director/sceneContext';
import { makeBrief } from './helpers';

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
