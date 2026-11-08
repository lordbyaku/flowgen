import { z } from 'zod';
import { PROJECT_STAGES, PROJECT_STATUSES } from '@/config/enums';
import { BriefSchema } from './brief.schema';

export const ProjectSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1).default(1),
  name: z.string(),
  brandId: z.string(),
  status: z.enum(PROJECT_STATUSES),
  brief: BriefSchema,
  completeness: z.number().min(0).max(100),
  step: z.number().int().min(1).max(9),
  stage: z.enum(PROJECT_STAGES),
  /** ID aturan linter yang dimatikan untuk project ini (Fase 2). */
  lintDisabled: z.array(z.string()).default([]),
  presetId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const BrandSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Nama brand wajib diisi').max(120),
  industry: z.string().max(120).default(''),
  tagline: z.string().max(200).default(''),
  description: z.string().max(2000).default(''),
  colors: z.array(z.string().max(30)).max(6, 'Maksimal 6 warna').default([]),
  logoDescription: z.string().max(500).default(''),
  toneOfVoice: z.string().max(500).default(''),
  targetMarket: z.string().max(500).default(''),
  website: z.string().max(300).default(''),
  socials: z.string().max(300).default(''),
  dos: z.array(z.string().max(200)).max(20).default([]),
  donts: z.array(z.string().max(200)).max(20).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const BrandFormSchema = BrandSchema.omit({ id: true, createdAt: true, updatedAt: true }).extend({
  website: z
    .string()
    .max(300)
    .refine((v) => v === '' || /^https?:\/\//.test(v), 'Website harus diawali http:// atau https://'),
});

export const BriefTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Nama template wajib diisi').max(120),
  description: z.string().max(500).default(''),
  brief: BriefSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const PromptSnippetSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Judul wajib diisi').max(120),
  category: z.enum(['camera', 'lighting', 'style', 'environment', 'product', 'negative', 'other']),
  text: z.string().trim().min(1, 'Isi potongan wajib diisi').max(1500),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const UserPreferencesSchema = z.object({
  displayName: z.string().max(120).default(''),
  /** Ambang anggaran panggilan AI harian lokal; 0 = nonaktif. */
  dailyCallBudget: z.number().int().min(0).max(10000).default(0),
  updatedAt: z.number().default(0),
});
