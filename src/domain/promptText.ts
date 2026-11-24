import type { Brief, Scene, Variant } from '@/types';

/** Baris "Avoid:" ikut disalin/diekspor? Default ya (v1.5: bisa dimatikan di Langkah 8). */
export function avoidLineOn(brief: Pick<Brief, 'output'>): boolean {
  return brief.output.avoidLine !== false;
}

/** Negatif dasar yang selalu ada (Bagian 23.5). */
export const BASE_NEGATIVES = [
  'on-screen text',
  'captions',
  'subtitles',
  'watermark',
  'distorted or misspelled logos',
  'extra fingers',
  'deformed hands',
  'unnatural face',
];

/** Gabungkan negatif dasar + negatif dari AI + globalNegatives brief, tanpa duplikat. */
export function buildNegative(aiNegative: string, brief: Brief): string {
  const parts = [...BASE_NEGATIVES, ...splitList(aiNegative), ...brief.output.globalNegatives];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(p.trim());
  }
  return out.join(', ');
}

function splitList(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function scenePrompt(scene: Scene, variant: Variant = 'standard'): string {
  return (variant === 'standard' ? scene.flowPrompts.standard : scene.flowPrompts[variant]) ?? '';
}

/** Teks yang disalin ke Google Flow: prompt + baris Avoid. */
export function copyText(scene: Scene, variant: Variant = 'standard', avoid = true): string {
  const prompt = scenePrompt(scene, variant).trim();
  const neg = avoid ? scene.negativePrompt.trim() : '';
  return neg ? `${prompt}\n\nAvoid: ${neg}` : prompt;
}

/** Prompt gambar frame (awal/akhir) + baris Avoid tanpa teks di gambar. */
export function frameCopyText(scene: Pick<Scene, 'framePrompts'>, which: 'start' | 'end', avoid = true): string {
  const p = scene.framePrompts?.[which]?.trim() ?? '';
  if (!avoid) return p;
  return p ?`${p}\n\nAvoid: text, letters, watermark, distorted logo, deformed hands` : '';
}

/** Salin Semua: teks bernomor dengan pemisah === SCENE n ===. */
export function copyAllText(scenes: Scene[], variant: Variant = 'standard', avoid = true): string {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `=== SCENE ${i + 1} ===\n${copyText(s, variant, avoid)}`)
    .join('\n\n');
}
