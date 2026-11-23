import * as React from 'react';
import { listProjects } from '@/data/projectRepo';
import { collectEntries, learningsForAi } from '@/domain/performance';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import type { PerformanceEntry, Project } from '@/types';

const CACHE_MS = 5 * 60 * 1000;
let cache: { uid: string; at: number; projects: Project[] } | null = null;

/**
 * Hasil posting dari project terbaru (≤20, satu query; di-cache 5 menit untuk hemat read Firestore).
 * Project yang sedang dibuka memakai data terkini dari store.
 */
export function usePastPerformance(brandId?: string): { entries: PerformanceEntry[]; learnings: string[]; loaded: boolean } {
  const uid = useAuthStore((s) => s.user?.uid);
  const current = useProjectStore((s) => s.project);
  const [projects, setProjects] = React.useState<Project[] | null>(cache && cache.uid === uid ? cache.projects : null);

  React.useEffect(() => {
    if (!uid) return;
    if (cache && cache.uid === uid && Date.now() - cache.at < CACHE_MS) {
      setProjects(cache.projects);
      return;
    }
    let alive = true;
    listProjects(uid)
      .then((p) => {
        cache = { uid, at: Date.now(), projects: p.items };
        if (alive) setProjects(p.items);
      })
      .catch(() => alive && setProjects([]));
    return () => {
      alive = false;
    };
  }, [uid]);

  return React.useMemo(() => {
    const list = [...(projects ?? []).filter((p) => p.id !== current?.id), ...(current ? [current] : [])];
    const entries = collectEntries(list, brandId);
    return { entries, learnings: learningsForAi(entries), loaded: projects !== null };
  }, [projects, current, brandId]);
}

/** Hanya untuk tes. */
export function _resetPastPerformanceCache() {
  cache = null;
}
