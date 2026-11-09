import { z } from 'zod';
import { ROUTINGS, VAULT_MODES } from '@/config/enums';
import { AiTaskSchema, KeyStatusSchema } from './common';

export const CipherSchema = z.object({ iv: z.string(), data: z.string() });

/** Record key lokal (IndexedDB). Tidak pernah memuat plaintext. */
export const LocalKeySchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(60),
  projectId: z.string().trim().min(1).max(80),
  model: z.string().min(1),
  enabled: z.boolean(),
  status: KeyStatusSchema,
  priority: z.number().int(),
  cipher: CipherSchema,
  last4: z.string().max(4),
  lastTestedAt: z.number().optional(),
  lastUsedAt: z.number().optional(),
  consecutiveErrors: z.number().int().min(0),
  cooldownUntil: z.number().optional(),
  lastError: z.string().max(300).optional(),
  createdAt: z.number(),
});

/** Formulir tambah/edit key di UI. */
export const KeyFormSchema = z.object({
  label: z.string().trim().min(1, 'Label wajib diisi').max(60),
  projectId: z.string().trim().min(1, 'Project label wajib diisi agar cooldown dikelompokkan per project').max(80),
  apiKey: z.string().trim().min(10, 'API key terlalu pendek'),
  model: z.string().trim().min(1, 'Pilih model'),
});

export const UsageLogSchema = z.object({
  id: z.number().optional(),
  requestId: z.string(),
  ts: z.number(),
  keyLabel: z.string(),
  model: z.string(),
  task: AiTaskSchema,
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  estimated: z.boolean(),
  httpStatus: z.number().optional(),
  ok: z.boolean(),
  latencyMs: z.number(),
  errorCode: z.string().optional(),
});

export const VaultMetaSchema = z.object({
  version: z.literal(1),
  salt: z.string(),
  iterations: z.number().int(),
  verifier: CipherSchema,
  mode: z.enum(VAULT_MODES),
  routing: z.enum(ROUTINGS),
  singleKeyId: z.string().optional(),
  rrCursor: z.string().optional(),
  projectCooldowns: z.record(z.object({ until: z.number(), level: z.number().int().min(0) })),
});

/**
 * Dokumen key yang disinkronkan ke akun (mode vault 'cloud', keputusan pemilik v1.2).
 * Disimpan di users/{uid}/private/aiKeys. Plaintext — dilindungi Security Rules (hanya pemilik).
 */
export const CloudKeyItemSchema = LocalKeySchema.omit({ cipher: true }).extend({ apiKey: z.string().min(1) });
export const CloudKeysDocSchema = z.object({
  items: z.array(CloudKeyItemSchema).max(5),
  updatedAt: z.number().default(0),
});
