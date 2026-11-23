import { buildAssets } from '@/domain/assets';
import { buildTimelineFromScenes } from '@/domain/exporters/capcutGuide';
import { countWords } from '@/lib/utils';
import type { Angle, AspectRatio, AssetsDoc, Brief, CapcutDoc, Project, ProjectDocs, Scene } from '@/types';

/**
 * Konten turunan (v1.4): satu project menjadi beberapa konten tanpa panggilan AI.
 * Fungsi di sini murni; penyimpanan dilakukan repo (createDerivedProject).
 */
export interface DerivedDraft {
  name: string;
  brief: Brief;
  docs: Partial<ProjectDocs>;
  stage: Project['stage'];
  derivation: NonNullable<Project['derivation']>;
}

const MIN_DURATION = 5;
const sortScenes = (scenes: Scene[]) => [...scenes].sort((a, b) => a.order - b.order);
const withName = (brief: Brief, name: string): Brief => ({ ...brief, project: { ...brief.project, name } });

export interface SeriesPart {
  angle: Angle;
  focus: string;
}

/** Seri: tiap bagian punya angle sendiri; karakter, tempat, dan gaya visual sama (Bible + aset Flow disalin). */
export function deriveSeries(project: Project, docs: ProjectDocs, parts: SeriesPart[]): DerivedDraft[] {
  const total = parts.length;
  return parts.map((part, i) => {
    const name = `${project.name || 'Project'} — Part ${i + 1}`;
    const others = parts.filter((_, k) => k !== i).map((p) => p.angle);
    const note = [
      `Seri bagian ${i + 1} dari ${total}.`,
      part.focus.trim() ? `Fokus bagian ini: ${part.focus.trim()}.` : '',
      others.length ? `Bagian lain memakai angle: ${others.join(', ')}; jangan mengulang cerita yang sama.` : '',
      'Karakter, tempat, dan gaya visual harus sama dengan bagian lain.',
    ]
      .filter(Boolean)
      .join(' ');
    const brief = withName(project.brief, name);
    return {
      name,
      brief: {
        ...brief,
        strategy: { ...brief.strategy, angles: [part.angle], aiPicksAngle: false },
        output: { ...brief.output, extraNotes: [brief.output.extraNotes?.trim(), note].filter(Boolean).join('\n') },
      },
      docs: { bibles: docs.bibles, assets: docs.assets },
      stage: 'concepts',
      derivation: 'series',
    };
  });
}

export interface CutdownCheck {
  durationSec: number;
  hasHook: boolean;
  hasCta: boolean;
  valid: boolean;
}

export function checkCutdown(scenes: Scene[], keepIds: string[]): CutdownCheck {
  const sorted = sortScenes(scenes);
  const kept = sorted.filter((s) => keepIds.includes(s.id));
  const durationSec = kept.reduce((a, s) => a + s.durationSec, 0);
  return {
    durationSec,
    hasHook: !!sorted[0] && keepIds.includes(sorted[0].id),
    hasCta: !!sorted.at(-1) && keepIds.includes(sorted.at(-1)!.id),
    valid: kept.length > 0 && kept.length < sorted.length && durationSec >= MIN_DURATION,
  };
}

/** Panduan CapCut untuk subset scene: timeline dihitung ulang, overlay dipetakan ke nomor/waktu baru. */
export function cutdownCapcut(capcut: CapcutDoc, all: Scene[], kept: Scene[]): CapcutDoc {
  const sorted = sortScenes(all);
  const oldStart = new Map<number, number>();
  let t = 0;
  sorted.forEach((s, i) => {
    oldStart.set(i + 1, t);
    t += s.durationSec;
  });
  const timeline = buildTimelineFromScenes(kept);
  const oldNumberOf = (s: Scene) => sorted.findIndex((x) => x.id === s.id) + 1;
  const map = new Map(kept.map((s, i) => [oldNumberOf(s), { scene: i + 1, start: timeline[i].startSec }]));
  const textOverlays = capcut.textOverlays.flatMap((o) => {
    const m = map.get(o.scene);
    if (!m) return [];
    const shift = m.start - (oldStart.get(o.scene) ?? 0);
    return [{ ...o, scene: m.scene, startSec: o.startSec + shift, endSec: o.endSec + shift }];
  });
  return {
    ...capcut,
    sceneOrder: kept.map((s) => s.title),
    timeline,
    voiceOverSequence: kept.map((s) => s.voiceOver).filter(Boolean),
    textOverlays,
    checklist: {},
    updatedAt: 0,
  };
}

