import { MAX_SCENE_SEC } from '@/config/constants';
import { newId } from '@/lib/ids';
import { clamp } from '@/lib/utils';
import type { SimpleVideo, SimpleVideoInput, SimpleVideoOutput } from '@/types';

/** Bagi durasi total menjadi klip sepanjang mungkin (maks MAX_SCENE_SEC), selisih maks 1 detik. Mis. 30 → [10,10,10], 15 → [8,7]. */
export function planClips(totalSec: number): number[] {
  const total = Math.max(1, Math.round(totalSec));
  const n = Math.ceil(total / MAX_SCENE_SEC);
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export const NO_TEXT_LINE = 'No on-screen text, no subtitles.';
export const SINGLE_SHOT_LINE = 'One continuous shot, no jump cuts.';

/** Pastikan setiap prompt klip diakhiri baris tetap (tanpa teks, satu shot, rasio), tanpa dobel. */
export function finalizeClipPrompt(prompt: string, aspectRatio: string): string {
  let p = prompt.trim().replace(/\s*Aspect ratio\s*\d+:\d+\.?\s*$/i, '');
  if (!/no on-screen text/i.test(p)) p = `${p} ${NO_TEXT_LINE}`;
  if (!/one continuous shot/i.test(p)) p = `${p} ${SINGLE_SHOT_LINE}`;
  return `${p.trim()} Aspect ratio ${aspectRatio}.`;
}

/** Ubah keluaran AI menjadi dokumen tersimpan. Durasi mengikuti rencana bila jumlah klip cocok. */
export function toSimpleVideo(input: SimpleVideoInput, out: SimpleVideoOutput, now: number, id = `sv_${newId()}`): SimpleVideo {
  const plan = planClips(input.durationSec);
  const clips = out.clips.map((c, i) => ({
    id: `clip_${i + 1}_${newId().slice(0, 6)}`,
    title: c.title.trim() || `Klip ${i + 1}`,
    durationSec: out.clips.length === plan.length ? plan[i] : clamp(Math.round(c.durationSec) || MAX_SCENE_SEC, 3, MAX_SCENE_SEC),
    prompt: finalizeClipPrompt(c.prompt, input.aspectRatio),
    speech: c.speech?.trim() || undefined,
    done: false,
  }));
  return {
    id,
    input,
    title: out.title.trim() || 'Video tanpa judul',
    summary: out.summary.trim(),
    assets: input.useAssets ? out.assets.map((a) => ({ ...a, name: a.name.trim(), done: false })) : [],
    clips,
    tips: out.tips.map((t) => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now,
  };
}

/** Semua prompt klip berurutan, siap salin. */
export function simpleAllText(v: SimpleVideo): string {
  const assets = v.assets.map((a) => `=== ASET ${a.name} ===\n${a.imagePrompt}`);
  const clips = v.clips.map((c, i) => `=== KLIP ${i + 1}: ${c.title} (${c.durationSec} dtk) ===\n${c.prompt}`);
  return [...assets, ...clips].join('\n\n');
}
