import { create } from 'zustand';

export type ThemePref = 'system' | 'light' | 'dark';

interface UiState {
  online: boolean;
  theme: ThemePref;
  /** Dialog unlock vault global (dipicu oleh aksi AI saat vault terkunci). */
  unlockOpen: boolean;
  setOnline(v: boolean): void;
  setTheme(t: ThemePref): void;
  setUnlockOpen(v: boolean): void;
}

const THEME_K = 'avps-theme';

function readTheme(): ThemePref {
  try {
    const t = localStorage.getItem(THEME_K);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(t: ThemePref) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (t !== 'system') root.classList.add(t);
}

export const useUiStore = create<UiState>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  theme: readTheme(),
  unlockOpen: false,
  setOnline: (online) => set({ online }),
  setUnlockOpen: (unlockOpen) => set({ unlockOpen }),
  setTheme(theme) {
    try {
      localStorage.setItem(THEME_K, theme);
    } catch {
      /* abaikan */
    }
    applyTheme(theme);
    set({ theme });
  },
}));
