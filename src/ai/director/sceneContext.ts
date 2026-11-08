import { PROMPT_WORDS } from '@/config/constants';
import type { BiblesDoc, Brief, Scene, Variant } from '@/types';

export function biblesBlock(bibles: BiblesDoc): string {
  const chars = bibles.characters.length
    ? bibles.characters
        .map((c) => `- ${c.id} (${c.name}): MASTER DESCRIPTION = "${c.masterDescriptionEn}"`)
        .join('\n')
    : '- (no characters; product-only)';
  const v = bibles.visual;
  return [
    '<character_bible>',
    chars,
    '</character_bible>',
    '<visual_bible>',
    `artDirection: ${v.artDirection}`,
    `palette: ${v.palette.join(', ')}`,
    `lightingStyle: ${v.lightingStyle}`,
    `cinematography: ${v.cinematography}`,
    `environmentDesign: ${v.environmentDesign}`,
    `lensPreference: ${v.lensPreference}`,
    `cameraMovementStyle: ${v.cameraMovementStyle}`,
    `productAppearanceEn: ${v.productAppearanceEn}`,
    `styleLineEn: ${v.styleLineEn}`,
    `restrictions: ${v.restrictions}`,
    '</visual_bible>',
  ].join('\n');
}

export function sceneBlock(s: Scene, index: number): string {
  return [
    `- sceneId: ${s.id}`,
    `  number: ${index + 1}`,
    `  title: ${s.title}`,
    `  durationSec: ${s.durationSec}`,
    `  purpose: ${s.purpose}`,
    `  visualDescription: ${s.visualDescription}`,
    `  characterIds: ${s.characterIds.join(', ') || '(none)'}`,
    `  characterAction: ${s.characterAction}`,
    `  environment: ${s.environment}`,
    `  shot: ${s.shot}`,
    `  cameraMovement: ${s.cameraMovement}`,
    `  lighting: ${s.lighting}`,
    `  transition: ${s.transition}`,
    `  dialogue: ${s.dialogue || '(none)'}`,
    `  sfxAmbient: ${s.sfxAmbient}`,
  ].join('\n');
}

/** Instruksi format prompt Flow (23.5). */
export function promptFormatRules(brief: Brief, variants: Variant[]): string {
  const [min, max] = PROMPT_WORDS[brief.output.promptLength];
  const dialogue = brief.audio.characterDialogue
    ? '- Dialogue is ENABLED: include `The character says in Indonesian: "<line>".` using the scene dialogue (max ~18 words).'
    : '- Dialogue is DISABLED: do not include any spoken lines in the prompt.';
  const extra = variants.filter((v) => v !== 'standard');
  return [
    'FLOW PROMPT FORMAT (one English paragraph, in this order):',
    '{subject + FULL character master description} {action}. Setting: {environment}. {composition}, {camera shot}, {camera movement}.',
    '{lighting}, {mood}. Visual style: {styleLineEn}. Product: {productAppearanceEn}.',
    '[Dialogue line only if enabled]',
    `Continuity: {restated character + product + palette details}. Aspect ratio ${brief.project.aspectRatio}.`,
    '',
    `- Length: ${min}-${max} words per prompt.`,
    '- Paste the character MASTER DESCRIPTION in full for every character in the scene. Never write "same as previous scene".',
    '- Restate the product appearance in every prompt where the product is visible.',
    `- Always end with "Aspect ratio ${brief.project.aspectRatio}."`,
    '- Do not request on-screen text, captions, subtitles, title cards or text logos.',
    '- No contradictory directions (e.g. handheld + locked-off, day + night).',
    dialogue,
    '- negativePrompt: comma-separated list of things to avoid for this scene (English).',
    extra.length
      ? `- Also write variants: ${extra.map((v) => (v === 'cinematic' ? 'cinematic (filmic, dramatic camera moves, anamorphic feel)' : 'premium (high-end commercial polish, luxurious lighting, product hero shots)')).join('; ')}.`
      : '- Only write the standard prompt; leave cinematic and premium empty/omitted.',
  ].join('\n');
}
