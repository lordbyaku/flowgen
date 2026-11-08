import * as React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from './routes';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { useProjectStore } from './stores/projectStore';
import { useVaultStore } from './vault/vaultStore';

export default function App() {
  const initAuth = useAuthStore((s) => s.init);
  const setOnline = useUiStore((s) => s.setOnline);

  React.useEffect(() => initAuth(), [initAuth]);

  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    // Simpan perubahan tertunda sebelum tab ditutup.
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const s = useProjectStore.getState();
      if (s.dirtyFields.size || s.dirtyDocs.size) {
        // Cadangan sinkron dulu (flush async tidak dijamin selesai), lalu coba simpan.
        s.backupPending();
        void s.flush();
        e.preventDefault();
      }
      // Mode sesi: key hilang saat reload/tutup tab — minta konfirmasi browser.
      const v = useVaultStore.getState();
      if (v.meta?.mode === 'session' && v.keys.length > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [setOnline]);

  return (
    <TooltipProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster richColors position="top-center" closeButton />
    </TooltipProvider>
  );
}
