import { PROMPT_WORDS } from '@/config/constants';
import { dialogueWordBudget } from '@/domain/wordBudget';
import { isFlowAssetsMode, locationForScene } from '@/domain/assets';
import type { AssetsDoc, BiblesDoc, Brief, Scene, ScriptLanguage, Variant } from '@/types';

/** Mode aset Flow: karakter/tempat/produk sudah dibuat di Flow, prompt scene cukup menyebut namanya. */
export const usesFlowAssets = isFlowAssetsMode;

/** Blok aset Flow: nama yang harus dipakai persis di prompt scene. */
export function assetsBlock(bibles: BiblesDoc, assets: AssetsDoc): string {
  const chars = assets.characters.length
    ? assets.characters
        .map((c) => {
          const b = bibles.characters.find((x) => x.id === c.id);
          return `- ${c.id}: Flow name "${c.flowName}" — outfit anchor: ${b?.clothing || '-'}`;
        })
        .join('\n')
    : '- (no characters; product-only)';
  const locs = assets.locations.map((l) => `- ${l.id}: Flow name "${l.flowName}" — ${l.description}`).join('\n');
  const v = bibles.visual;
  return [
    '<flow_assets note="These characters, locations and product ALREADY EXIST in Google Flow as reusable assets.">',
    'Characters:',
    chars,
    'Locations:',
    locs || '- (none)',
    `Product: ${assets.product ? `Flow name "${assets.product.flowName}"` : '(none)'}`,
    '</flow_assets>',
    '<visual_bible>',
    `lightingStyle: ${v.lightingStyle}`,
    `cinematography: ${v.cinematography}`,
    `cameraMovementStyle: ${v.cameraMovementStyle}`,
    `styleLineEn: ${v.styleLineEn}`,
    `restrictions: ${v.restrictions}`,
    '</visual_bible>',
  ].join('\n');
}

/** Konteks Bible untuk panggilan prompt scene, sesuai mode penyebutan karakter. */
export function sceneContextBlock(brief: Brief, bibles: BiblesDoc, assets?: AssetsDoc | null): string {
  return usesFlowAssets(brief, assets) ? assetsBlock(bibles, assets!) : biblesBlock(bibles);
}

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

/** `lang` diisi agar batas kata dialog per scene ikut dikirim. */
export function sceneBlock(s: Scene, index: number, assets?: AssetsDoc | null, lang?: ScriptLanguage): string {
  const loc = assets ? locationForScene(s, assets) : null;
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
    ...(loc ? [`  location asset: "${loc.flowName}"`] : []),
    `  shot: ${s.shot}`,
    `  cameraMovement: ${s.cameraMovement}`,
    `  lighting: ${s.lighting}`,
    `  transition: ${s.transition}`,
    `  dialogue: ${s.dialogue || '(none)'}`,
    ...(lang && s.dialogue ? [`  dialogueMaxWords: ${dialogueWordBudget(s.durationSec, lang)}`] : []),
    `  sfxAmbient: ${s.sfxAmbient}`,
  ].join('\n');
}

/** Kalimat penutup setiap prompt scene: satu klip = satu shot tanpa potongan (panduan Gemini Omni). */
export const CONTINUOUS_SHOT = 'One continuous shot, no jump cuts.';
const AUDIO_SLOT = 'Audio: {ambience + SFX}.';

/** Aturan baris "Audio:" (v1.5). Omni membuat suara sendiri; musik dan VO ditambahkan di CapCut. */
export function audioRules(brief: Brief): string[] {
  const speech = brief.audio.characterDialogue
    ? ''
    : brief.audio.voiceOver
      ? ' Then add "No dialogue, no narration." (the voice-over is added in editing).'
      : ' Then add "No dialogue, no narration."';
  return [
    `- Audio: write ONE sentence starting with "Audio:" that describes the ambience and sound effects of this moment from the scene sfxAmbient (e.g. "Audio: soft street ambience, the click of a cash drawer."). End it with "No background music." because music is added in editing.${speech}`,
    `- Write "${CONTINUOUS_SHOT}" right before the aspect ratio. One scene = one clip = one shot; never describe cuts, scene changes or multiple shots inside one prompt.`,
  ];
}

/** Aturan prompt Omni Extend (v1.5): hanya untuk scene yang menyambung langsung dari scene sebelumnya. */
export function extendRules(brief: Brief): string[] {
  return [
    '',
    'EXTEND PROMPT (optional, Google Flow "Extend" with Gemini Omni continues the clip of the previous scene):',
    '- extendPrompt: write it ONLY when this scene is not scene 1 AND continues directly from the previous scene with no cut: same place, same characters, continuous action (e.g. she keeps walking to the counter). Otherwise omit it.',
    '- Describe ONLY what happens next: the action and one camera movement, 25-60 words, English. Do not re-describe characters, setting or style; the clip already shows them.',
    `- ${brief.audio.characterDialogue ? 'Include the scene dialogue line if any (same format as the main prompt). ' : ''}End with the same "Audio:" sentence and "${CONTINUOUS_SHOT}". No aspect ratio, no on-screen text.`,
  ];
}

