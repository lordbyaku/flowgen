import { z } from 'zod';

/**
 * Aset Flow (v1.3): karakter, tempat, dan produk dibuat DULU di Google Flow (gambar referensi /
 * karakter Flow), baru kemudian scene (story). Prompt aset disusun deterministik dari Bible dan
 * dapat diedit pengguna.
 */
export const CharacterAssetSchema = z.object({
  /** ID Character Bible (mis. char_1). */
  id: z.string(),
  name: z.string(),
  /** Nama yang dipakai di Flow, disebut apa adanya di prompt scene. */
  flowName: z.string(),
  fullBodyPrompt: z.string(),
  closeUpPrompt: z.string(),
  done: z.boolean(),
  edited: z.boolean().default(false),
});

export const LocationAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  flowName: z.string(),
  /** Deskripsi lingkungan (EN) yang dipakai untuk mencocokkan scene. */
  description: z.string(),
  prompt: z.string(),
  done: z.boolean(),
  edited: z.boolean().default(false),
});

export const ProductAssetSchema = z.object({
  name: z.string(),
  flowName: z.string(),
  prompt: z.string(),
  done: z.boolean(),
  edited: z.boolean().default(false),
});

export const AssetsDocSchema = z.object({
  characters: z.array(CharacterAssetSchema),
  locations: z.array(LocationAssetSchema),
  product: ProductAssetSchema.nullable(),
  updatedAt: z.number().default(0),
});
