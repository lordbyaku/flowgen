import { LINT_MAX_WORDS, LINT_MIN_WORDS, MAX_DIALOGUE_WORDS, MAX_SCENE_SEC } from '@/config/constants';
import { countWords } from '@/lib/utils';
import type { LintRule } from '../types';

export const L01: LintRule = {
  id: 'L01',
  severity: 'error',
  title: 'Durasi scene melebihi batas',
  check: (scene) =>
    scene.durationSec > MAX_SCENE_SEC
      ? [`Durasi ${scene.durationSec} detik melebihi batas ${MAX_SCENE_SEC} detik per klip Flow.`]
      : [],
};

export const L04: LintRule = {
  id: 'L04',
  severity: 'warn',
  title: 'Aspect ratio tidak disebut',
  check: (_scene, ctx, prompt) =>
    prompt.trim() && !prompt.includes(ctx.brief.project.aspectRatio)
      ? [`Aspect ratio ${ctx.brief.project.aspectRatio} belum disebut di prompt.`]
      : [],
};

export const L06: LintRule = {
  id: 'L06',
  severity: 'warn',
  title: 'Panjang prompt',
  check: (_scene, _ctx, prompt) => {
    const n = countWords(prompt);
    if (n < LINT_MIN_WORDS) return [`Prompt terlalu pendek (${n} kata, minimal ${LINT_MIN_WORDS}).`];
    if (n > LINT_MAX_WORDS) return [`Prompt terlalu panjang (${n} kata, maksimal ${LINT_MAX_WORDS}).`];
    return [];
  },
};

export const L10: LintRule = {
  id: 'L10',
  severity: 'info',
  title: 'Negative prompt kosong',
  check: (scene) => (scene.negativePrompt.trim() === '' ? ['Negative prompt kosong; baris Avoid tidak akan disalin.'] : []),
};

export const L11: LintRule = {
  id: 'L11',
  severity: 'warn',
  title: 'Dialog terlalu panjang',
  check: (scene) => {
    const n = countWords(scene.dialogue);
    return n > MAX_DIALOGUE_WORDS ? [`Dialog ${n} kata; disarankan maksimal ${MAX_DIALOGUE_WORDS} kata per scene.`] : [];
  },
};

export const L13: LintRule = {
  id: 'L13',
  severity: 'warn',
  title: 'Prompt identik',
  check: (scene, ctx, prompt) => {
    const p = prompt.trim();
    if (!p) return [];
    const dupes = ctx.scenes.filter((s) => s.id !== scene.id && (s.flowPrompts[ctx.variant] ?? '').trim() === p);
    return dupes.length > 0
      ? [`Prompt identik dengan scene ${dupes.map((d) => d.order + 1).join(', ')}.`]
      : [];
  },
};
