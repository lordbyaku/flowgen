import { BriefTemplateSchema, PromptSnippetSchema, UserPreferencesSchema } from '@/schemas/project.schema';
import { newId } from '@/lib/ids';
import type { Brief, BriefTemplate, PromptSnippet, UserPreferences } from '@/types';
import { parseStored } from './converters';
import { getBackend, paths } from './index';

// ---- Brief Template (Fase 2) ----
export async function listTemplates(uid: string): Promise<BriefTemplate[]> {
  const res = await getBackend().list(paths.templates(uid), { orderByUpdated: true, limit: 100 });
  return res.items.flatMap(({ id, data }) => {
    const p = parseStored(BriefTemplateSchema, { ...data, id });
    return p.ok ? [p.value] : [];
  });
}

export async function saveTemplate(uid: string, input: { name: string; description: string; brief: Brief }): Promise<BriefTemplate> {
  const now = Date.now();
  // Template tidak membawa nama project/brand agar netral.
  const brief: Brief = { ...input.brief, project: { ...input.brief.project, name: '', brandId: '' } };
  const t = BriefTemplateSchema.parse({ ...input, brief, id: `tpl_${newId()}`, createdAt: now, updatedAt: now });
  await getBackend().set(paths.template(uid, t.id), t);
  return t;
}

export async function deleteTemplate(uid: string, id: string): Promise<void> {
  await getBackend().delete(paths.template(uid, id));
}

// ---- Prompt Library (Fase 3) ----
export type SnippetInput = Omit<PromptSnippet, 'id' | 'createdAt' | 'updatedAt'>;

export async function listSnippets(uid: string): Promise<PromptSnippet[]> {
  const res = await getBackend().list(paths.snippets(uid), { orderByUpdated: true, limit: 200 });
  return res.items.flatMap(({ id, data }) => {
    const p = parseStored(PromptSnippetSchema, { ...data, id });
    return p.ok ? [p.value] : [];
  });
}

export async function createSnippet(uid: string, input: SnippetInput): Promise<PromptSnippet> {
  const now = Date.now();
  const s = PromptSnippetSchema.parse({ ...input, id: `snip_${newId()}`, createdAt: now, updatedAt: now });
  await getBackend().set(paths.snippet(uid, s.id), s);
  return s;
}

export async function updateSnippet(uid: string, id: string, input: SnippetInput): Promise<void> {
  await getBackend().update(paths.snippet(uid, id), { ...input, updatedAt: Date.now() });
}

export async function deleteSnippet(uid: string, id: string): Promise<void> {
  await getBackend().delete(paths.snippet(uid, id));
}

// ---- Preferensi user (non-rahasia) ----
export async function getPreferences(uid: string): Promise<UserPreferences> {
  const data = await getBackend().get(paths.user(uid));
  const p = parseStored(UserPreferencesSchema, data ?? {});
  return p.ok ? p.value : UserPreferencesSchema.parse({});
}

export async function savePreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  await getBackend().update(paths.user(uid), { ...prefs, updatedAt: Date.now() });
}
