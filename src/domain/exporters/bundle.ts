import type { BiblesDoc, Brief, CapcutDoc, CreativeDoc, Project, ProjectDocs, Scene, ScriptDoc } from '@/types';

/**
 * Objek whitelist untuk ekspor. Exporter hanya menerima bentuk ini — tidak pernah objek mentah
 * dari store/vault — sehingga kredensial lokal tidak mungkin ikut terbawa.
 */
export interface ExportBundle {
  name: string;
  createdAt: number;
  updatedAt: number;
  brief: Brief;
  creative: CreativeDoc | null;
  script: ScriptDoc | null;
  bibles: BiblesDoc | null;
  scenes: Scene[];
  capcut: CapcutDoc | null;
}

export function toExportBundle(project: Project, docs: ProjectDocs): ExportBundle {
  return {
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    brief: project.brief,
    creative: docs.creative,
    script: docs.script,
    bibles: docs.bibles,
    scenes: [...(docs.scenes?.items ?? [])].sort((a, b) => a.order - b.order),
    capcut: docs.capcut,
  };
}

export const EXPORT_SECTIONS = [
  'brief',
  'concept',
  'script',
  'storyboard',
  'characterBible',
  'visualBible',
  'prompts',
  'capcut',
  'assumptions',
  'lint',
] as const;
export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export const EXPORT_SECTION_LABELS: Record<ExportSection, string> = {
  brief: 'Ringkasan brief',
  concept: 'Konsep terpilih',
  script: 'Naskah dan VO',
  storyboard: 'Storyboard',
  characterBible: 'Character Bible',
  visualBible: 'Visual Bible',
  prompts: 'Prompt per scene',
  capcut: 'Panduan CapCut',
  assumptions: 'Asumsi AI',
  lint: 'Hasil linter',
};
