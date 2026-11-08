// Konfigurasi lingkungan tanpa mengimpor SDK Firebase (agar Mode Demo tidak memuat Firebase).
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
