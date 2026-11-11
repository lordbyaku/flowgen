import type { AssetsDoc, BiblesDoc, Brief, CharacterAsset, CharacterRef, LocationAsset, ProductAsset, Scene } from '@/types';

/**
 * Prompt aset untuk Google Flow (urutan kerja: karakter → tempat → story).
 * Disusun deterministik dari Character/Visual Bible: gratis, instan, dan konsisten.
 */

const MAX_LOCATIONS = 5;
const NO_TEXT = 'No text, no captions, no watermark, no logos rendered as text.';

const end = (t: string) => {
  const s = t.trim();
  return s === '' || /[.!?]$/.test(s) ? s : `${s}.`;
};

export function characterRefOf(brief: Brief): CharacterRef {
  return brief.output.characterRef ?? 'description';
}

/** Mode aset Flow aktif dan dokumen aset tersedia. */
export function isFlowAssetsMode(brief: Brief, assets?: AssetsDoc | null): assets is AssetsDoc {
  return (
    characterRefOf(brief) === 'flow_assets' &&
    !!assets &&
    (assets.characters.length > 0 || assets.locations.length > 0 || !!assets.product)
  );
}

const TIME_EN: Record<string, string> = { morning: 'morning', noon: 'midday', afternoon: 'late afternoon', night: 'night' };

export function buildCharacterPrompts(
  bible: BiblesDoc['characters'][number],
  visual: BiblesDoc['visual'],
): Pick<CharacterAsset, 'fullBodyPrompt' | 'closeUpPrompt'> {
  const style = visual.styleLineEn ? ` ${end(visual.styleLineEn)}` : '';
  const desc = end(bible.masterDescriptionEn || `${bible.name}, ${bible.appearance}, ${bible.clothing}`);
  return {
    fullBodyPrompt:
      `Character reference image of ${bible.name || 'the character'}. ${desc} ` +
      `Full body, standing naturally, facing the camera, arms relaxed, the complete outfit clearly visible. ` +
      `Plain light grey studio background, soft even lighting, sharp focus, realistic proportions.${style} ` +
      `Only this one person in the frame. ${NO_TEXT}`,
    closeUpPrompt:
      `Close-up portrait reference of ${bible.name || 'the character'}. ${desc} ` +
      `Head and shoulders, looking at the camera with a natural expression, face clearly visible and evenly lit. ` +
      `Plain light grey background, sharp focus on the face.${style} ${NO_TEXT}`,
  };
}

export function buildLocationPrompt(description: string, brief: Brief, visual: BiblesDoc['visual']): string {
  const time = brief.location.timeOfDay ? `, ${TIME_EN[brief.location.timeOfDay]}` : '';
  const weather = brief.location.weather && brief.location.weather !== 'Tidak relevan' ? `, weather: ${brief.location.weather}` : '';
  const props = brief.location.requiredProps.length ? ` Include these props: ${brief.location.requiredProps.join(', ')}.` : '';
  const lighting = visual.lightingStyle ? ` Lighting: ${end(visual.lightingStyle)}` : '';
  const style = visual.styleLineEn ? ` ${end(visual.styleLineEn)}` : '';
  return (
    `Location reference image, wide establishing shot: ${end(description)}` +
    `${time || weather ? ` Setting details${time}${weather}.` : ''}${props}${lighting}${style} ` +
    `Empty scene with no people, eye-level camera, the whole space clearly visible. Aspect ratio ${brief.project.aspectRatio}. ${NO_TEXT}`
  );
}

