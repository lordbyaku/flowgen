import { isDemoMode } from '@/config/env';
import type { DataBackend } from './backend';
import { createLocalBackend } from './localBackend';
import { withOpsCounter } from './opsCounter';

let backend: DataBackend | null = null;

/** Proxy yang memuat modul Firestore (dan SDK Firebase) hanya saat pertama dipakai. */
function createLazyFirestoreBackend(): DataBackend {
  let real: Promise<DataBackend> | null = null;
  const load = () => (real ??= import('./firestoreBackend').then((m) => m.createFirestoreBackend()));
  return {
    kind: 'firestore',
    get: async (p) => (await load()).get(p),
    set: async (p, d) => (await load()).set(p, d),
    update: async (p, d) => (await load()).update(p, d),
    delete: async (p) => (await load()).delete(p),
    list: async (p, o) => (await load()).list(p, o),
    subscribe(path, cb) {
      let unsub: (() => void) | null = null;
      let cancelled = false;
      void load().then((b) => {
        if (!cancelled) unsub = b.subscribe(path, cb);
      });
      return () => {
        cancelled = true;
        unsub?.();
      };
    },
  };
}

export function getBackend(): DataBackend {
  if (!backend) backend = withOpsCounter(isDemoMode ? createLocalBackend() : createLazyFirestoreBackend());
  return backend;
}

/** Hanya untuk tes. */
export function _setBackendForTests(b: DataBackend | null) {
  backend = b;
}

export const paths = {
  user: (uid: string) => `users/${uid}`,
  aiKeys: (uid: string) => `users/${uid}/private/aiKeys`,
  brands: (uid: string) => `users/${uid}/brands`,
  brand: (uid: string, id: string) => `users/${uid}/brands/${id}`,
  templates: (uid: string) => `users/${uid}/briefTemplates`,
  template: (uid: string, id: string) => `users/${uid}/briefTemplates/${id}`,
  snippets: (uid: string) => `users/${uid}/promptTemplates`,
  snippet: (uid: string, id: string) => `users/${uid}/promptTemplates/${id}`,
  projects: (uid: string) => `users/${uid}/projects`,
  project: (uid: string, pid: string) => `users/${uid}/projects/${pid}`,
  projectDoc: (uid: string, pid: string, name: string) => `users/${uid}/projects/${pid}/docs/${name}`,
};
