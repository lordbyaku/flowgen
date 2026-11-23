import { z } from 'zod';
import { PlatformSchema } from './common';

/**
 * Paket posting (v1.4): teks untuk disalin saat mengunggah video. Aplikasi tidak memublikasikan apa pun.
 */
export const PublishPlatformSchema = z.object({
  platform: PlatformSchema,
  /** Judul video (YouTube/Shorts/Facebook); platform lain boleh kosong. */
  title: z.string(),
  captions: z.array(z.object({ style: z.string(), text: z.string() })).min(1).max(3),
  hashtags: z.array(z.string()).max(15),
  coverTexts: z.array(z.string()).max(3),
  pinnedComment: z.string(),
});

/** Keluaran panggilan `publish_pack`. */
export const PublishAiSchema = z.object({
  platforms: z.array(PublishPlatformSchema).min(1),
  postingTips: z.array(z.string()).max(5),
});

export const PublishDocSchema = PublishAiSchema.extend({
  updatedAt: z.number().default(0),
});
