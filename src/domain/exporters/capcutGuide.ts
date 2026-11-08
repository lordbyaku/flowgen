import type { CapcutGuide, Scene } from '@/types';

export type CapcutSectionId =
  | 'order'
  | 'timeline'
  | 'vo'
  | 'music'
  | 'sfx'
  | 'transitions'
  | 'rhythm'
  | 'overlays'
  | 'opening'
  | 'closing';

export interface CapcutSection {
  id: CapcutSectionId;
  title: string;
  text: string;
}

const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Panduan CapCut sebagai bagian-bagian teks yang dapat disalin per bagian. */
export function capcutSections(guide: CapcutGuide, scenes: Scene[]): CapcutSection[] {
  const titleOf = (n: number) => scenes.find((s) => s.order === n - 1)?.title ?? `Scene ${n}`;
  return [
    {
      id: 'order',
      title: 'Urutan scene',
      text: (guide.sceneOrder.length ? guide.sceneOrder : scenes.map((s) => s.title))
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n'),
    },
    {
      id: 'timeline',
      title: 'Timeline',
      text: guide.timeline
        .map((t) => `${fmtSec(t.startSec)}–${fmtSec(t.endSec)}  Scene ${t.scene} (${titleOf(t.scene)}): ${t.note}`)
        .join('\n'),
    },
    { id: 'vo', title: 'Urutan voice-over', text: guide.voiceOverSequence.map((v, i) => `${i + 1}. ${v}`).join('\n') },
    { id: 'music', title: 'Mood musik', text: guide.musicMood },
    { id: 'sfx', title: 'Sound effect', text: guide.sfx.map((s) => `- ${s}`).join('\n') },
    { id: 'transitions', title: 'Transisi', text: guide.transitions.map((s) => `- ${s}`).join('\n') },
    { id: 'rhythm', title: 'Ritme editing', text: guide.rhythm },
    {
      id: 'overlays',
      title: 'Teks overlay',
      text: guide.textOverlays
        .map(
          (o) =>
            `Scene ${o.scene} [${fmtSec(o.startSec)}–${fmtSec(o.endSec)}] "${o.text}" — posisi: ${o.position}; gaya: ${o.style}`,
        )
        .join('\n'),
    },
    { id: 'opening', title: 'Pembuka', text: guide.opening },
    { id: 'closing', title: 'Penutup', text: guide.closing },
  ];
}

export function capcutText(guide: CapcutGuide, scenes: Scene[]): string {
  return capcutSections(guide, scenes)
    .map((s) => `## ${s.title}\n${s.text || '-'}`)
    .join('\n\n');
}

/** Timeline per detik (Fase 2): bangun dari durasi scene bila AI tidak memberi timeline. */
export function buildTimelineFromScenes(scenes: Scene[]): CapcutGuide['timeline'] {
  let t = 0;
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => {
      const row = { scene: i + 1, startSec: t, endSec: t + s.durationSec, note: s.purpose || s.title };
      t += s.durationSec;
      return row;
    });
}
