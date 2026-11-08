import { describe, expect, it } from 'vitest';
import { LINT_RULES, lintAll, lintScene, worstSeverity } from '@/domain/linter';
import type { LintContext } from '@/domain/linter';
import type { Scene } from '@/types';
import { GOOD_PROMPT, makeBibles, makeBrief, makeScene } from './helpers';

const ctx = (scenes: Scene[] = [], patch: Partial<LintContext> = {}): LintContext => ({
  brief: makeBrief({ product: { forbiddenClaims: ['dijamin omzet naik'] } }),
  bibles: makeBibles(),
  scenes,
  variant: 'standard',
  ...patch,
});

const ids = (scene: Scene, c = ctx([scene])) => lintScene(scene, c).map((i) => i.ruleId);

describe('Prompt Linter (L01–L13)', () => {
  it('scene baik lolos semua aturan', () => {
    const s = makeScene();
    expect(lintScene(s, ctx([s]))).toEqual([]);
  });

  it('L01 durasi > 8 detik', () => {
    expect(ids(makeScene({ durationSec: 8 }))).not.toContain('L01');
    expect(ids(makeScene({ durationSec: 9 }))).toContain('L01');
  });

  it('L02 deskripsi karakter kurang lengkap', () => {
    expect(ids(makeScene())).not.toContain('L02');
    const thin = makeScene({ flowPrompts: { standard: GOOD_PROMPT.replace(/^.*?smile\./, 'A woman.') } });
    expect(ids(thin)).toContain('L02');
  });

  it('L03 detail produk hilang padahal wajib tampil', () => {
    expect(ids(makeScene())).not.toContain('L03');
    const noProd = makeScene({ flowPrompts: { standard: GOOD_PROMPT.replace(/Product: .*? Continuity/, 'Continuity').replace('green and white app interface', '') } });
    expect(ids(noProd)).toContain('L03');
    const c = ctx([noProd], { brief: makeBrief({ product: { mustBeVisible: false } }) });
    expect(ids(noProd, c)).not.toContain('L03');
  });

  it('L04 aspect ratio tidak disebut', () => {
    expect(ids(makeScene())).not.toContain('L04');
    expect(ids(makeScene({ flowPrompts: { standard: GOOD_PROMPT.replace('Aspect ratio 9:16.', '') } }))).toContain('L04');
  });

  it('L05 instruksi kontradiktif', () => {
    expect(ids(makeScene())).not.toContain('L05');
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} Handheld camera on a locked-off tripod.` } }))).toContain('L05');
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} Bright daytime scene at night.` } }))).toContain('L05');
    // indoor + outdoor diperbolehkan jika "through the window"
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} Indoors, the outdoor street is visible through the window.` } }))).not.toContain('L05');
  });

  it('L06 panjang prompt', () => {
    expect(ids(makeScene())).not.toContain('L06');
    expect(ids(makeScene({ flowPrompts: { standard: 'Short prompt. Aspect ratio 9:16.' } }))).toContain('L06');
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} ${'word '.repeat(200)}` } }))).toContain('L06');
  });

  it('L07 meminta teks di layar tanpa negasi', () => {
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} No on-screen text or captions.` } }))).not.toContain('L07');
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} Show a title card with the brand name.` } }))).toContain('L07');
  });

  it('L08 klaim terlarang di VO/dialog/prompt', () => {
    expect(ids(makeScene())).not.toContain('L08');
    expect(ids(makeScene({ voiceOver: 'Dijamin omzet naik dua kali!' }))).toContain('L08');
  });

  it('L09 VO melebihi anggaran kata', () => {
    expect(ids(makeScene())).not.toContain('L09');
    expect(ids(makeScene({ durationSec: 2, voiceOver: 'satu dua tiga empat lima enam tujuh delapan' }))).toContain('L09');
  });

  it('L10 negative prompt kosong (info)', () => {
    expect(ids(makeScene())).not.toContain('L10');
    const r = lintScene(makeScene({ negativePrompt: '' }), ctx());
    expect(r.find((i) => i.ruleId === 'L10')?.severity).toBe('info');
  });

  it('L11 dialog > 18 kata', () => {
    expect(ids(makeScene({ dialogue: 'Halo, ini kasir baru saya.' }))).not.toContain('L11');
    expect(ids(makeScene({ dialogue: 'kata '.repeat(19) }))).toContain('L11');
  });

  it('L12 terlalu banyak kata Indonesia di luar kutipan', () => {
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} The character says in Indonesian: "yang dan di ke dari untuk dengan ini itu".` } }))).not.toContain('L12');
    expect(ids(makeScene({ flowPrompts: { standard: `${GOOD_PROMPT} ${'yang dan di ke dari untuk dengan ini itu adalah '.repeat(4)}` } }))).toContain('L12');
  });

  it('L13 prompt identik antar scene', () => {
    const a = makeScene({ id: 'a' });
    const b = makeScene({ id: 'b', order: 1 });
    expect(ids(a, ctx([a, makeScene({ id: 'c', flowPrompts: { standard: `${GOOD_PROMPT} Different.` } })]))).not.toContain('L13');
    expect(ids(a, ctx([a, b]))).toContain('L13');
  });

  it('aturan dapat dimatikan per project dan severity terburuk dihitung', () => {
    const s = makeScene({ durationSec: 9 });
    expect(lintScene(s, ctx([s]), ['L01']).map((i) => i.ruleId)).not.toContain('L01');
    expect(worstSeverity(lintScene(s, ctx([s])))).toBe('error');
    expect(LINT_RULES).toHaveLength(13);
    expect(Object.keys(lintAll({ brief: makeBrief(), bibles: makeBibles(), scenes: [s] }))).toEqual(['s1']);
  });
});
