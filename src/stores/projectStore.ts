import { create } from 'zustand';
import { AUTOSAVE_DEBOUNCE_MS } from '@/config/constants';
import * as repo from '@/data/projectRepo';
import { computeCompleteness } from '@/domain/completeness';
import type { Brief, DocName, Project, ProjectDocs, Scene } from '@/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ProjectField = keyof Omit<Project, 'id'>;

const EMPTY_DOCS: ProjectDocs = { creative: null, script: null, bibles: null, scenes: null, capcut: null, assets: null };

interface ProjectState {
  uid: string | null;
  projectId: string | null;
  project: Project | null;
  docs: ProjectDocs;
  loading: boolean;
  loadError: string | null;
  invalidDocs: DocName[];
  saveStatus: SaveStatus;
  remoteChanged: boolean;
  trimmedWarning: boolean;
  dirtyFields: Set<ProjectField>;
  dirtyDocs: Set<DocName>;

  load(uid: string, pid: string): Promise<void>;
  unload(): Promise<void>;
  updateBrief(fn: (b: Brief) => Brief): void;
  patchProject(patch: Partial<Omit<Project, 'id' | 'brief'>>): void;
  setDoc<K extends DocName>(name: K, value: ProjectDocs[K]): void;
  updateScenes(fn: (scenes: Scene[]) => Scene[]): void;
  flush(): Promise<boolean>;
  reloadFromRemote(): Promise<void>;
  dismissRemoteChange(): void;
  /** Tulis perubahan yang belum tersimpan ke localStorage secara sinkron (dipanggil saat tab ditutup). */
  backupPending(): void;
  /** true bila perubahan dari sesi sebelumnya dipulihkan saat memuat project. */
  restoredBackup: boolean;
}

const BACKUP_PREFIX = 'avps-pending-';

interface PendingBackup {
  ts: number;
  fields: Partial<Project>;
  docs: Partial<ProjectDocs>;
}

function readBackup(pid: string): PendingBackup | null {
  try {
    const raw = localStorage.getItem(BACKUP_PREFIX + pid);
    return raw ? (JSON.parse(raw) as PendingBackup) : null;
  } catch {
    return null;
  }
}

