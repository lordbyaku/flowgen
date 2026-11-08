import { create } from 'zustand';
import type { AiTask, AppError, ProgressPhase } from '@/types';

const PHASE_LABEL: Record<ProgressPhase, string> = {
  selecting_key: 'Memilih key…',
  requesting: 'Menghubungi Gemini…',
  parsing: 'Membaca hasil…',
  validating: 'Memvalidasi hasil…',
  repairing: 'Memperbaiki format JSON (1x)…',
  saving: 'Menyimpan…',
};

interface AiStatusState {
  running: AiTask | null;
  phase: ProgressPhase | null;
  detail: string | null;
  lastError: AppError | null;
  controller: AbortController | null;
  /** Jalankan tugas AI (satu per satu). Mengembalikan null jika ada tugas lain berjalan. */
  start(task: AiTask): AbortController | null;
  progress(phase: ProgressPhase, detail?: string): void;
  finish(error?: AppError | null): void;
  cancel(): void;
  clearError(): void;
}

export const phaseLabel = (p: ProgressPhase | null) => (p ? PHASE_LABEL[p] : '');

export const useAiStatusStore = create<AiStatusState>((set, get) => ({
  running: null,
  phase: null,
  detail: null,
  lastError: null,
  controller: null,
  start(task) {
    if (get().running) return null;
    const controller = new AbortController();
    set({ running: task, phase: 'selecting_key', detail: null, controller, lastError: null });
    return controller;
  },
  progress: (phase, detail) => set({ phase, detail: detail ?? null }),
  finish: (error) => set({ running: null, phase: null, detail: null, controller: null, lastError: error ?? null }),
  cancel() {
    get().controller?.abort();
  },
  clearError: () => set({ lastError: null }),
}));
