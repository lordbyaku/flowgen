import { LABELS } from '@/config/enums';
import { BriefSchema } from '@/schemas/brief.schema';
import { getPath, setPath } from '@/lib/utils';
import type { Brief } from '@/types';

/** Cari nilai enum dari label Indonesia (mis. "Sadar masalah" -> "problem_aware"). */
function labelToValue(answer: string): string[] {
  const a = answer.trim().toLowerCase();
  const out: string[] = [];
  for (const group of Object.values(LABELS) as Record<string, string>[]) {
    for (const [value, label] of Object.entries(group)) {
      if (label.toLowerCase() === a || value.toLowerCase() === a) out.push(value);
    }
  }
  return out;
}

/**
 * Tulis jawaban AI Brief Assistant ke field brief. Array: ditambahkan; string: diganti; enum: dipetakan dari label.
 * Mengembalikan null bila jawaban tidak valid untuk field tersebut (brief tidak diubah).
 */
export function applyBriefAnswer(brief: Brief, path: string, answer: string): Brief | null {
  const text = answer.trim();
  if (!text) return null;
  const cur = getPath(brief, path);
  const candidates: unknown[] = [];
  if (Array.isArray(cur)) {
    candidates.push([...cur, text]);
  } else {
    candidates.push(text);
    for (const v of labelToValue(text)) candidates.push(v);
    const n = Number(text.replace(/[^\d]/g, ''));
    if (Number.isFinite(n) && n > 0) candidates.push(n);
  }
  for (const c of candidates) {
    const next = setPath(brief, path, c);
    if (BriefSchema.safeParse(next).success) return next;
  }
  return null;
}
