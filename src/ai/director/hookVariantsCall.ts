import { HOOK_VARIANT_COUNT, MAX_OUTPUT_TOKENS, TEMPERATURE } from '@/config/constants';
import { HOOK_STYLES } from '@/config/enums';
import { HookVariantsOutputSchema } from '@/schemas/hooks.schema';
import { buildNegative } from '@/domain/promptText';
import { sceneWordBudget } from '@/domain/wordBudget';
import { newShortId } from '@/lib/ids';
import type { AssetsDoc, BiblesDoc, Brief, Concept, HookVariant, HookVariantsOutput, Scene } from '@/types';
import { briefDigest } from './briefSerializer';
import { promptFormatRules, sceneBlock, sceneContextBlock } from './sceneContext';
import { framePromptsFor } from './scenePromptCall';
import { buildSystemPrompt } from './systemPrompts';
import { pastPerformanceBlock } from './performanceBlock';

export function buildHookVariantsCall(
  brief: Brief,
  input: {
    scenes: Scene[];
    bibles: BiblesDoc;
    assets?: AssetsDoc | null;
    concept?: Concept | null;
    avoidStyles?: string[];
    learnings?: string[];
  },
) {
  const sorted = [...input.scenes].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  if (!first) throw new Error('Storyboard kosong');
  const second = sorted[1];
  const preferred = brief.strategy.hookStyles.length ? brief.strategy.hookStyles : [...HOOK_STYLES];
  const budget = sceneWordBudget(first.durationSec, brief.project.scriptLanguage);
  const user = [
    briefDigest(brief),
    '',
    sceneContextBlock(brief, input.bibles, input.assets),
    '',
    input.concept ? `<concept>${input.concept.title} — original hook idea: ${input.concept.openingHook}</concept>` : '',
    '<original_opening_scene>',
    sceneBlock(first, 0, input.assets, brief.project.scriptLanguage),
    `  voiceOver: ${first.voiceOver || '(none)'}`,
    `  textOverlay: ${first.textOverlay || '(none)'}`,
    '</original_opening_scene>',
    second
      ? ['<next_scene note="every hook must cut naturally into this scene">', sceneBlock(second, 1, input.assets, brief.project.scriptLanguage), `  voiceOver: ${second.voiceOver || '(none)'}`, '</next_scene>'].join('\n')
      : '',
    ...pastPerformanceBlock(input.learnings),
    '',
    `TASK (Hook variants — ${HOOK_VARIANT_COUNT} alternative opening scenes for A/B testing):`,
    `- Return hooks: EXACTLY ${HOOK_VARIANT_COUNT} items, each with a DIFFERENT hookStyle (enum). Prefer: ${preferred.join(', ')}.`,
    input.avoidStyles?.length ? `- Do not reuse these hook styles (already produced): ${input.avoidStyles.join(', ')}.` : '',
    '- Each must be clearly different from the original opening scene and stop the scroll within the first 1-2 seconds.',
    `- Each replaces scene 1 only: same duration (${first.durationSec}s), same characters and setting, and must lead naturally into the next scene.`,
    brief.audio.voiceOver
      ? `- voiceOver in the script language, max ${budget} words. Never use forbiddenClaims.`
      : '- Voice-over is DISABLED: voiceOver must be an empty string.',
    brief.audio.textOverlay
      ? '- textOverlay: the hook line shown in CapCut (max 7 words). It is NOT part of the Flow prompt.'
      : '- Text overlay is DISABLED: textOverlay must be an empty string.',
    '- title, visualDescription, characterAction and rationale (why this hook works for the audience) in Indonesian.',
    '- flowPrompt is the standard Flow prompt for this hook scene, following the format below.',
    promptFormatRules(brief, ['standard'], input.assets),
  ]
    .filter((l) => l !== '')
    .join('\n');
  return {
    task: 'hook_variants' as const,
    systemPrompt: buildSystemPrompt(brief),
    userPrompt: user,
    schema: HookVariantsOutputSchema,
    temperature: TEMPERATURE.hooks,
    maxOutputTokens: MAX_OUTPUT_TOKENS.hooks,
  };
}

export function toHookVariants(out: HookVariantsOutput, brief: Brief, now: number): HookVariant[] {
  return out.hooks.slice(0, HOOK_VARIANT_COUNT).map(({ startFrame, endFrame, ...h }) => ({
    ...h,
    id: `hook_${newShortId()}`,
    voiceOver: brief.audio.voiceOver ? h.voiceOver.trim() : '',
    textOverlay: brief.audio.textOverlay ? h.textOverlay.trim() : '',
    flowPrompt: h.flowPrompt.trim(),
    negativePrompt: buildNegative(h.negativePrompt, brief),
    framePrompts: framePromptsFor(brief, startFrame, endFrame),
    tracker: 'prompt_ready' as const,
    updatedAt: now,
  }));
}
