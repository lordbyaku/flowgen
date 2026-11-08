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

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/**
 * Mode Demo Lokal: tanpa Firebase, data project disimpan di IndexedDB browser ini.
 * Aktif jika VITE_DEMO_MODE=true atau konfigurasi Firebase belum diisi. Lihat docs/DECISIONS.md.
 */
export const isDemoMode = env.VITE_DEMO_MODE === 'true' || !isFirebaseConfigured;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (app || isDemoMode) return;
  app = initializeApp(firebaseConfig);

  const siteKey = env.VITE_APPCHECK_SITE_KEY as string | undefined;
  if (siteKey && typeof window !== 'undefined') {
    if (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN) {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        env.VITE_APPCHECK_DEBUG_TOKEN as string;
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

  if (env.VITE_USE_EMULATORS === 'true') {
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
