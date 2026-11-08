import { z } from 'zod';
import { AngleSchema } from './common';

export const ConceptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  angle: AngleSchema,
  coreMessage: z.string(),
  emotion: z.string(),
  visualIdentity: z.string(),
  storytelling: z.string(),
  openingHook: z.string(),
  closingCta: z.string(),
  recommendedSceneCount: z.number().int().min(1).max(60),
  rationale: z.string(),
});

export const AnalysisSchema = z.object({
  product: z.string(),
  market: z.string(),
  strongestAngle: z.string(),
});

export const ConceptRoundSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  analysis: AnalysisSchema,
  concepts: z.array(ConceptSchema),
  assumptions: z.array(z.string()),
});

export const CreativeDocSchema = z.object({
  analysis: AnalysisSchema,
  concepts: z.array(ConceptSchema),
  assumptions: z.array(z.string()).default([]),
  selectedConceptId: z.string().optional(),
  approved: z.boolean(),
  /** Riwayat ronde konsep sebelumnya (maks 3, terbaru di depan). */
  history: z.array(ConceptRoundSchema).default([]),
  updatedAt: z.number().default(0),
});

/** Keluaran Panggilan 1 (dikirim sebagai responseSchema). */
export const ConceptCallOutputSchema = z.object({
  analysis: AnalysisSchema.describe('Indonesian. Short product & market analysis.'),
  concepts: z
    .array(
      z.object({
        title: z.string(),
        angle: AngleSchema,
        coreMessage: z.string(),
        emotion: z.string(),
        visualIdentity: z.string(),
        storytelling: z.string(),
        openingHook: z.string(),
        closingCta: z.string(),
        recommendedSceneCount: z.number().int(),
        rationale: z.string(),
      }),
    )
    .min(1)
    .max(3),
  assumptions: z.array(z.string()),
});