/** Instruksi format prompt Flow (23.5). Mode aset Flow memakai format pendek berbasis nama. */
export function promptFormatRules(brief: Brief, variants: Variant[], assets?: AssetsDoc | null): string {
  if (usesFlowAssets(brief, assets)) return flowAssetRules(brief, variants);
  const [min, max] = PROMPT_WORDS[brief.output.promptLength];
  const dialogue = brief.audio.characterDialogue
    ? '- Dialogue is ENABLED: include `The character says in Indonesian: "<line>".` using the scene dialogue (at most dialogueMaxWords words of that scene; shorten if longer).'
    : '- Dialogue is DISABLED: do not include any spoken lines in the prompt.';
  const extra = variants.filter((v) => v !== 'standard');
  return [
    'FLOW PROMPT FORMAT (one English paragraph, in this order):',
    '{subject + FULL character master description} {action}. Setting: {environment}. {composition}, {camera shot}, {camera movement}.',
    '{lighting}, {mood}. Visual style: {styleLineEn}. Product: {productAppearanceEn}.',
    '[Dialogue line only if enabled]',
    `Continuity: {restated character + product + palette details}. ${AUDIO_SLOT} ${CONTINUOUS_SHOT} Aspect ratio ${brief.project.aspectRatio}.`,
    '',
    `- Length: ${min}-${max} words per prompt.`,
    '- Paste the character MASTER DESCRIPTION in full for every character in the scene. Never write "same as previous scene".',
    '- Restate the product appearance in every prompt where the product is visible.',
    `- Always end with "Aspect ratio ${brief.project.aspectRatio}."`,
    '- Do not request on-screen text, captions, subtitles, title cards or text logos.',
    '- No contradictory directions (e.g. handheld + locked-off, day + night).',
    dialogue,
    ...audioRules(brief),
    '- negativePrompt: comma-separated list of things to avoid for this scene (English).',
    extra.length
      ? `- Also write variants: ${extra.map((v) => (v === 'cinematic' ? 'cinematic (filmic, dramatic camera moves, anamorphic feel)' : 'premium (high-end commercial polish, luxurious lighting, product hero shots)')).join('; ')}.`
      : '- Only write the standard prompt; leave cinematic and premium empty/omitted.',
    ...frameModeRules(brief),
  ].join('\n');
}

function variantRule(variants: Variant[]): string {
  const extra = variants.filter((v) => v !== 'standard');
  return extra.length
    ? `- Also write variants: ${extra.map((v) => (v === 'cinematic' ? 'cinematic (filmic, dramatic camera moves)' : 'premium (high-end commercial polish, product hero shots)')).join('; ')}.`
    : '- Only write the standard prompt; leave cinematic and premium empty/omitted.';
}

/** Format prompt scene bila karakter, tempat, dan produk sudah dibuat sebagai aset di Google Flow. */
function flowAssetRules(brief: Brief, variants: Variant[]): string {
  const ratio = brief.project.aspectRatio;
  const dialogue = brief.audio.characterDialogue
    ? '- Dialogue is ENABLED: add `<Flow character name> says in Indonesian: "<line>".` using the scene dialogue (at most dialogueMaxWords words of that scene; shorten if longer).'
    : '- Dialogue is DISABLED: do not include any spoken lines.';
  return [
    'FLOW PROMPT FORMAT — STORY SCENE using existing Flow assets (one English paragraph):',
    '{Flow character name(s)} {action}. Setting: {location Flow name}, {what is specific to this moment}. {camera shot}, {camera movement}.',
    `{lighting}, {mood}. Visual style: {styleLineEn}. [Product Flow name and what it does in the shot]. [Dialogue if enabled]. ${AUDIO_SLOT} ${CONTINUOUS_SHOT} Aspect ratio ${ratio}.`,
    '',
    '- Length: 40-90 words. Short, concrete and visual.',
    '- Refer to each character ONLY by its exact Flow name in quotes-free plain text (e.g. Bu Sari). Do NOT describe face, skin, hair, body or age again — the asset defines them.',
    '- You may add at most 8 words about the outfit only if it helps continuity (use the outfit anchor). Never change the outfit.',
    '- Refer to the setting by the scene\'s location asset name, then describe only the moment-specific details (what is on the counter, who else is around).',
    '- Refer to the product by its Flow name; describe what it does in this shot, not its full appearance.',
    '- One clear action per scene. One camera movement per scene. Mention every character that appears.',
    `- Always end with "Aspect ratio ${ratio}."`,
    '- Do not request on-screen text, captions, subtitles, title cards or text logos.',
    '- No contradictory directions (e.g. handheld + locked-off, day + night).',
    dialogue,
    ...audioRules(brief),
    '- negativePrompt: comma-separated list of things to avoid for this scene (English), include "different face", "changed outfit".',
    variantRule(variants),
    ...frameModeRules(brief),
  ].join('\n');
}

/** Aturan tambahan untuk mode Flow berbasis gambar (frame awal / frame awal-akhir). */
export function frameModeRules(brief: Brief): string[] {
  const mode = brief.output.flowMode;
  if (mode === 'text_to_video') return ['- Flow mode is text-to-video: omit startFrame and endFrame.'];
  const still = `a single STILL image prompt (English, 60-120 words) for an image generator: full character master description, full product appearance, setting, composition, lighting, visual style, aspect ratio ${brief.project.aspectRatio}. No motion words, no on-screen text.`;
  return [
    '',
    `FLOW MODE: ${mode === 'frames' ? 'start and end frames' : 'image-to-video'}.`,
    `- startFrame: ${still} It must show the exact first moment of the scene.`,
    mode === 'frames'
      ? `- endFrame: ${still} It must show the exact last moment of the scene, keeping the same character, outfit, product and setting.`
      : '- Omit endFrame.',
    '- In this mode the Flow prompt (standard/variants) focuses on MOTION from the start frame: action, camera movement, timing and mood. Still restate the character and product briefly for continuity and end with the aspect ratio.',
  ];
}
