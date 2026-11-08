import { buildNegative } from '@/domain/promptText';
import type { Scene, Variant } from '@/types';
import type { LintContext } from './types';
import { coverage, keywords, uniqueWords } from './text';

/**
 * Perbaikan otomatis deterministik (tanpa AI) untuk aturan yang aman diperbaiki.
 * L01, L08, L09, L11 sengaja tidak diperbaiki otomatis karena mengubah durasi atau isi naskah.
 */
export const FIXABLE_RULES = ['L02', 'L03', 'L04', 'L07', 'L10'] as const;
export type FixableRule = (typeof FIXABLE_RULES)[number];

export const FIX_LABEL: Record<FixableRule, string> = {
  L02: 'Sisipkan deskripsi karakter lengkap',
  L03: 'Sisipkan detail produk',
  L04: 'Tambahkan aspect ratio',
  L07: 'Hapus permintaan teks di layar',
  L10: 'Isi negative prompt dasar',
};

export const isFixable = (ruleId: string): ruleId is FixableRule => (FIXABLE_RULES as readonly string[]).includes(ruleId);

const TEXT_REQUEST = /\b(on[- ]screen text|text overlay|captions?|subtitles?|title card|lower third|typography)\b/i;
const NEGATION = /\b(no|without|avoid|never|free of|not include|don't|do not)\b/i;

const sentences = (p: string) => p.match(/[^.!?]+[.!?]*\s*/g) ?? [p];

function ensureEnd(p: string): string {
  const t = p.trim();
  return t === '' || /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Sisipkan kalimat sebelum "Continuity:"/"Aspect ratio" bila ada, selain itu di akhir. */
function insertBeforeTail(prompt: string, text: string): string {
  const m = /\s(Continuity:|Aspect ratio)/i.exec(prompt);
  if (!m) return `${ensureEnd(prompt)} ${text}`.trim();
  return `${ensureEnd(prompt.slice(0, m.index))} ${text} ${prompt.slice(m.index + 1)}`.trim();
}

export function fixPrompt(prompt: string, rule: FixableRule, scene: Scene, ctx: LintContext): string {
  const ratio = ctx.brief.project.aspectRatio;
  switch (rule) {
    case 'L04':
      return prompt.includes(ratio) ? prompt : `${ensureEnd(prompt)} Aspect ratio ${ratio}.`;
    case 'L02': {
      if (!ctx.bibles) return prompt;
      let out = prompt;
      for (const cid of scene.characterIds) {
        const b = ctx.bibles.characters.find((c) => c.id === cid);
        if (!b?.masterDescriptionEn.trim()) continue;
        if (coverage(uniqueWords(b.masterDescriptionEn), out) >= 0.5) continue;
        out = `${ensureEnd(b.masterDescriptionEn)} ${out}`.trim();
      }
      return out;
    }
    case 'L03': {
      const desc = ctx.bibles?.visual.productAppearanceEn.trim();
      if (!desc || coverage(keywords(desc), prompt) >= 0.4) return prompt;
      return insertBeforeTail(prompt, `Product: ${ensureEnd(desc)}`);
    }
    case 'L07': {
      const kept = sentences(prompt).filter((s) => !TEXT_REQUEST.test(s) || NEGATION.test(s));
      let out = kept.join('').trim();
      if (!/no on-screen text/i.test(out)) out = insertBeforeTail(out, 'No on-screen text, captions or logos rendered as text.');
      return out;
    }
    case 'L10':
      return prompt;
  }
}

/** Terapkan perbaikan ke scene untuk satu varian. Mengembalikan scene baru (scene lain tidak disentuh). */
export function applyLintFixes(scene: Scene, ctx: LintContext, rules: FixableRule[], variant: Variant = ctx.variant): Scene {
  let prompt = (variant === 'standard' ? scene.flowPrompts.standard : scene.flowPrompts[variant]) ?? '';
  // Urutan penting: L07 dulu (menghapus kalimat), lalu sisipan, terakhir aspect ratio di akhir.
  const order: FixableRule[] = ['L07', 'L02', 'L03', 'L04'];
  for (const r of order) if (rules.includes(r)) prompt = fixPrompt(prompt, r, scene, ctx);
  const negativePrompt = rules.includes('L10') && !scene.negativePrompt.trim() ? buildNegative('', ctx.brief) : scene.negativePrompt;
  return { ...scene, flowPrompts: { ...scene.flowPrompts, [variant]: prompt }, negativePrompt };
}
