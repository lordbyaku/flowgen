import { z } from 'zod';
import * as E from '@/config/enums';

export const ObjectiveSchema = z.enum(E.OBJECTIVES);
export const PlatformSchema = z.enum(E.PLATFORMS);
export const AspectRatioSchema = z.enum(E.ASPECT_RATIOS);
export const ScriptLanguageSchema = z.enum(E.SCRIPT_LANGUAGES);
export const ProductTypeSchema = z.enum(E.PRODUCT_TYPES);
export const AngleSchema = z.enum(E.ANGLES);
export const HookStyleSchema = z.enum(E.HOOK_STYLES);
export const RealismSchema = z.enum(E.REALISMS);
export const CreativeStyleSchema = z.enum(E.CREATIVE_STYLES);
export const ToneSchema = z.enum(E.TONES);
export const PacingSchema = z.enum(E.PACINGS);
export const CameraStyleSchema = z.enum(E.CAMERA_STYLES);
export const CharacterModeSchema = z.enum(E.CHARACTER_MODES);
export const TrackerStatusSchema = z.enum(E.TRACKER_STATUSES);
export const KeyStatusSchema = z.enum(E.KEY_STATUSES);
export const AiTaskSchema = z.enum(E.AI_TASKS);
export const VariantSchema = z.enum(E.VARIANTS);

/** String bebas; kosong diperbolehkan (kelengkapan dihitung terpisah). */
export const Text = z.string().max(4000);
export const ShortText = z.string().max(400);

export const ReferenceImageSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['url', 'local']),
  url: z.string().url('URL tidak valid').optional(),
  localId: z.string().optional(),
  note: z.string().max(300).optional(),
});
