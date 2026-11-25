import { z } from 'zod';
import * as E from '@/config/enums';
import { AspectRatioSchema } from './common';

/** Mode Simpel (v1.7): ide → prompt Gemini Omni untuk Google Flow, tanpa brief panjang. */
export const SimpleStyleSchema = z.enum(E.SIMPLE_STYLES);
export const SimpleSpeechSchema = z.enum(E.SIMPLE_SPEECH);

export const SimpleVideoInputSchema = z.object({
  idea: z.string().trim().min(10, 'Tulis ide minimal 10 karakter').max(1500, 'Maksimal 1500 karakter'),
  durationSec: z.number().int().min(5).max(60),
  aspectRatio: AspectRatioSchema,
  style: SimpleStyleSchema,
  speech: SimpleSpeechSchema,
  /** Bahasa ucapan tokoh/narator. */
  speechLanguage: z.enum(['id', 'en']),
  /** Buat tokoh/produk/tempat sebagai aset di Flow dulu, lalu prompt klip menyebut namanya. */
  useAssets: z.boolean(),
});

const AssetSchema = z.object({
  kind: z.enum(E.SIMPLE_ASSET_KINDS),
  name: z.string().max(60),
  /** Deskripsi tampilan (Inggris), disalin utuh ke prompt klip bila tidak memakai aset. */
  description: z.string().max(800),
  /** Prompt gambar (Inggris) untuk membuat aset di Flow. */
  imagePrompt: z.string().max(1500),
});

const ClipOutSchema = z.object({
  durationSec: z.number(),
  title: z.string().max(120),
  prompt: z.string().max(3000),
  /** Ucapan di klip (bila ada), untuk ditampilkan ke pengguna. */
  speech: z.string().max(400).optional(),
});

/** Keluaran AI. */
export const SimpleVideoOutputSchema = z.object({
  title: z.string().max(120),
  summary: z.string().max(600),
  assets: z.array(AssetSchema).max(5),
  clips: z.array(ClipOutSchema).min(1).max(8),
  tips: z.array(z.string().max(300)).max(4),
});

export const SimpleClipSchema = ClipOutSchema.extend({
  id: z.string(),
  done: z.boolean(),
  /** Instruksi edit Omni terakhir dari "Perbaiki hasil". */
  editInstruction: z.string().max(2000).optional(),
});

export const SimpleVideoSchema = z.object({
  id: z.string().min(1),
  input: SimpleVideoInputSchema,
  title: z.string().max(120),
  summary: z.string().max(600),
  assets: z.array(AssetSchema.extend({ done: z.boolean() })).max(5),
  clips: z.array(SimpleClipSchema).max(8),
  tips: z.array(z.string().max(300)).max(4),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const SimpleIdeasInputSchema = z.object({
  topic: z.string().trim().min(3, 'Tulis produk atau topik').max(500),
  goal: z.enum(['sell', 'educate', 'entertain']),
});

export const SimpleIdeasOutputSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().max(120),
        hook: z.string().max(200),
        idea: z.string().max(600),
      }),
    )
    .max(10),
});

export const SimpleFixOutputSchema = z.object({
  prompt: z.string().max(3000),
  editInstruction: z.string().max(2000),
  changes: z.array(z.string().max(300)).max(6),
});
