import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

import { firebaseConfig, isDemoMode } from './env';

export { firebaseConfig, isDemoMode, isFirebaseConfigured } from './env';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (app || isDemoMode) return;
  app = initializeApp(firebaseConfig);

  const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined;
  if (siteKey && typeof window !== 'undefined') {
    if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string;
    }
    // App Check hanya melindungi layanan Firebase, bukan panggilan langsung ke Gemini.
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
  }

  auth = getAuth(app);
  // [VERIFIKASI] API cache persisten multi-tab untuk SDK yang terpasang.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });

  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export function getFirebaseAuth(): Auth {
  init();
  if (!auth) throw new Error('Firebase Auth tidak tersedia (Mode Demo Lokal).');
  return auth;
}

export function getDb(): Firestore {
  init();
  if (!db) throw new Error('Firestore tidak tersedia (Mode Demo Lokal).');
  return db;
}
