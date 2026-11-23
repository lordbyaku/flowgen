import { LABELS } from '@/config/enums';
import type { HookVariant, HooksDoc, Scene } from '@/types';

/** Varian yang sudah diproduksi (klip dibuat atau lebih) tidak diganti saat "Buat ulang". */
export function isHookProduced(h: HookVariant): boolean {
  return !['prompt_ready', 'copied'].includes(h.tracker);
}

/** Gabungkan varian baru: pertahankan yang sudah diproduksi, ganti sisanya (maks 6). */
export function mergeHooks(prev: HooksDoc | null, fresh: HookVariant[], baseSceneId: string, now: number): HooksDoc {
  const kept = prev && prev.baseSceneId === baseSceneId ? prev.items.filter(isHookProduced) : [];
  return { baseSceneId, items: [...kept, ...fresh].slice(0, 6), updatedAt: now };
}

/** Scene pembuka saat ini (dasar varian). */
export function openingScene(scenes: Scene[]): Scene | null {
  return [...scenes].sort((a, b) => a.order - b.order)[0] ?? null;
}

/** Teks yang disalin ke Flow: prompt + baris Avoid. */
export function hookCopyText(h: HookVariant): string {
  const neg = h.negativePrompt.trim();
  return neg ? `${h.flowPrompt.trim()}\n\nAvoid: ${neg}` : h.flowPrompt.trim();
}

/** Semua varian sebagai teks (ekspor). */
export function hooksText(doc: HooksDoc): string {
  return doc.items
    .map((h, i) => {
      const head = [
        `=== ${hookLetter(i).toUpperCase()} · ${LABELS.hookStyle[h.hookStyle]} · ${h.title} ===`,
        h.voiceOver && `VO: ${h.voiceOver}`,
        h.textOverlay && `Teks overlay: ${h.textOverlay}`,
        `Alasan: ${h.rationale}`,
      ];
      const frames = [
        h.framePrompts?.start && `Frame awal:\n${h.framePrompts.start}`,
        h.framePrompts?.end && `Frame akhir:\n${h.framePrompts.end}`,
      ];
      return [head.filter(Boolean).join('\n'), hookCopyText(h), ...frames.filter(Boolean)].join('\n\n');
    })
    .join('\n\n');
}

/** Label pendek varian: Hook A, Hook B, ... */
export const hookLetter = (index: number) => `Hook ${String.fromCharCode(65 + index)}`;
