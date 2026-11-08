import type { LintRule } from '../types';
import { coverage, keywords, uniqueWords } from '../text';

export const L02: LintRule = {
  id: 'L02',
  severity: 'warn',
  title: 'Karakter tidak dijelaskan lengkap',
  check: (scene, ctx, prompt) => {
    if (scene.characterIds.length === 0 || !ctx.bibles) return [];
    const out: string[] = [];
    for (const cid of scene.characterIds) {
      const bible = ctx.bibles.characters.find((c) => c.id === cid);
      if (!bible || !bible.masterDescriptionEn.trim()) {
        out.push(`Karakter ${cid} tidak punya Character Master Description.`);
        continue;
      }
      const ratio = coverage(uniqueWords(bible.masterDescriptionEn), prompt);
      if (ratio < 0.5)
        out.push(
          `Deskripsi karakter ${bible.name || cid} hanya ${Math.round(ratio * 100)}% muncul di prompt (minimal 50%).`,
        );
    }
    return out;
  },
};

export const L03: LintRule = {
  id: 'L03',
  severity: 'warn',
  title: 'Detail produk hilang',
  check: (_scene, ctx, prompt) => {
    if (!ctx.brief.product.mustBeVisible || !ctx.bibles) return [];
    const kw = keywords(ctx.bibles.visual.productAppearanceEn);
    if (kw.length === 0) return ['Visual Bible belum memuat deskripsi produk (productAppearanceEn).'];
    const ratio = coverage(kw, prompt);
    return ratio < 0.4
      ? [`Detail produk hanya ${Math.round(ratio * 100)}% muncul di prompt (minimal 40%), padahal produk wajib tampil.`]
      : [];
  },
};
