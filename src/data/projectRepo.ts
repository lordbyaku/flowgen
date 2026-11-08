import { PROJECTS_PAGE_SIZE } from '@/config/constants';
import { ProjectSchema } from '@/schemas/project.schema';
import { CreativeDocSchema } from '@/schemas/concept.schema';
import { ScriptDocSchema } from '@/schemas/script.schema';
import { BiblesDocSchema } from '@/schemas/bible.schema';
import { ScenesDocSchema } from '@/schemas/scene.schema';
import { CapcutDocSchema } from '@/schemas/capcut.schema';
import { computeCompleteness } from '@/domain/completeness';
import { newId } from '@/lib/ids';
import type { Brief, DocName, Project, ProjectDocs } from '@/types';
import type { SnapshotMeta } from './backend';
import { parseStored } from './converters';
import { getBackend, paths } from './index';
import { fitScenesDoc } from './sceneRepo';

export const DOC_NAMES: DocName[] = ['creative', 'script', 'bibles', 'scenes', 'capcut'];

const DOC_SCHEMAS = {
  creative: CreativeDocSchema,
  script: ScriptDocSchema,
  bibles: BiblesDocSchema,
  scenes: ScenesDocSchema,
  capcut: CapcutDocSchema,
} as const;

export interface ProjectPage {
  items: Project[];
  cursor: unknown | null;
  invalid: number;
}

export async function listProjects(uid: string, opts: { status?: string; cursor?: unknown } = {}): Promise<ProjectPage> {
  const res = await getBackend().list(paths.projects(uid), {
    orderByUpdated: true,
    status: opts.status,
    limit: PROJECTS_PAGE_SIZE,
    cursor: opts.cursor,
  });
  let invalid = 0;
  const items = res.items.flatMap(({ id, data }) => {
    const p = parseStored(ProjectSchema, { ...data, id });
    if (!p.ok) invalid++;
    return p.ok ? [p.value] : [];
  });
  return { items, cursor: res.cursor, invalid };
}

export type ProjectLoad = { ok: true; project: Project } | { ok: false; reason: 'not_found' | 'invalid'; issues?: string[] };

export async function getProject(uid: string, pid: string): Promise<ProjectLoad> {
  const data = await getBackend().get(paths.project(uid, pid));
  if (!data) return { ok: false, reason: 'not_found' };
  const p = parseStored(ProjectSchema, { ...data, id: pid });
  return p.ok ? { ok: true, project: p.value } : { ok: false, reason: 'invalid', issues: p.issues };
}

export function subscribeProject(
  uid: string,
  pid: string,
  cb: (p: Project | null, meta: SnapshotMeta) => void,
): () => void {
  return getBackend().subscribe(paths.project(uid, pid), (data, meta) => {
    if (!data) return cb(null, meta);
    const p = parseStored(ProjectSchema, { ...data, id: pid });
    cb(p.ok ? p.value : null, meta);
  });
}

export async function createProject(
  uid: string,
  input: { name: string; brandId: string; brief: Brief; presetId?: string },
): Promise<Project> {
  const now = Date.now();
  const brief: Brief = { ...input.brief, project: { ...input.brief.project, name: input.name, brandId: input.brandId } };
  const project: Project = ProjectSchema.parse({
    id: `proj_${newId()}`,
    schemaVersion: 1,
    name: input.name,
    brandId: input.brandId,
    status: 'draft',
    brief,
    completeness: computeCompleteness(brief).score,
    step: 1,
    stage: 'brief',
    lintDisabled: [],
    presetId: input.presetId,
    createdAt: now,
    updatedAt: now,
  });
  await getBackend().set(paths.project(uid, project.id), project);
  return project;
}

/** Simpan field project yang berubah saja. */
export async function updateProject(uid: string, pid: string, patch: Partial<Omit<Project, 'id'>>): Promise<number> {
  const updatedAt = patch.updatedAt ?? Date.now();
  await getBackend().update(paths.project(uid, pid), { ...patch, updatedAt });
  return updatedAt;
}

export async function deleteProject(uid: string, pid: string): Promise<void> {
  for (const name of DOC_NAMES) await getBackend().delete(paths.projectDoc(uid, pid, name));
  await getBackend().delete(paths.project(uid, pid));
}