function clearBackup(pid: string) {
  try {
    localStorage.removeItem(BACKUP_PREFIX + pid);
  } catch {
    /* abaikan */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
/** updatedAt terakhir yang ditulis/dimuat tab ini (untuk deteksi konflik). */
let knownUpdatedAt = 0;
let flushing: Promise<boolean> | null = null;
let loadToken = 0;

export const useProjectStore = create<ProjectState>((set, get) => {
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void get().flush(), AUTOSAVE_DEBOUNCE_MS);
  };

  const markField = (...fields: ProjectField[]) => {
    const dirtyFields = new Set(get().dirtyFields);
    fields.forEach((f) => dirtyFields.add(f));
    set({ dirtyFields, saveStatus: 'idle' });
    schedule();
  };

  return {
    uid: null,
    projectId: null,
    project: null,
    docs: EMPTY_DOCS,
    loading: false,
    loadError: null,
    invalidDocs: [],
    saveStatus: 'idle',
    remoteChanged: false,
    trimmedWarning: false,
    restoredBackup: false,
    dirtyFields: new Set(),
    dirtyDocs: new Set(),

    async load(uid, pid) {
      if (get().projectId === pid && (get().project || get().loading)) return;
      await get().unload();
      const token = ++loadToken;
      set({ uid, projectId: pid, loading: true, loadError: null, project: null, docs: EMPTY_DOCS });
      try {
        const r = await repo.getProject(uid, pid);
        if (token !== loadToken) return;
        if (!r.ok) {
          set({
            loading: false,
            loadError: r.reason === 'not_found' ? 'Project tidak ditemukan.' : 'Data project tidak valid dan tidak dapat dimuat.',
          });
          return;
        }
        const { docs, invalid } = await repo.getProjectDocs(uid, pid);
        if (token !== loadToken) return;
        unsubscribe?.();
        knownUpdatedAt = r.project.updatedAt;
        set({ project: r.project, docs, invalidDocs: invalid, loading: false, saveStatus: 'idle', restoredBackup: false });
        // Pulihkan perubahan yang belum sempat tersimpan saat tab ditutup.
        const backup = readBackup(pid);
        if (backup && backup.ts > r.project.updatedAt) {
          const fields = Object.keys(backup.fields) as ProjectField[];
          const docNames = Object.keys(backup.docs) as DocName[];
          set({
            project: { ...r.project, ...backup.fields },
            docs: { ...docs, ...backup.docs },
            dirtyFields: new Set(fields),
            dirtyDocs: new Set(docNames),
            restoredBackup: fields.length + docNames.length > 0,
          });
          schedule();
        } else if (backup) clearBackup(pid);
        unsubscribe = repo.subscribeProject(uid, pid, (remote, meta) => {
          if (!remote || meta.hasPendingWrites) return;
          if (remote.updatedAt > knownUpdatedAt) set({ remoteChanged: true });
        });
      } catch (e) {
        console.error('Gagal memuat project', e instanceof Error ? e.name : 'error');
        set({ loading: false, loadError: 'Gagal memuat project. Periksa koneksi lalu coba lagi.' });
      }
    },

    async unload() {
      loadToken++;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (get().dirtyFields.size || get().dirtyDocs.size) await get().flush();
      unsubscribe?.();
      unsubscribe = null;
      set({
        projectId: null,
        project: null,
        docs: EMPTY_DOCS,
        dirtyFields: new Set(),
        dirtyDocs: new Set(),
        remoteChanged: false,
        saveStatus: 'idle',
        invalidDocs: [],
      });
    },

    updateBrief(fn) {
      const p = get().project;
      if (!p) return;
      const brief = fn(p.brief);
      const completeness = computeCompleteness(brief).score;
      const name = brief.project.name;
      const brandId = brief.project.brandId;
      set({ project: { ...p, brief, completeness, name, brandId } });
      markField('brief', 'completeness', 'name', 'brandId');
    },

    patchProject(patch) {
      const p = get().project;
      if (!p) return;
      set({ project: { ...p, ...patch } });
      markField(...(Object.keys(patch) as ProjectField[]));
    },

    setDoc(name, value) {
      const dirtyDocs = new Set(get().dirtyDocs);
      dirtyDocs.add(name);
      set({ docs: { ...get().docs, [name]: value }, dirtyDocs, saveStatus: 'idle' });
      schedule();
    },

    updateScenes(fn) {
      const cur = get().docs.scenes;
      const items = fn(cur?.items ?? []).map((s, i) => ({ ...s, order: i }));
      get().setDoc('scenes', { items, updatedAt: cur?.updatedAt ?? 0 });
    },

    async flush() {
      if (flushing) await flushing;
      const { uid, projectId, project, docs } = get();
      if (!uid || !projectId || !project) return true;
      const fields = [...get().dirtyFields];
      const docNames = [...get().dirtyDocs];
      if (fields.length === 0 && docNames.length === 0) return true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      set({ saveStatus: 'saving', dirtyFields: new Set(), dirtyDocs: new Set() });
      flushing = (async () => {
        try {
          let trimmed = false;
          for (const name of docNames) {
            const value = docs[name];
            if (value) trimmed = (await repo.saveProjectDoc(uid, projectId, name, value)).trimmed || trimmed;
          }
          // Simpan hanya field yang berubah (+ updatedAt).
          const ts = Math.max(Date.now(), knownUpdatedAt + 1);
          knownUpdatedAt = ts;
          const patch: Partial<Project> = { updatedAt: ts };
          for (const f of fields) (patch as Record<string, unknown>)[f] = project[f];
          await repo.updateProject(uid, projectId, patch);
          const cur = get().project;
          if (cur) set({ project: { ...cur, updatedAt: ts } });
          set({ saveStatus: 'saved', trimmedWarning: trimmed || get().trimmedWarning });
          if (!get().dirtyFields.size && !get().dirtyDocs.size) clearBackup(projectId);
          return true;
        } catch (e) {
          console.error('Gagal menyimpan', e instanceof Error ? e.name : 'error');
          // Gagal simpan tidak menghapus perubahan lokal: kembalikan ke daftar dirty.
          const df = new Set(get().dirtyFields);
          fields.forEach((f) => df.add(f));
          const dd = new Set(get().dirtyDocs);
          docNames.forEach((d) => dd.add(d));
          set({ saveStatus: 'error', dirtyFields: df, dirtyDocs: dd });
          return false;
        } finally {
          flushing = null;
        }
      })();
      return flushing;
    },

    async reloadFromRemote() {
      const { uid, projectId } = get();
      if (!uid || !projectId) return;
      if (timer) clearTimeout(timer);
      set({ dirtyFields: new Set(), dirtyDocs: new Set() });
      unsubscribe?.();
      unsubscribe = null;
      set({ project: null, projectId: null, remoteChanged: false });
      await get().load(uid, projectId);
    },

    dismissRemoteChange: () => set({ remoteChanged: false }),

    backupPending() {
      const { projectId, project, docs, dirtyFields, dirtyDocs } = get();
      if (!projectId || !project || (!dirtyFields.size && !dirtyDocs.size)) return;
      const backup: PendingBackup = { ts: Date.now(), fields: {}, docs: {} };
      dirtyFields.forEach((f) => ((backup.fields as Record<string, unknown>)[f] = project[f]));
      dirtyDocs.forEach((d) => ((backup.docs as Record<string, unknown>)[d] = docs[d]));
      try {
        localStorage.setItem(BACKUP_PREFIX + projectId, JSON.stringify(backup));
      } catch {
        /* kuota penuh atau diblokir: abaikan */
      }
    },
  };
});

/** Hanya untuk tes. */
export function _resetProjectStoreTimers() {
  if (timer) clearTimeout(timer);
  timer = null;
  knownUpdatedAt = 0;
  unsubscribe = null;
  flushing = null;
}
