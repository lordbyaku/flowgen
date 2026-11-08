import { z } from 'zod';

export const ScriptDocSchema = z.object({
  hook: z.string(),
  problem: z.string(),
  productIntro: z.string(),
  mainBenefit: z.string(),
  closing: z.string(),
  cta: z.string(),
  voiceOver: z.string(),
  estimatedDurationSec: z.number().min(0),
  wordCount: z.number().int().min(0),
  approved: z.boolean(),
  updatedAt: z.number().default(0),
});

export const ScriptAiSchema = ScriptDocSchema.omit({ approved: true, updatedAt: true });