export function buildProductPrompt(name: string, visual: BiblesDoc['visual'], brief: Brief): string {
  const style = visual.styleLineEn ? ` ${end(visual.styleLineEn)}` : '';
  return (
    `Product reference image of ${name}. ${end(visual.productAppearanceEn || brief.product.description)} ` +
    `Clean product shot on a plain light background, three-quarter front view, soft studio lighting, every detail sharp, ` +
    `logo placement and colors exactly as described.${style} No hands, no people. No extra text besides what is printed on the product.`
  );
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Kumpulan lokasi unik dari brief + scene (maks 5). Lokasi utama selalu pertama. */
export function collectLocations(brief: Brief, bibles: BiblesDoc, scenes: Scene[]): { name: string; description: string }[] {
  const mainDesc = [bibles.visual.environmentDesign, brief.location.localFlavor].filter((x) => x && x.trim()).join('. ');
  const out: { name: string; description: string }[] = [
    { name: brief.location.main.trim() || 'Lokasi utama', description: mainDesc || brief.location.main },
  ];
  const seen = new Set([norm(out[0].description)]);
  for (const s of [...scenes].sort((a, b) => a.order - b.order)) {
    const d = s.environment.trim();
    if (!d || seen.has(norm(d))) continue;
    // Lewati lingkungan yang praktis sama dengan lokasi utama (mis. "the warung" dalam deskripsi utama).
    if (norm(out[0].description).includes(norm(d)) || norm(d).length < 6) continue;
    seen.add(norm(d));
    out.push({ name: `Lokasi ${out.length + 1}`, description: d });
    if (out.length >= MAX_LOCATIONS) break;
  }
  return out;
}

/**
 * Bangun atau perbarui dokumen aset dari Bible. Isian pengguna (nama di Flow, status selesai,
 * prompt yang sudah diedit) dipertahankan.
 */
export function buildAssets(brief: Brief, bibles: BiblesDoc, scenes: Scene[], prev: AssetsDoc | null, now: number): AssetsDoc {
  const characters: CharacterAsset[] = bibles.characters.map((b) => {
    const old = prev?.characters.find((c) => c.id === b.id);
    const prompts = buildCharacterPrompts(b, bibles.visual);
    return {
      id: b.id,
      name: b.name,
      flowName: old?.flowName || b.name || b.id,
      fullBodyPrompt: old?.edited ? old.fullBodyPrompt : prompts.fullBodyPrompt,
      closeUpPrompt: old?.edited ? old.closeUpPrompt : prompts.closeUpPrompt,
      done: old?.done ?? false,
      edited: old?.edited ?? false,
    };
  });

  const locations: LocationAsset[] = collectLocations(brief, bibles, scenes).map((l, i) => {
    const id = `loc_${i + 1}`;
    const old = prev?.locations.find((x) => x.id === id);
    return {
      id,
      name: old?.name || l.name,
      flowName: old?.flowName || l.name,
      description: old?.edited ? old.description : l.description,
      prompt: old?.edited ? old.prompt : buildLocationPrompt(l.description, brief, bibles.visual),
      done: old?.done ?? false,
      edited: old?.edited ?? false,
    };
  });

  const showProduct = brief.product.type !== 'service' || brief.product.mustBeVisible;
  const product: ProductAsset | null = showProduct
    ? {
        name: brief.product.name,
        flowName: prev?.product?.flowName || brief.product.name,
        prompt: prev?.product?.edited ? prev.product.prompt : buildProductPrompt(brief.product.name, bibles.visual, brief),
        done: prev?.product?.done ?? false,
        edited: prev?.product?.edited ?? false,
      }
    : null;

  return { characters, locations, product, updatedAt: now };
}

/** Lokasi aset yang paling cocok untuk scene (berdasarkan kata yang sama dengan deskripsi). */
export function locationForScene(scene: Scene, assets: AssetsDoc | null): LocationAsset | null {
  if (!assets || assets.locations.length === 0) return null;
  const env = new Set(norm(scene.environment).split(' ').filter((w) => w.length >= 4));
  let best: LocationAsset = assets.locations[0];
  let bestScore = 0;
  for (const l of assets.locations) {
    const score = norm(l.description)
      .split(' ')
      .filter((w) => env.has(w)).length;
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  return best;
}

/** Semua prompt aset, berurutan karakter → tempat → produk, untuk disalin/diekspor. */
export function assetsText(assets: AssetsDoc): string {
  const parts: string[] = [];
  assets.characters.forEach((c, i) => {
    parts.push(`=== KARAKTER ${i + 1}: ${c.flowName} (seluruh badan) ===\n${c.fullBodyPrompt}`);
    parts.push(`=== KARAKTER ${i + 1}: ${c.flowName} (close-up wajah) ===\n${c.closeUpPrompt}`);
  });
  assets.locations.forEach((l, i) => parts.push(`=== TEMPAT ${i + 1}: ${l.flowName} ===\n${l.prompt}`));
  if (assets.product) parts.push(`=== PRODUK: ${assets.product.flowName} ===\n${assets.product.prompt}`);
  return parts.join('\n\n');
}

/** Ringkas: apakah aset sudah lengkap dibuat di Flow? */
export function assetsProgress(assets: AssetsDoc | null): { done: number; total: number } {
  if (!assets) return { done: 0, total: 0 };
  const all = [...assets.characters.map((c) => c.done), ...assets.locations.map((l) => l.done), ...(assets.product ? [assets.product.done] : [])];
  return { done: all.filter(Boolean).length, total: all.length };
}
