// Dimuat secara dinamis (lazy) hanya bila Firebase dikonfigurasi, agar Mode Demo tidak memuat SDK.
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/config/firebase';

export const watch = (cb: (u: User | null) => void) => onAuthStateChanged(getFirebaseAuth(), cb);
export const signInEmail = (email: string, password: string) => signInWithEmailAndPassword(getFirebaseAuth(), email, password);
export const register = (email: string, password: string) => createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
export const signInGoogle = () => signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
export const logout = () => signOut(getFirebaseAuth());
