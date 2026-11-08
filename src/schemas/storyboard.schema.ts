import { z } from 'zod';
import { ScriptAiSchema } from './script.schema';
import { SceneDraftSchema, FlowPromptsSchema, FramePromptsSchema } from './scene.schema';
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
  startFrame: z.string().optional(),
  endFrame: z.string().optional(),
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
  framePrompts: FramePromptsSchema.optional(),
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

/** Skema kecil untuk tombol "Uji skema JSON" (meniru fitur skema yang dipakai panggilan asli). */
export const SchemaTestSchema = z.object({
  title: z.string(),
  angle: z.enum(['demo', 'pov', 'problem_solution']),
  sceneCount: z.number().int(),
  scenes: z.array(z.object({ order: z.number().int(), summary: z.string() })).min(1),
  note: z.string().optional(),
});
