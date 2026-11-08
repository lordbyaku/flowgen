import { create } from 'zustand';
import * as auth from '@/data/authRepo';
import type { AppUser } from '@/data/authRepo';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  init(): () => void;
  signIn(email: string, password: string): Promise<string | null>;
  register(email: string, password: string): Promise<string | null>;
  signInGoogle(): Promise<string | null>;
  signInDemo(): Promise<void>;
  logout(): Promise<void>;
}

const wrap = async (fn: () => Promise<void>): Promise<string | null> => {
  try {
    await fn();
    return null;
  } catch (e) {
    return auth.authErrorMessage(e);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  init() {
    return auth.watchAuth((user) => set({ user, loading: false }));
  },
  signIn: (email, password) => wrap(() => auth.signInEmail(email, password)),
  register: (email, password) => wrap(() => auth.registerEmail(email, password)),
  signInGoogle: () => wrap(() => auth.signInGoogle()),
  signInDemo: () => auth.demoSignIn(),
  logout: () => auth.logout(),
}));

export function requireUid(): string {
  const u = useAuthStore.getState().user;
  if (!u) throw new Error('Belum login');
  return u.uid;
}
