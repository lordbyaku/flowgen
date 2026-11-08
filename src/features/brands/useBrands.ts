import * as React from 'react';
import { listBrands } from '@/data/brandRepo';
import { useAuthStore } from '@/stores/authStore';
import type { Brand } from '@/types';

export function useBrands() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      setBrands(await listBrands(uid));
    } catch {
      setError('Gagal memuat brand.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { brands, loading, error, reload, uid };
}
