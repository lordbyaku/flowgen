import type { z } from 'zod';
import type * as C from '@/config/enums';
import type { BriefSchema, CharacterInputSchema } from '@/schemas/brief.schema';
import type { ReferenceImageSchema } from '@/schemas/common';
import type {
  AnalysisSchema,
  ConceptCallOutputSchema,
  ConceptRoundSchema,
  ConceptSchema,
  CreativeDocSchema,
} from '@/schemas/concept.schema';
import type { ScriptDocSchema } from '@/schemas/script.schema';
import type { BiblesDocSchema, CharacterBibleSchema, VisualBibleSchema } from '@/schemas/bible.schema';
import type { SceneDraftSchema, SceneSchema, SceneVersionSchema, ScenesDocSchema } from '@/schemas/scene.schema';
import type {
  BriefAssistOutputSchema,
  ScenePromptItemSchema,
  SceneRegenOutputSchema,
  ScriptStoryboardOutputSchema,
} from '@/schemas/storyboard.schema';
import type { CapcutDocSchema, CapcutGuideSchema } from '@/schemas/capcut.schema';
import type {
  BrandSchema,
  BriefTemplateSchema,
  ProjectSchema,
  PromptSnippetSchema,
  UserPreferencesSchema,
} from '@/schemas/project.schema';
import type { LocalKeySchema, UsageLogSchema, VaultMetaSchema } from '@/schemas/key.schema';

export type Objective = (typeof C.OBJECTIVES)[number];
export type Platform = (typeof C.PLATFORMS)[number];
export type AspectRatio = (typeof C.ASPECT_RATIOS)[number];
export type ScriptLanguage = (typeof C.SCRIPT_LANGUAGES)[number];
export type ProductType = (typeof C.PRODUCT_TYPES)[number];
export type Angle = (typeof C.ANGLES)[number];
export type HookStyle = (typeof C.HOOK_STYLES)[number];
export type CharacterMode = (typeof C.CHARACTER_MODES)[number];
export type TrackerStatus = (typeof C.TRACKER_STATUSES)[number];
export type KeyStatus = (typeof C.KEY_STATUSES)[number];
export type AiTask = (typeof C.AI_TASKS)[number];
export type Variant = (typeof C.VARIANTS)[number];
export type Routing = (typeof C.ROUTINGS)[number];
export type VaultMode = (typeof C.VAULT_MODES)[number];

export type ReferenceImage = z.infer<typeof ReferenceImageSchema>;
export type Brief = z.infer<typeof BriefSchema>;
export type CharacterInput = z.infer<typeof CharacterInputSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type ConceptRound = z.infer<typeof ConceptRoundSchema>;
export type CreativeDoc = z.infer<typeof CreativeDocSchema>;
export type ConceptCallOutput = z.infer<typeof ConceptCallOutputSchema>;
export type ScriptDoc = z.infer<typeof ScriptDocSchema>;
export type CharacterBible = z.infer<typeof CharacterBibleSchema>;
export type VisualBible = z.infer<typeof VisualBibleSchema>;
export type BiblesDoc = z.infer<typeof BiblesDocSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SceneDraft = z.infer<typeof SceneDraftSchema>;
export type SceneVersion = z.infer<typeof SceneVersionSchema>;
export type ScenesDoc = z.infer<typeof ScenesDocSchema>;
export type ScriptStoryboardOutput = z.infer<typeof ScriptStoryboardOutputSchema>;
export type ScenePromptItem = z.infer<typeof ScenePromptItemSchema>;
export type SceneRegenOutput = z.infer<typeof SceneRegenOutputSchema>;
export type BriefAssistOutput = z.infer<typeof BriefAssistOutputSchema>;
export type BriefAssistQuestion = BriefAssistOutput['questions'][number];
export type CapcutGuide = z.infer<typeof CapcutGuideSchema>;
export type CapcutDoc = z.infer<typeof CapcutDocSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type BriefTemplate = z.infer<typeof BriefTemplateSchema>;
export type PromptSnippet = z.infer<typeof PromptSnippetSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type LocalKey = z.infer<typeof LocalKeySchema>;
export type UsageLog = z.infer<typeof UsageLogSchema>;
export type VaultMeta = z.infer<typeof VaultMetaSchema>;

/** Tampilan key untuk UI: tanpa cipher. */
export type KeyView = Omit<LocalKey, 'cipher'>;

export type DocName = 'creative' | 'script' | 'bibles' | 'scenes' | 'capcut';

export interface ProjectDocs {
  creative: CreativeDoc | null;
  script: ScriptDoc | null;
  bibles: BiblesDoc | null;
  scenes: ScenesDoc | null;
  capcut: CapcutDoc | null;
}

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export type AppErrorCode =
  | 'validation'
  | 'auth'
  | 'model_not_found'
  | 'quota_daily'
  | 'rate_limit'
  | 'server'
  | 'network'
  | 'blocked'
  | 'truncated'
  | 'invalid_json'
  | 'aborted'
  | 'no_eligible_key'
  | 'vault_locked'
  | 'brief_incomplete'
  | 'unknown';

export interface AppError {
  code: AppErrorCode;
  /** Pesan Indonesia untuk pengguna. Sudah disanitasi (tanpa key). */
  message: string;
  httpStatus?: number;
  retryAt?: number;
  projectLabel?: string;
  /** Teks mentah keluaran AI (untuk panel Lihat output mentah). */
  rawOutput?: string;
}

export type ProgressPhase = 'selecting_key' | 'requesting' | 'parsing' | 'validating' | 'repairing' | 'saving';
export type ProgressFn = (phase: ProgressPhase, detail?: string) => void;
