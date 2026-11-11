import { z } from 'zod';
import { BriefSchema } from '@/schemas/brief.schema';
import { CreativeDocSchema } from '@/schemas/concept.schema';
import { ScriptDocSchema } from '@/schemas/script.schema';
import { BiblesDocSchema } from '@/schemas/bible.schema';
import { ScenesDocSchema } from '@/schemas/scene.schema';
import { CapcutDocSchema } from '@/schemas/capcut.schema';
import { AssetsDocSchema } from '@/schemas/assets.schema';
import { slugify } from '@/lib/utils';
import { yyyymmdd } from '@/lib/format';
import type { ExportBundle } from './bundle';

export const PROJECT_FILE_FORMAT = 'avps-project';
export const CURRENT_FILE_VERSION = 1;

const ProjectFileSchema = z.object({
  format: z.literal(PROJECT_FILE_FORMAT),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.number(),
  project: z.object({ name: z.string(), createdAt: z.number(), updatedAt: z.number(), brief: BriefSchema }),
  docs: z.object({
    creative: CreativeDocSchema.nullable(),
    script: ScriptDocSchema.nullable(),
    bibles: BiblesDocSchema.nullable(),
    scenes: ScenesDocSchema.nullable(),
    capcut: CapcutDocSchema.nullable(),
    assets: AssetsDocSchema.nullable().default(null),
  }),
});
export type ProjectFile = z.infer<typeof ProjectFileSchema>;

/** Ekspor satu project sebagai JSON (whitelist; tanpa key atau kredensial lokal). */
export function projectToJson(b: ExportBundle): string {
  const file: ProjectFile = {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: CURRENT_FILE_VERSION,
    exportedAt: Date.now(),
    project: { name: b.name, createdAt: b.createdAt, updatedAt: b.updatedAt, brief: b.brief },
    docs: {
      creative: b.creative,
      script: b.script,
      bibles: b.bibles,
      scenes: b.scenes.length ? { items: b.scenes, updatedAt: b.updatedAt } : null,
      capcut: b.capcut,
      assets: b.assets,
    },
  };
  return JSON.stringify(file, null, 2);
}

/** Migrasi schemaVersion lama -> terbaru. Saat ini hanya v1. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const v = Number(raw.schemaVersion ?? 0);
  if (v > CURRENT_FILE_VERSION) throw new Error(`Versi file ${v} lebih baru dari aplikasi ini.`);
  if (v < 1) throw new Error('File tidak memiliki schemaVersion yang valid.');
  return raw;
}

export type ImportResult = { ok: true; file: ProjectFile } | { ok: false; message: string };

export function parseProjectJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: 'File bukan JSON yang valid.' };
  }
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== PROJECT_FILE_FORMAT)
    return { ok: false, message: 'File bukan ekspor project AI Video Prompt Studio.' };
  try {
    const migrated = migrate(raw as Record<string, unknown>);
    const r = ProjectFileSchema.safeParse(migrated);
    if (!r.success) {
      const first = r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`);
      return { ok: false, message: `Isi file tidak valid — ${first.join('; ')}` };
    }
    return { ok: true, file: r.data };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Gagal membaca file.' };
  }
}

export function exportFilename(projectName: string, part: string, ext: 'md' | 'txt' | 'json'): string {
  return `${slugify(projectName)}-${yyyymmdd()}-${part}.${ext}`;
}
