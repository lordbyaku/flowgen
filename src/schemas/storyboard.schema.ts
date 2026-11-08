import { z } from 'zod';
import { ScriptAiSchema } from './script.schema';
import { SceneDraftSchema, FlowPromptsSchema } from './scene.schema';
import { CharacterBibleAiSchema, VisualBibleSchema } from './bible.schema';
import { CapcutGuideSchema } from './capcut.schema';

/** Keluaran Panggilan 2. */
export const ScriptStoryboardOutputSchema = z.object({
  script: ScriptAiSchema,
  scenes: z.array(SceneDraftSchema).min(1),
  characterBibles: z.array(CharacterBibleAiSchema),
  visualBible: VisualBibleSchema,
  assumptions: z.array(z.string()),
});

export const ScenePromptItemSchema = z.object({
  sceneId: z.string(),
  standard: z.string(),
  cinematic: z.string().optional(),
  premium: z.string().optional(),
  negativePrompt: z.string(),
});

/** Keluaran Panggilan 3 (batch non-terakhir). */
export const ScenePromptsBatchSchema = z.object({
  prompts: z.array(ScenePromptItemSchema).min(1),
});

/** Keluaran Panggilan 3 (batch terakhir, termasuk panduan CapCut). */
export const ScenePromptsFinalSchema = z.object({
  prompts: z.array(ScenePromptItemSchema).min(1),
  capcut: CapcutGuideSchema,
});

/** Keluaran regenerasi satu scene. */
export const SceneRegenOutputSchema = z.object({
  scene: SceneDraftSchema,
  flowPrompts: FlowPromptsSchema,
  negativePrompt: z.string(),
});

/** Keluaran AI Brief Assistant. */
export const BriefAssistOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        fieldPath: z.string(),
        question: z.string(),
        suggestedOptions: z.array(z.string()),
      }),
    )
    .max(5),
});
