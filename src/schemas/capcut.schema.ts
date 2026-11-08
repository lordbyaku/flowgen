import { z } from 'zod';

export const CapcutGuideSchema = z.object({
  sceneOrder: z.array(z.string()),
  timeline: z.array(
    z.object({ scene: z.number().int(), startSec: z.number(), endSec: z.number(), note: z.string() }),
  ),
  voiceOverSequence: z.array(z.string()),
  musicMood: z.string(),
  sfx: z.array(z.string()),
  transitions: z.array(z.string()),
  rhythm: z.string(),
  textOverlays: z.array(
    z.object({
      scene: z.number().int(),
      text: z.string(),
      position: z.string(),
      style: z.string(),
      startSec: z.number(),
      endSec: z.number(),
    }),
  ),
  opening: z.string(),
  closing: z.string(),
});

export const CapcutDocSchema = CapcutGuideSchema.extend({
  updatedAt: z.number().default(0),
  /** Checklist ekspor CapCut (Fase 2). */
  checklist: z.record(z.boolean()).default({}),
});
