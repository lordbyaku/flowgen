import { MAX_OUTPUT_TOKENS, MAX_SCENE_SEC, MIN_SCENE_SEC, TEMPERATURE } from '@/config/constants';
import { ScriptStoryboardOutputSchema } from '@/schemas/storyboard.schema';
import { targetSceneCount } from '@/domain/duration';
import { estimateSpokenSec } from '@/domain/wordBudget';
import { newShortId } from '@/lib/ids';
import { countWords } from '@/lib/utils';
import type {
  BiblesDoc,
  Brand,
  Brief,
  Concept,
  Scene,
  ScriptDoc,
  ScriptStoryboardOutput,
} from '@/types';
import { serializeBrief } from './briefSerializer';
import { buildSystemPrompt } from './systemPrompts';

export function buildScriptStoryboardCall(brief: Brief, concept: Concept, brand?: Brand | null, imageCount = 0) {
  const p = brief.project;
  const count = targetSceneCount(p.durationSec, p.sceneCountMode, p.sceneCount, concept.recommendedSceneCount);
  const outro = brief.audio.outroLogo ? `${brief.audio.outroSec ?? 2} seconds of logo outro` : 'no logo outro';
  const charHint =
    brief.characters.mode === 'no_people'
      ? 'Mode is no_people: characterBibles must be an empty array and scenes have empty characterIds.'
      : brief.characters.mode === 'hands_only'
        ? 'Mode is hands_only: create ONE character bible with id "hands" describing only the hands (skin tone, nails, sleeves, accessories).'
        : 'Create one CharacterBible per character in [CHARACTERS], using the same ids (char_1, char_2, ...).';
  const user = [
    serializeBrief(brief, brand),
    '',
    '<approved_concept>',
    `title: ${concept.title}`,
    `angle: ${concept.angle}`,
    `coreMessage: ${concept.coreMessage}`,
    `emotion: ${concept.emotion}`,
    `visualIdentity: ${concept.visualIdentity}`,
    `storytelling: ${concept.storytelling}`,
    `openingHook: ${concept.openingHook}`,
    `closingCta: ${concept.closingCta}`,
    `rationale: ${concept.rationale}`,
    '</approved_concept>',
    '',
    'TASK (Call 2 — Script, Storyboard, Bibles):',
    `- Write exactly ${count} scenes (order 0..${count - 1}). Each durationSec is an integer ${MIN_SCENE_SEC}-${MAX_SCENE_SEC}; total = ${p.durationSec}.`,
    '- Scene 1 contains the hook. The last scene contains the CTA and the outro (' + outro + ').',
    '- Fill every scene field: title, purpose, visualDescription, characterIds, characterAction, environment, shot,',
    '  cameraMovement, lighting, transition, voiceOver, dialogue, sfxAmbient, textOverlay.',
    '  voiceOver in the script language; empty string if voice-over is disabled. dialogue empty unless characterDialogue = yes.',
    '  textOverlay is the CapCut overlay text (never rendered by the AI video).',
    '  shot/cameraMovement/lighting/environment/visualDescription/characterAction in English.',
    `- ${charHint}`,
    '  masterDescriptionEn: 60-120 words, English, fully self-contained (face, age, skin, hair/hijab, build, exact clothing colors, accessories, expression).',
    '- visualBible: productAppearanceEn must describe shape, size, colors, material, packaging, and logo in detail (English).',
    '  styleLineEn is ONE English sentence describing the visual style applied to every prompt.',
    '- script: hook, problem, productIntro, mainBenefit, closing, cta, full voiceOver, estimatedDurationSec, wordCount.',
    '- assumptions: list in Indonesian.',
    ...(imageCount > 0
      ? [
          `- ${imageCount} labeled reference image(s) are attached above. Base productAppearanceEn and each masterDescriptionEn on what you SEE in them`,
          '  (exact colors, shapes, logo placement, hair/hijab, clothing). If the text brief conflicts with an image, follow the image and note it in assumptions.',
        ]
      : []),
  ].join('\n');
  return {
    task: 'script_storyboard' as const,
    systemPrompt: buildSystemPrompt(brief),
    userPrompt: user,
    schema: ScriptStoryboardOutputSchema,
    temperature: TEMPERATURE.script,
    maxOutputTokens: MAX_OUTPUT_TOKENS.script,
    targetCount: count,
  };
}

export function mapScriptStoryboard(
  out: ScriptStoryboardOutput,
  brief: Brief,
  now: number,
): { script: ScriptDoc; scenes: Scene[]; bibles: BiblesDoc; assumptions: string[] } {
  const lang = brief.project.scriptLanguage;
  const scenes: Scene[] = [...out.scenes]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({
      ...s,
      id: `scene_${newShortId()}`,
      order: i,
      durationSec: Math.max(1, Math.round(s.durationSec)),
      voiceOver: brief.audio.voiceOver ? s.voiceOver : '',
      dialogue: brief.audio.characterDialogue ? s.dialogue : '',
      flowPrompts: { standard: '' },
      negativePrompt: '',
      approved: false,
      tracker: 'prompt_ready',
      versions: [],
      updatedAt: now,
    }));
  const characters = out.characterBibles.map((c, i) => {
    const src = brief.characters.list[i];
    return { ...c, referenceImages: src?.referenceImages ?? [] };
  });
  const vo = out.script.voiceOver || scenes.map((s) => s.voiceOver).join(' ');
  return {
    script: {
      ...out.script,
      voiceOver: vo,
      wordCount: countWords(vo),
      estimatedDurationSec: estimateSpokenSec(vo, lang),
      approved: false,
      updatedAt: now,
    },
    scenes,
    bibles: { characters, visual: out.visualBible, updatedAt: now },
    assumptions: out.assumptions,
  };
}
