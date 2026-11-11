import { MAX_OUTPUT_TOKENS, SCENE_PROMPT_BATCH, TEMPERATURE } from '@/config/constants';
import { ScenePromptsBatchSchema, ScenePromptsFinalSchema } from '@/schemas/storyboard.schema';
import { buildNegative } from '@/domain/promptText';
import { pushVersion } from '@/domain/sceneVersions';
import type { AssetsDoc, BiblesDoc, Brief, Scene, ScenePromptItem, Variant } from '@/types';
import { briefDigest } from './briefSerializer';
import { promptFormatRules, sceneBlock, sceneContextBlock } from './sceneContext';
import { buildSystemPrompt } from './systemPrompts';

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface ScenePromptBatch {
  final: boolean;
  sceneIds: string[];
  call: {
    task: 'scene_prompts';
    systemPrompt: string;
    userPrompt: string;
    schema: typeof ScenePromptsBatchSchema | typeof ScenePromptsFinalSchema;
    temperature: number;
    maxOutputTokens: number;
  };
}

/** Bagi menjadi batch maksimal 6 scene; panduan CapCut dibuat pada batch terakhir. */
export function buildScenePromptBatches(
  brief: Brief,
  allScenes: Scene[],
  targets: Scene[],
  bibles: BiblesDoc,
  assets?: AssetsDoc | null,
): ScenePromptBatch[] {
  const sorted = [...allScenes].sort((a, b) => a.order - b.order);
  const variants = brief.output.variants;
  const outline = sorted.map((s, i) => `${i + 1}. ${s.title} (${s.durationSec}s) — VO: ${s.voiceOver || '-'} — overlay: ${s.textOverlay || '-'}`);
  const batches = chunk(
    [...targets].sort((a, b) => a.order - b.order),
    SCENE_PROMPT_BATCH,
  );
  return batches.map((batch, bi) => {
    const final = bi === batches.length - 1;
    const user = [
      briefDigest(brief),
      '',
      sceneContextBlock(brief, bibles, assets),
      '',
      '<full_storyboard_outline>',
      ...outline,
      '</full_storyboard_outline>',
      '',
      `<scenes_for_this_batch batch="${bi + 1}/${batches.length}">`,
      ...batch.map((s) => sceneBlock(s, sorted.findIndex((x) => x.id === s.id), assets)),
      '</scenes_for_this_batch>',
      '',
      'TASK (Call 3 — Flow prompts):',
      `For EACH scene in this batch return one item in prompts with the same sceneId: standard${variants.includes('cinematic') ? ', cinematic' : ''}${variants.includes('premium') ? ', premium' : ''}${brief.output.flowMode !== 'text_to_video' ? ', startFrame' : ''}${brief.output.flowMode === 'frames' ? ', endFrame' : ''}, negativePrompt.`,
      promptFormatRules(brief, variants, assets),
      ...(final
        ? [
            '',
            'ALSO return capcut: an editing guide for CapCut in Indonesian covering ALL scenes of the full storyboard:',
            'sceneOrder (scene titles in order), timeline (scene number 1-based, startSec, endSec, note), voiceOverSequence,',
            'musicMood, sfx, transitions, rhythm, textOverlays (scene, text, position, style, startSec, endSec), opening, closing.',
            'Timeline must cover the full duration contiguously starting at 0.',
          ]
        : []),
    ].join('\n');
    return {
      final,
      sceneIds: batch.map((s) => s.id),
      call: {
        task: 'scene_prompts' as const,
        systemPrompt: buildSystemPrompt(brief),
        userPrompt: user,
        schema: final ? ScenePromptsFinalSchema : ScenePromptsBatchSchema,
        temperature: TEMPERATURE.prompts,
        maxOutputTokens: MAX_OUTPUT_TOKENS.prompts,
      },
    };
  });
}

export { pushVersion };

/** Prompt frame hanya disimpan untuk mode berbasis gambar. */
export function framePromptsFor(brief: Brief, start?: string, end?: string): Scene['framePrompts'] {
  const mode = brief.output.flowMode;
  if (mode === 'text_to_video') return undefined;
  return {
    ...(start?.trim() ? { start: start.trim() } : {}),
    ...(mode === 'frames' && end?.trim() ? { end: end.trim() } : {}),
  };
}

/** Gabungkan hasil prompt ke scene target. Scene lain tidak disentuh. */
export function applyPromptItems(scenes: Scene[], items: ScenePromptItem[], brief: Brief, now: number): Scene[] {
  const byId = new Map(items.map((i) => [i.sceneId, i]));
  const variants: Variant[] = brief.output.variants;
  return scenes.map((s) => {
    const it = byId.get(s.id);
    if (!it) return s;
    const next: Scene = {
      ...s,
      flowPrompts: {
        standard: it.standard,
        ...(variants.includes('cinematic') && it.cinematic ? { cinematic: it.cinematic } : {}),
        ...(variants.includes('premium') && it.premium ? { premium: it.premium } : {}),
      },
      framePrompts: framePromptsFor(brief, it.startFrame, it.endFrame),
      negativePrompt: buildNegative(it.negativePrompt, brief),
      tracker: 'prompt_ready',
      updatedAt: now,
    };
    return pushVersion(next, 'generated', now);
  });
}
