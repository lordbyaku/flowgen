import { BRIEF_FIELDS, characterFieldSpecs, LEVEL_WEIGHT, type FieldSpec } from '@/config/presets';
import { COMPLETENESS_WARN_BELOW } from '@/config/constants';
import type { Brief } from '@/types';
import { getPath, isFilledValue } from '@/lib/utils';

export interface CompletenessResult {
  score: number;
  /** Field W kosong — generate diblokir bila ada. */
  blockers: FieldSpec[];
  /** Semua field W/P/O kosong yang berlaku, diurutkan berdasar bobot. */
  missing: FieldSpec[];
  /** 5 saran teratas. */
  suggestions: FieldSpec[];
  warn: boolean;
  /** Langkah wizard yang masih punya field W kosong. */
  stepsWithBlockers: number[];
}

export function applicableFields(b: Brief): FieldSpec[] {
  return [...BRIEF_FIELDS, ...characterFieldSpecs(b)].filter((f) => !f.applies || f.applies(b));
}

export function isFieldFilled(b: Brief, f: FieldSpec): boolean {
  if (f.filled) return f.filled(b);
  const v = getPath(b, f.path);
  // Field boolean tidak dihitung — dianggap terisi.
  if (typeof v === 'boolean') return true;
  return isFilledValue(v);
}

export function computeCompleteness(b: Brief): CompletenessResult {
  const fields = applicableFields(b);
  let total = 0;
  let filled = 0;
  const missing: FieldSpec[] = [];
  for (const f of fields) {
    const w = LEVEL_WEIGHT[f.level];
    total += w;
    if (isFieldFilled(b, f)) filled += w;
    else missing.push(f);
  }
  missing.sort((a, c) => LEVEL_WEIGHT[c.level] - LEVEL_WEIGHT[a.level] || a.step - c.step);
  const score = total === 0 ? 100 : Math.round((100 * filled) / total);
  const blockers = missing.filter((f) => f.level === 'W');
  return {
    score,
    blockers,
    missing,
    suggestions: missing.slice(0, 5),
    warn: score < COMPLETENESS_WARN_BELOW,
    stepsWithBlockers: [...new Set(blockers.map((f) => f.step))].sort(),
  };
}
