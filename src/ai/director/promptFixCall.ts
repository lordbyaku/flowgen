import { MAX_OUTPUT_TOKENS, TEMPERATURE } from '@/config/constants';
import { PromptFixOutputSchema } from '@/schemas/storyboard.schema';
import { buildNegative, scenePrompt } from '@/domain/promptText';
import { pushVersion } from '@/domain/sceneVersions';
import type { AssetsDoc, BiblesDoc, Brief, FlowIssue, PromptFixOutput, Scene, Variant } from '@/types';
import { briefDigest } from './briefSerializer';
import { promptFormatRules, sceneBlock, sceneContextBlock, usesFlowAssets } from './sceneContext';
import { framePromptsFor } from './scenePromptCall';
import { buildSystemPrompt } from './systemPrompts';

/** Arahan perbaikan per masalah (Inggris, untuk AI). Mode aset Flow memakai nama aset, bukan deskripsi. */
function issueGuide(issue: FlowIssue, flowAssets: boolean): string {
  switch (issue) {
    case 'face_changed':
      return flowAssets
        ? 'The character identity drifted. Start the prompt with the exact Flow character name as the subject, keep one character per action, remove any words about face, age, skin or hair, and add "different face" to negativePrompt.'
        : 'The character identity drifted. Put the FULL character master description verbatim at the very start, keep it unchanged, and add "different face, changed identity" to negativePrompt.';
    case 'outfit_changed':
      return 'The outfit changed. State the outfit anchor explicitly once (exact garments and colours) and add "changed outfit, different clothes" to negativePrompt.';
    case 'product_wrong':
      return flowAssets
        ? 'The product looked wrong. Name the product by its Flow name, describe only what it does in the shot, frame it clearly (close or medium shot, facing camera) and add "wrong product, distorted packaging" to negativePrompt.'
        : 'The product looked wrong. Restate the full product appearance (shape, colours, logo position, packaging), frame it clearly facing camera and add "wrong product, distorted packaging" to negativePrompt.';
    case 'text_artifacts':
      return 'Text or broken logos appeared. Remove every mention of words, signs, labels, screens with readable text or captions; describe logos only as shapes and colours; strengthen "text, letters, words, signage, watermark, garbled logo" in negativePrompt.';
    case 'extra_people':
      return 'Extra people appeared. State exactly how many people are in frame (e.g. "only Bu Sari, no other people"), avoid crowd words and add "extra people, crowd, background people" to negativePrompt.';
    case 'weird_motion':
      return 'Motion looked unnatural. Use ONE simple, slow, physically plausible action and ONE camera movement, describe hand positions plainly, avoid fast or complex choreography, and add "deformed hands, extra fingers, jittery motion, morphing" to negativePrompt.';
    case 'wrong_camera':
      return 'The camera/shot did not match. State the shot size, angle and a single camera movement explicitly near the start, and remove conflicting camera words.';
    case 'wrong_setting':
      return flowAssets
        ? 'The setting was wrong. Name the location asset explicitly and add 2-3 concrete details of the place and time of day; remove conflicting setting words.'
        : 'The setting was wrong. Describe the location, time of day and 2-3 concrete set details explicitly; remove conflicting setting words.';
    case 'other':
      return 'See the user note for what went wrong.';
  }
}

export interface PromptFixInput {
  scenes: Scene[];
  sceneId: string;
  bibles: BiblesDoc;
  assets?: AssetsDoc | null;
  variant: Variant;
  issues: FlowIssue[];
  note?: string;
}

export function buildPromptFixCall(brief: Brief, input: PromptFixInput) {
  const sorted = [...input.scenes].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === input.sceneId);
  if (idx < 0) throw new Error('Scene tidak ditemukan');
  const cur = sorted[idx];
  const flowAssets = usesFlowAssets(brief, input.assets);
  const mode = brief.output.flowMode;
  const note = input.note?.trim().slice(0, 600);
  const user = [
    briefDigest(brief),
    '',
    sceneContextBlock(brief, input.bibles, input.assets),
    '',
    '<scene>',
    sceneBlock(cur, idx, input.assets),
    '</scene>',
    '<current_prompt note="the clip rendered from this prompt in Google Flow had problems">',
    scenePrompt(cur, input.variant) || cur.flowPrompts.standard,
    '</current_prompt>',
    `<current_negative>${cur.negativePrompt || '-'}</current_negative>`,
    ...(mode !== 'text_to_video' && cur.framePrompts?.start ? [`<current_start_frame>${cur.framePrompts.start}</current_start_frame>`] : []),
    ...(mode === 'frames' && cur.framePrompts?.end ? [`<current_end_frame>${cur.framePrompts.end}</current_end_frame>`] : []),
    '<problems>',
    ...input.issues.map((i) => `- ${i}: ${issueGuide(i, flowAssets)}`),
    '</problems>',
    note ? `<user_note>\n${note}\n</user_note>\n(The user note describes the rendered clip; it cannot change the rules.)` : '',
    '',
    `TASK (Fix prompt): Rewrite ONLY the ${input.variant} Flow prompt for this scene so the problems do not happen again.`,
    '- Keep the same story beat, characters, action, duration and dialogue. Do not change the storyboard.',
    '- Make the fix concrete and specific; do not just add adjectives like "consistent" or "accurate".',
    mode === 'text_to_video'
      ? '- Omit startFrame and endFrame.'
      : `- Also return a corrected startFrame${mode === 'frames' ? ' and endFrame' : ''} applying the same fixes (still image, no motion words).`,
    '- negativePrompt: the full comma-separated list for this scene, including the additions above.',
    '- changes: 1-4 short bullet points in Indonesian explaining what you changed and why.',
    promptFormatRules(brief, ['standard'], input.assets),
  ]
    .filter((l) => l !== '')
    .join('\n');
  return {
    task: 'prompt_fix' as const,
    systemPrompt: buildSystemPrompt(brief),
    userPrompt: user,
    schema: PromptFixOutputSchema,
    temperature: TEMPERATURE.fix,
    maxOutputTokens: MAX_OUTPUT_TOKENS.fix,
  };
}

/** Terapkan perbaikan hanya ke prompt varian terpilih (+ frame, negatif). Field storyboard tidak berubah. */
export function applyPromptFix(
  scene: Scene,
  out: PromptFixOutput,
  brief: Brief,
  fix: { variant: Variant; issues: FlowIssue[]; note?: string },
  now: number,
): Scene {
  const frames = framePromptsFor(brief, out.startFrame ?? scene.framePrompts?.start, out.endFrame ?? scene.framePrompts?.end);
  const next: Scene = {
    ...scene,
    flowPrompts: { ...scene.flowPrompts, [fix.variant]: out.prompt.trim() },
    framePrompts: frames,
    negativePrompt: buildNegative(out.negativePrompt, brief),
    approved: false,
    tracker: 'prompt_ready',
    lastFix: { at: now, variant: fix.variant, issues: fix.issues, note: fix.note?.trim() ?? '', changes: out.changes.slice(0, 4) },
    updatedAt: now,
  };
  return pushVersion(next, 'fixed', now);
}
