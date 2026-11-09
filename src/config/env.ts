// Konfigurasi lingkungan tanpa mengimpor SDK Firebase (agar Mode Demo tidak memuat Firebase).
// Selalu akses `import.meta.env.VITE_X` langsung: menyimpan `import.meta.env` ke variabel membuat Vite
// menanam SELURUH objek env (termasuk token debug) ke bundle produksi.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/**
 * Mode Demo Lokal: tanpa Firebase, data project disimpan di IndexedDB browser ini.
 * Aktif jika VITE_DEMO_MODE=true atau konfigurasi Firebase belum diisi. Lihat docs/DECISIONS.md.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !isFirebaseConfigured;
