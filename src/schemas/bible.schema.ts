import { z } from 'zod';
import { ReferenceImageSchema } from './common';

export const CharacterBibleSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  genderPresentation: z.string(),
  approxAge: z.string(),
  appearance: z.string(),
  hair: z.string(),
  clothing: z.string(),
  accessories: z.string(),
  personality: z.string(),
  referenceImages: z.array(ReferenceImageSchema).default([]),
  restrictions: z.string(),
  /** 60–120 kata, Inggris, mandiri. Disisipkan LENGKAP ke setiap prompt. */
  masterDescriptionEn: z.string(),
});

export const VisualBibleSchema = z.object({
  artDirection: z.string(),
  palette: z.array(z.string()),
  lightingStyle: z.string(),
  cinematography: z.string(),
  environmentDesign: z.string(),
  lensPreference: z.string(),
  cameraMovementStyle: z.string(),
  productAppearanceEn: z.string(),
  restrictions: z.string(),
  styleLineEn: z.string(),
});

export const BiblesDocSchema = z.object({
  characters: z.array(CharacterBibleSchema),
  visual: VisualBibleSchema,
  updatedAt: z.number().default(0),
});

export const CharacterBibleAiSchema = CharacterBibleSchema.omit({ referenceImages: true });

export const EMPTY_VISUAL_BIBLE: z.infer<typeof VisualBibleSchema> = {
  artDirection: '',
  palette: [],
  lightingStyle: '',
  cinematography: '',
  environmentDesign: '',
  lensPreference: '',
  cameraMovementStyle: '',
  productAppearanceEn: '',
  restrictions: '',
  styleLineEn: '',
};
