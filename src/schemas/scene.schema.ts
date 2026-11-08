import { z } from 'zod';
import { TrackerStatusSchema } from './common';

export const FlowPromptsSchema = z.object({
  standard: z.string(),
  cinematic: z.string().optional(),
  premium: z.string().optional(),
});

/** Prompt gambar frame awal/akhir (mode Gambar ke video / Frame awal-akhir). */
export const FramePromptsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

export const SceneVersionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  /** Snapshot lengkap scene (Fase 2: pulihkan seluruh scene, bukan hanya prompt). */
  snapshot: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  reason: z.enum(['generated', 'edited', 'regenerated']),
});

export const SceneSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  title: z.string(),
  durationSec: z.number().int().min(1).max(60),
  purpose: z.string(),
  visualDescription: z.string(),
  characterIds: z.array(z.string()),
  characterAction: z.string(),
  environment: z.string(),
  shot: z.string(),
  cameraMovement: z.string(),
  lighting: z.string(),
  transition: z.string(),
  voiceOver: z.string(),
  dialogue: z.string(),
  sfxAmbient: z.string(),
  /** Hanya untuk CapCut; tidak pernah diminta dari AI video. */
  textOverlay: z.string(),
  flowPrompts: FlowPromptsSchema,
  framePrompts: FramePromptsSchema.optional(),
  negativePrompt: z.string(),
  approved: z.boolean(),
  tracker: TrackerStatusSchema,
  trackerNote: z.string().optional(),
  versions: z.array(SceneVersionSchema).max(5),
  updatedAt: z.number(),
});

export const ScenesDocSchema = z.object({
  items: z.array(SceneSchema),
  updatedAt: z.number().default(0),
});

/** Scene dari Panggilan 2 (tanpa prompt, tracker, versi). */
export const SceneDraftSchema = z.object({
  order: z.number().int(),
  title: z.string(),
  durationSec: z.number().int(),
  purpose: z.string(),
  visualDescription: z.string(),
  characterIds: z.array(z.string()),
  characterAction: z.string(),
  environment: z.string(),
  shot: z.string(),
  cameraMovement: z.string(),
  lighting: z.string(),
  transition: z.string(),
  voiceOver: z.string(),
  dialogue: z.string(),
  sfxAmbient: z.string(),
  textOverlay: z.string(),
});
