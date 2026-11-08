import { isDemoMode } from '@/config/firebase';
import type { DataBackend } from './backend';
import { createFirestoreBackend } from './firestoreBackend';
import { createLocalBackend } from './localBackend';
import { withOpsCounter } from './opsCounter';

let backend: DataBackend | null = null;

export function getBackend(): DataBackend {
  if (!backend) backend = withOpsCounter(isDemoMode ? createLocalBackend() : createFirestoreBackend());
  return backend;
}

/** Hanya untuk tes. */
export function _setBackendForTests(b: DataBackend | null) {
  backend = b;
}

export const paths = {
  user: (uid: string) => `users/${uid}`,
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
