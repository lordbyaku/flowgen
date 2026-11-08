import type { Brief, Scene, Variant } from '@/types';

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
export function copyText(scene: Scene, variant: Variant = 'standard'): string {
  const prompt = scenePrompt(scene, variant).trim();
  const neg = scene.negativePrompt.trim();
  return neg ? `${prompt}\n\nAvoid: ${neg}` : prompt;
}

/** Salin Semua: teks bernomor dengan pemisah === SCENE n ===. */
export function copyAllText(scenes: Scene[], variant: Variant = 'standard'): string {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `=== SCENE ${i + 1} ===\n${copyText(s, variant)}`)
    .join('\n\n');
}
