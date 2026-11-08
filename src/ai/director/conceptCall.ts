import { MAX_OUTPUT_TOKENS, TEMPERATURE } from '@/config/constants';
import { ConceptCallOutputSchema } from '@/schemas/concept.schema';
import { newShortId } from '@/lib/ids';
import type { Brand, Brief, ConceptCallOutput, ConceptRound } from '@/types';
import { serializeBrief } from './briefSerializer';
import { buildSystemPrompt } from './systemPrompts';

export function buildConceptCall(brief: Brief, brand?: Brand | null) {
  const n = brief.strategy.conceptAlternatives;
  const user = [
    serializeBrief(brief, brand),
    '',
    'TASK (Call 1 — Strategy and Concepts):',
    '1. Write a short product and market analysis in Indonesian (analysis.product, analysis.market).',
    '2. Decide the strongest campaign angle and explain why in Indonesian (analysis.strongestAngle).',
    `3. Produce EXACTLY ${n} concept(s) that are genuinely different (different angle or hook).`,
    '   Each concept: title, angle (enum), coreMessage, emotion, visualIdentity, storytelling, openingHook,',
    '   closingCta, recommendedSceneCount (integer, respecting [COMPUTED] minSceneCount and max 8s per scene), rationale.',
    '   All concept text in Indonesian.',
    '4. List any assumptions you made for missing data in assumptions (Indonesian).',
  ].join('\n');
  return {
    task: 'concepts' as const,
    systemPrompt: buildSystemPrompt(brief),
    userPrompt: user,
    schema: ConceptCallOutputSchema,
    temperature: TEMPERATURE.concepts,
    maxOutputTokens: MAX_OUTPUT_TOKENS.concepts,
  };
}

export function toConceptRound(out: ConceptCallOutput, brief: Brief, now: number): ConceptRound {
  return {
    id: `round_${newShortId()}`,
    createdAt: now,
    analysis: out.analysis,
    concepts: out.concepts.slice(0, brief.strategy.conceptAlternatives).map((c) => ({
      ...c,
      id: `concept_${newShortId()}`,
      recommendedSceneCount: Math.max(1, Math.round(c.recommendedSceneCount)),
    })),
    assumptions: out.assumptions,
  };
}
