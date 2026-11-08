import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { CallOptions } from '@/ai/aiService';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useUiStore } from '@/stores/uiStore';
import { useVaultStore } from '@/vault/vaultStore';
import type { AiTask, Result } from '@/types';

/**
 * Jalankan aksi AI dengan status global (satu request aktif), pengecekan vault, dan pesan error Indonesia.
 * Error tidak pernah menimpa data lama — pemanggil hanya menyimpan hasil jika sukses.
 */
export function useAiAction() {
  const navigate = useNavigate();
  return async function run<T>(task: AiTask, fn: (opts: CallOptions) => Promise<Result<T>>): Promise<T | null> {
    const vault = useVaultStore.getState();
    if (vault.status === 'uninitialized' || vault.keys.length === 0) {
      toast.error('Belum ada API key. Tambahkan di menu AI Provider agar fitur AI bisa dipakai.', {
        action: { label: 'Buka AI Provider', onClick: () => navigate('/provider') },
      });
      return null;
    }
    if (vault.status === 'locked') {
      useUiStore.getState().setUnlockOpen(true);
      return null;
    }
    const status = useAiStatusStore.getState();
    const controller = status.start(task);
    if (!controller) {
      toast.warning('Masih ada permintaan AI yang berjalan. Tunggu atau batalkan dulu.');
      return null;
    }
    const r = await fn({ signal: controller.signal, onProgress: (p, d) => useAiStatusStore.getState().progress(p, d) });
    if (r.ok) {
      useAiStatusStore.getState().finish(null);
      return r.value;
    }
    useAiStatusStore.getState().finish(r.error.code === 'aborted' ? null : r.error);
    if (r.error.code === 'vault_locked') useUiStore.getState().setUnlockOpen(true);
    else if (r.error.code !== 'aborted') toast.error(r.error.message);
    else toast.info('Permintaan dibatalkan.');
    return null;
  };
}
