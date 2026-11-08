import type { ZodTypeAny, z } from 'zod';
import { isPlainObject } from '@/lib/utils';

/** Objek mirip Firestore Timestamp (duck typing agar modul ini tidak bergantung pada SDK). */
interface TimestampLike {
  toMillis(): number;
}

function isTimestamp(v: unknown): v is TimestampLike {
  return typeof v === 'object' && v !== null && typeof (v as TimestampLike).toMillis === 'function';
}

/** Firestore -> aplikasi: semua Timestamp menjadi number (ms), rekursif. */
export function fromStored(v: unknown): unknown {
  if (isTimestamp(v)) return v.toMillis();
  if (Array.isArray(v)) return v.map(fromStored);
  if (isPlainObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromStored(x)]));
  return v;
}

/** Buang nilai undefined secara rekursif (Firestore menolak undefined). */
export function stripUndefined<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripUndefined) as T;
  if (isPlainObject(v)) {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== undefined)
        .map(([k, x]) => [k, stripUndefined(x)]),
    ) as T;
  }
  return v;
}

export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; issues: string[]; raw: unknown };

/** Semua baca melewati safeParse; data tidak valid ditandai, bukan membuat aplikasi crash. */
export function parseStored<S extends ZodTypeAny>(schema: S, raw: unknown): ParseOutcome<z.infer<S>> {
  const r = schema.safeParse(fromStored(raw));
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`), raw };
}

/** Kunci tingkat atas yang tidak boleh pernah ditulis (cermin dari firestore.rules). */
export const FORBIDDEN_TOP_LEVEL_KEYS = ['apiKey', 'api_key', 'encryptedKey', 'cipher', 'geminiKey', 'key'];

export function assertNoSecrets(data: Record<string, unknown>): void {
  for (const k of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (k in data) throw new Error(`Field terlarang "${k}" tidak boleh disimpan.`);
  }
}

export function jsonSize(v: unknown): number {
  return new TextEncoder().encode(JSON.stringify(v)).length;
}
