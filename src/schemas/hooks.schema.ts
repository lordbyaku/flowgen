import { z } from 'zod';
import { HookStyleSchema, TrackerStatusSchema } from './common';
import { FramePromptsSchema } from './scene.schema';

/**
 * Varian hook (v1.4): scene pembuka alternatif. Badan video sama; di CapCut scene 1 diganti per varian
 * sehingga satu produksi menghasilkan beberapa video untuk diuji.
 */
const HookCoreSchema = z.object({
  hookStyle: HookStyleSchema,
  title: z.string(),
  visualDescription: z.string(),
  characterAction: z.string(),
  voiceOver: z.string(),
  textOverlay: z.string(),
  flowPrompt: z.string(),
  negativePrompt: z.string(),
  rationale: z.string(),
});

/** Keluaran panggilan `hook_variants`. */
export const HookVariantsOutputSchema = z.object({
  hooks: z
    .array(HookCoreSchema.extend({ startFrame: z.string().optional(), endFrame: z.string().optional() }))
    .min(1)
    .max(3),
});

export const HookVariantSchema = HookCoreSchema.extend({
  id: z.string().min(1),
  framePrompts: FramePromptsSchema.optional(),
  tracker: TrackerStatusSchema,
  updatedAt: z.number(),
});

export const HooksDocSchema = z.object({
  /** Scene pembuka yang menjadi dasar varian (untuk mendeteksi storyboard yang berubah). */
  baseSceneId: z.string(),
  items: z.array(HookVariantSchema).max(6),
  updatedAt: z.number().default(0),
});
