import { countWords } from '@/lib/utils';
import { sceneWordBudget } from '@/domain/wordBudget';
import type { LintRule } from '../types';
import { escapeRegExp, ID_STOPWORDS, stripQuoted, wordTokens } from '../text';

const CONTRADICTIONS: { a: RegExp; b: RegExp; label: string; unless?: RegExp }[] = [
  { a: /\bhand-?held\b/i, b: /\blocked[- ]off\b|\btripod\b|\bstatic camera\b/i, label: 'handheld dan locked-off/tripod' },
  { a: /\bdaytime\b|\bday ?light\b|\bmidday\b|\bnoon\b/i, b: /\bnight(time)?\b|\bmidnight\b/i, label: 'siang dan malam' },
  { a: /\bslow[- ]motion\b/i, b: /\bfast[- ]paced\b/i, label: 'slow motion dan fast-paced' },
  {
    a: /\bindoors?\b|\binterior\b/i,
    b: /\boutdoors?\b|\bexterior\b/i,
    label: 'indoor dan outdoor',
    unless: /through the window/i,
  },
];

export const L05: LintRule = {
  id: 'L05',
  severity: 'warn',
  title: 'Instruksi kontradiktif',
  check: (_scene, _ctx, prompt) => {
    // Bagian negatif ("no ...", "avoid ...") di dalam prompt tidak dihitung.
    const positive = prompt.replace(/\b(no|without|avoid|never)\s+[\w-]+(\s+[\w-]+)?/gi, ' ');
    return CONTRADICTIONS.filter((c) => c.a.test(positive) && c.b.test(positive) && !(c.unless && c.unless.test(prompt))).map(
      (c) => `Arahan kontradiktif: ${c.label} muncul bersamaan.`,
    );
  },
};

const TEXT_REQUEST = /\b(on[- ]screen text|text overlay|captions?|subtitles?|title card|lower third|typography)\b/gi;
const NEGATION = /\b(no|without|avoid|never|free of|not include|don't|do not)\b[^.]{0,40}$/i;

export const L07: LintRule = {
  id: 'L07',
  severity: 'warn',
  title: 'Meminta teks di dalam video',
  check: (_scene, _ctx, prompt) => {
    const hits: string[] = [];
    for (const m of prompt.matchAll(TEXT_REQUEST)) {
      const before = prompt.slice(Math.max(0, (m.index ?? 0) - 60), m.index);
      if (!NEGATION.test(before)) hits.push(m[0]);
    }
    return hits.length > 0
      ? [`Prompt meminta teks di layar (${[...new Set(hits)].join(', ')}). Teks dibuat di CapCut.`]
      : [];
  },
};

export const L08: LintRule = {
  id: 'L08',
  severity: 'error',
  title: 'Klaim terlarang',
  check: (scene, ctx, prompt) => {
    const haystack = [scene.voiceOver, scene.dialogue, prompt].join('\n');
    return ctx.brief.product.forbiddenClaims
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && new RegExp(escapeRegExp(c), 'i').test(haystack))
      .map((c) => `Klaim terlarang muncul: "${c}".`);
  },
};

export const L09: LintRule = {
  id: 'L09',
  severity: 'warn',
  title: 'VO melebihi anggaran kata',
  check: (scene, ctx) => {
    const budget = sceneWordBudget(scene.durationSec, ctx.brief.project.scriptLanguage);
    const n = countWords(scene.voiceOver);
    return n > budget ? [`VO ${n} kata melebihi anggaran ${budget} kata untuk ${scene.durationSec} detik.`] : [];
  },
};

export const L12: LintRule = {
  id: 'L12',
  severity: 'warn',
  title: 'Prompt bercampur bahasa Indonesia',
  check: (_scene, _ctx, prompt) => {
    const tokens = wordTokens(stripQuoted(prompt));
    if (tokens.length < 10) return [];
    const idCount = tokens.filter((t) => ID_STOPWORDS.has(t)).length;
    const ratio = idCount / tokens.length;
    return ratio > 0.15
      ? [`${Math.round(ratio * 100)}% kata di luar dialog berbahasa Indonesia; prompt Flow sebaiknya Inggris.`]
      : [];
  },
};
