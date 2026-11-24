import { isFlowAssetsMode } from '@/domain/assets';
import { hookCopyText, hookLetter } from '@/domain/hooks';
import { avoidLineOn, copyText, frameCopyText } from '@/domain/promptText';
import type { AssetsDoc, Brief, HooksDoc, Scene, TrackerStatus, Variant } from '@/types';

/** Mode produksi HP (v1.4): antrean satu item per layar, dibangun dari dokumen yang ada. */
export interface ShootCopy {
  label: string;
  text: string;
}

export type ShootTarget =
  | { kind: 'character'; id: string }
  | { kind: 'location'; id: string }
  | { kind: 'product' }
  | { kind: 'scene'; id: string }
  | { kind: 'hook'; id: string };

export interface ShootItem {
  key: string;
  target: ShootTarget;
  /** Grup tampilan: Aset Flow, Scene, Varian hook. */
  group: 'asset' | 'scene' | 'hook';
  title: string;
  subtitle: string;
  /** Konteks singkat (VO/overlay) agar tahu momen yang sedang dibuat. */
  context: string[];
  copies: ShootCopy[];
  done: boolean;
  tracker?: TrackerStatus;
}

const PRODUCED: TrackerStatus[] = ['clip_generated', 'downloaded', 'in_capcut', 'final'];
export const isProduced = (t: TrackerStatus) => PRODUCED.includes(t);

export function buildShootQueue(
  brief: Brief,
  docs: { scenes: Scene[]; assets: AssetsDoc | null; hooks: HooksDoc | null },
  variant: Variant = 'standard',
): ShootItem[] {
  const out: ShootItem[] = [];
  const avoid = avoidLineOn(brief);
  const assets = docs.assets;
  if (isFlowAssetsMode(brief, assets)) {
    assets.characters.forEach((c) =>
      out.push({
        key: `char:${c.id}`,
        target: { kind: 'character', id: c.id },
        group: 'asset',
        title: c.flowName || c.name,
        subtitle: 'Karakter — buat gambar seluruh badan dan close-up wajah, lalu simpan sebagai aset Flow',
        context: [],
        copies: [
          { label: 'Seluruh badan', text: c.fullBodyPrompt },
          { label: 'Close-up wajah', text: c.closeUpPrompt },
        ].filter((x) => x.text.trim()),
        done: c.done,
      }),
    );
    assets.locations.forEach((l) =>
      out.push({
        key: `loc:${l.id}`,
        target: { kind: 'location', id: l.id },
        group: 'asset',
        title: l.flowName || l.name,
        subtitle: 'Tempat — tanpa orang',
        context: [],
        copies: [{ label: 'Prompt tempat', text: l.prompt }].filter((x) => x.text.trim()),
        done: l.done,
      }),
    );
    if (assets.product)
      out.push({
        key: 'product',
        target: { kind: 'product' },
        group: 'asset',
        title: assets.product.flowName || assets.product.name,
        subtitle: 'Produk',
        context: [],
        copies: [{ label: 'Prompt produk', text: assets.product.prompt }].filter((x) => x.text.trim()),
        done: assets.product.done,
      });
  }

  const sorted = [...docs.scenes].sort((a, b) => a.order - b.order);
  sorted.forEach((s, i) => {
    const prompt = copyText(s, s.flowPrompts[variant] ? variant : 'standard', avoid);
    out.push({
      key: `scene:${s.id}`,
      target: { kind: 'scene', id: s.id },
      group: 'scene',
      title: `Scene ${i + 1}: ${s.title}`,
      subtitle: `${s.durationSec} detik`,
      context: [s.voiceOver && `VO: ${s.voiceOver}`, s.textOverlay && `Overlay (CapCut): ${s.textOverlay}`].filter(Boolean) as string[],
      // Mode gambar: buat gambar frame dulu, baru videonya.
      copies: [
        { label: 'Frame awal (gambar)', text: frameCopyText(s, 'start', avoid) },
        { label: 'Frame akhir (gambar)', text: frameCopyText(s, 'end', avoid) },
        { label: 'Prompt video', text: s.flowPrompts.standard.trim() ? prompt : '' },
        // Alternatif (v1.5): lanjutkan klip scene sebelumnya dengan Extend.
        { label: `Prompt Extend dari scene ${i} (opsional)`, text: s.extendPrompt ?? '' },
      ].filter((x) => x.text.trim()),
      done: isProduced(s.tracker),
      tracker: s.tracker,
    });
  });

  (docs.hooks?.items ?? []).forEach((h, i) =>
    out.push({
      key: `hook:${h.id}`,
      target: { kind: 'hook', id: h.id },
      group: 'hook',
      title: `${hookLetter(i)}: ${h.title}`,
      subtitle: 'Varian hook — pengganti scene 1',
      context: [h.voiceOver && `VO: ${h.voiceOver}`, h.textOverlay && `Overlay (CapCut): ${h.textOverlay}`].filter(Boolean) as string[],
      copies: [
        { label: 'Frame awal (gambar)', text: frameCopyText(h, 'start', avoid) },
        { label: 'Frame akhir (gambar)', text: frameCopyText(h, 'end', avoid) },
        { label: 'Prompt video', text: hookCopyText(h, avoid) },
      ].filter((x) => x.text.trim()),
      done: isProduced(h.tracker),
      tracker: h.tracker,
    }),
  );
  return out;
}

/** Indeks item pertama yang belum selesai (atau 0). */
export function firstPending(queue: ShootItem[]): number {
  const i = queue.findIndex((q) => !q.done);
  return i < 0 ? 0 : i;
}

/** Indeks item berikutnya yang belum selesai setelah `from` (berputar); null bila semua selesai. */
export function nextPending(queue: ShootItem[], from: number): number | null {
  for (let k = 1; k <= queue.length; k++) {
    const i = (from + k) % queue.length;
    if (!queue[i].done) return i;
  }
  return null;
}