/** Versi pendek: subset scene apa adanya (prompt + status) agar klip yang sudah dirender bisa dipakai ulang. */
export function deriveCutdown(project: Project, docs: ProjectDocs, keepIds: string[]): DerivedDraft {
  const check = checkCutdown(docs.scenes?.items ?? [], keepIds);
  if (!check.valid) throw new Error('Pilihan scene tidak valid');
  const all = sortScenes(docs.scenes?.items ?? []);
  const kept = all.filter((s) => keepIds.includes(s.id)).map((s, i) => ({ ...s, order: i }));
  const name = `${project.name || 'Project'} (versi ${check.durationSec} dtk)`;
  const brief = withName(project.brief, name);
  const vo = kept.map((s) => s.voiceOver).filter(Boolean).join(' ');
  const hooksStillValid = !!docs.hooks && kept[0]?.id === docs.hooks.baseSceneId;
  return {
    name,
    brief: { ...brief, project: { ...brief.project, durationSec: check.durationSec, sceneCountMode: 'manual', sceneCount: kept.length } },
    docs: {
      creative: docs.creative,
      script: docs.script ? { ...docs.script, voiceOver: vo, wordCount: countWords(vo), estimatedDurationSec: check.durationSec } : null,
      bibles: docs.bibles,
      assets: docs.assets,
      scenes: { items: kept, updatedAt: 0 },
      capcut: docs.capcut ? cutdownCapcut(docs.capcut, all, kept) : null,
      hooks: hooksStillValid ? docs.hooks : null,
    },
    stage: 'production',
    derivation: 'cutdown',
  };
}

const RATIO_RE = /Aspect ratio \d+:\d+/g;

function reratioAssets(assets: AssetsDoc, brief: Brief, docs: ProjectDocs, ratio: AspectRatio): AssetsDoc {
  const rebuilt = docs.bibles ? buildAssets(brief, docs.bibles, docs.scenes?.items ?? [], assets, 0) : assets;
  const fix = (t: string) => t.replace(RATIO_RE, `Aspect ratio ${ratio}`);
  return {
    ...rebuilt,
    characters: rebuilt.characters.map((c) => ({ ...c, fullBodyPrompt: fix(c.fullBodyPrompt), closeUpPrompt: fix(c.closeUpPrompt) })),
    locations: rebuilt.locations.map((l) => ({ ...l, prompt: fix(l.prompt) })),
    product: rebuilt.product ? { ...rebuilt.product, prompt: fix(rebuilt.product.prompt) } : null,
  };
}

/** Rasio lain: storyboard sama, prompt scene dikosongkan (rasio ada di dalam prompt) → cukup ulang Panggilan 3. */
export function deriveRatio(project: Project, docs: ProjectDocs, ratio: AspectRatio): DerivedDraft {
  if (ratio === project.brief.project.aspectRatio) throw new Error('Rasio sama dengan project sumber');
  const name = `${project.name || 'Project'} (${ratio})`;
  const base = withName(project.brief, name);
  const brief: Brief = { ...base, project: { ...base.project, aspectRatio: ratio } };
  const scenes = sortScenes(docs.scenes?.items ?? []).map((s) => ({
    ...s,
    flowPrompts: { standard: '' },
    framePrompts: undefined,
    negativePrompt: '',
    approved: false,
    tracker: 'prompt_ready' as const,
    trackerNote: undefined,
    lastFix: undefined,
    versions: [],
  }));
  return {
    name,
    brief,
    docs: {
      creative: docs.creative,
      script: docs.script,
      bibles: docs.bibles,
      assets: docs.assets ? reratioAssets(docs.assets, brief, docs, ratio) : null,
      scenes: scenes.length ? { items: scenes, updatedAt: 0 } : null,
      capcut: docs.capcut ? { ...docs.capcut, checklist: {}, updatedAt: 0 } : null,
    },
    stage: 'prompts',
    derivation: 'ratio',
  };
}