export async function getProjectDocs(uid: string, pid: string): Promise<{ docs: ProjectDocs; invalid: DocName[] }> {
  const invalid: DocName[] = [];
  const entries = await Promise.all(
    DOC_NAMES.map(async (name) => {
      const raw = await getBackend().get(paths.projectDoc(uid, pid, name));
      if (!raw) return [name, null] as const;
      const p = parseStored(DOC_SCHEMAS[name], raw);
      if (!p.ok) invalid.push(name);
      return [name, p.ok ? p.value : null] as const;
    }),
  );
  return { docs: Object.fromEntries(entries) as unknown as ProjectDocs, invalid };
}

/** Tulis satu dokumen turunan. Untuk scenes: cek ukuran dan pangkas versi tertua bila > 800 KB. */
export async function saveProjectDoc<K extends DocName>(
  uid: string,
  pid: string,
  name: K,
  value: NonNullable<ProjectDocs[K]>,
): Promise<{ trimmed: boolean }> {
  let data = { ...value, updatedAt: Date.now() } as Record<string, unknown>;
  let trimmed = false;
  if (name === 'scenes') {
    const fit = fitScenesDoc(data as unknown as NonNullable<ProjectDocs['scenes']>);
    data = fit.doc as unknown as Record<string, unknown>;
    trimmed = fit.trimmed;
  }
  await getBackend().set(paths.projectDoc(uid, pid, name), data);
  return { trimmed };
}

export async function deleteProjectDoc(uid: string, pid: string, name: DocName): Promise<void> {
  await getBackend().delete(paths.projectDoc(uid, pid, name));
}

/** Duplikat project untuk variasi cepat (brief + semua dokumen turunan). */
export async function duplicateProject(uid: string, source: Project): Promise<Project> {
  const now = Date.now();
  const copy: Project = {
    ...source,
    id: `proj_${newId()}`,
    name: `${source.name} (salinan)`,
    brief: { ...source.brief, project: { ...source.brief.project, name: `${source.name} (salinan)` } },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  await getBackend().set(paths.project(uid, copy.id), copy);
  const { docs } = await getProjectDocs(uid, source.id);
  for (const name of DOC_NAMES) {
    const d = docs[name];
    if (d) await saveProjectDoc(uid, copy.id, name, d as NonNullable<ProjectDocs[typeof name]>);
  }
  return copy;
}

/** Impor project dari file JSON yang sudah divalidasi; selalu menjadi project baru. */
export async function importProject(
  uid: string,
  input: { name: string; brief: Brief; docs: ProjectDocs },
): Promise<Project> {
  const p = await createProject(uid, { name: `${input.name} (impor)`, brandId: '', brief: input.brief });
  for (const name of DOC_NAMES) {
    const d = input.docs[name];
    if (d) await saveProjectDoc(uid, p.id, name, d as NonNullable<ProjectDocs[typeof name]>);
  }
  return p;
}

/** Character Bible tersimpan dari project terbaru (dipakai ulang di brief Langkah 6). */
export async function listSavedCharacterBibles(
  uid: string,
): Promise<{ projectName: string; bible: NonNullable<ProjectDocs['bibles']>['characters'][number] }[]> {
  const page = await listProjects(uid);
  const out: { projectName: string; bible: NonNullable<ProjectDocs['bibles']>['characters'][number] }[] = [];
  for (const p of page.items) {
    const raw = await getBackend().get(paths.projectDoc(uid, p.id, 'bibles'));
    if (!raw) continue;
    const parsed = parseStored(BiblesDocSchema, raw);
    if (parsed.ok) parsed.value.characters.forEach((bible) => out.push({ projectName: p.name, bible }));
  }
  return out;
}

/** Semua project milik user (untuk ekspor JSON di Settings). */
export async function listAllProjects(uid: string): Promise<Project[]> {
  const out: Project[] = [];
  let cursor: unknown | null = null;
  let guard = 50;
  do {
    const page = await listProjects(uid, { cursor: cursor ?? undefined });
    out.push(...page.items);
    cursor = page.cursor;
  } while (cursor && guard-- > 0);
  return out;
}
