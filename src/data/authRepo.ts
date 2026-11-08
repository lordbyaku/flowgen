import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth, isDemoMode } from '@/config/firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  demo: boolean;
}

const DEMO_USER: AppUser = { uid: 'demo-user', email: 'demo@lokal', displayName: 'Mode Demo', demo: true };
const DEMO_FLAG = 'avps-demo-signed-in';
let demoListener: ((u: AppUser | null) => void) | null = null;

function demoSignedIn(): boolean {
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1' || localStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

export function watchAuth(cb: (u: AppUser | null) => void): () => void {
  if (isDemoMode) {
    demoListener = cb;
    cb(demoSignedIn() ? DEMO_USER : null);
    return () => {
      demoListener = null;
    };
  }
  return onAuthStateChanged(getFirebaseAuth(), (u) =>
    cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName, demo: false } : null),
  );
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/wrong-password': 'Email atau password salah.',
  'auth/user-not-found': 'Akun tidak ditemukan.',
  'auth/email-already-in-use': 'Email sudah terdaftar.',
  'auth/weak-password': 'Password minimal 6 karakter.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
  'auth/popup-closed-by-user': 'Jendela login ditutup.',
  'auth/network-request-failed': 'Gagal terhubung. Periksa koneksi internet.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  return AUTH_MESSAGES[code] ?? 'Gagal masuk. Coba lagi.';
}

export async function signInEmail(email: string, password: string): Promise<void> {
  if (isDemoMode) return demoSignIn();
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function registerEmail(email: string, password: string): Promise<void> {
  if (isDemoMode) return demoSignIn();
  await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signInGoogle(): Promise<void> {
  if (isDemoMode) return demoSignIn();
  await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
}

export async function demoSignIn(): Promise<void> {
  try {
    localStorage.setItem(DEMO_FLAG, '1');
  } catch {
    /* penyimpanan diblokir: tetap masuk untuk sesi ini */
  }
  demoListener?.(DEMO_USER);
}

export async function logout(): Promise<void> {
  if (isDemoMode) {
    try {
      localStorage.removeItem(DEMO_FLAG);
      sessionStorage.removeItem(DEMO_FLAG);
    } catch {
      /* abaikan */
    }
    demoListener?.(null);
    return;
  }
  await signOut(getFirebaseAuth());
}
