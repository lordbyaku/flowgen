import * as React from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { MSG } from '@/ai/messages';
import { assetsProgress } from '@/domain/assets';
import { cn } from '@/lib/utils';

export const HUB_STEPS = [
  { to: 'brief', label: 'Brief' },
  { to: 'concepts', label: 'Konsep' },
  { to: 'script', label: 'Naskah' },
  { to: 'storyboard', label: 'Storyboard' },
  { to: 'assets', label: 'Karakter & Tempat' },
  { to: 'prompts', label: 'Prompt' },
  { to: 'production', label: 'Produksi' },
  { to: 'capcut', label: 'CapCut' },
  { to: 'export', label: 'Export' },
] as const;

export default function ProjectHub() {
  const { id } = useParams();
  const uid = useAuthStore((s) => s.user?.uid);
  const { load, project, loading, loadError, remoteChanged, reloadFromRemote, dismissRemoteChange, saveStatus, flush, docs, trimmedWarning, invalidDocs, restoredBackup } =
    useProjectStore();

  React.useEffect(() => {
    if (uid && id) void load(uid, id);
  }, [uid, id, load]);

  React.useEffect(() => () => void useProjectStore.getState().unload(), []);

  if (loading || (!project && !loadError)) return <LoadingState label="Memuat project…" />;
  if (loadError || !project) return <ErrorState description={loadError ?? undefined} onRetry={() => uid && id && void load(uid, id)} />;

  const done: Record<string, boolean> = {
    brief: project.completeness >= 70,
    concepts: !!docs.creative?.approved,
    script: !!docs.script?.approved,
    storyboard: (docs.scenes?.items.length ?? 0) > 0,
    assets: !!docs.assets && assetsProgress(docs.assets).total > 0 && assetsProgress(docs.assets).done === assetsProgress(docs.assets).total,
    prompts: (docs.scenes?.items ?? []).some((s) => s.flowPrompts.standard),
    production: (docs.scenes?.items ?? []).length > 0 && (docs.scenes?.items ?? []).every((s) => s.tracker === 'final'),
    capcut: !!docs.capcut,
    export: false,
  };

  return (
    <div className="space-y-4">
      <nav aria-label="Tahapan project" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          <li>
            <NavLink
              to={`/projects/${project.id}`}
              end
              className={({ isActive }) => cn('block rounded-md px-3 py-1.5 text-sm', isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              Ringkasan
            </NavLink>
          </li>
          {HUB_STEPS.map((s, i) => (
            <li key={s.to}>
              <NavLink
                to={`/projects/${project.id}/${s.to}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm',
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )
                }
              >
                <span
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold',
                    done[s.to] ? 'bg-success text-white' : 'bg-muted text-muted-foreground',
                  )}
                  aria-label={done[s.to] ? 'selesai' : undefined}
                >
                  {done[s.to] ? '✓' : i + 1}
                </span>
                {s.label}
              </NavLink>
            </li>
          ))}
        </ol>
      </nav>

      {remoteChanged && (
        <Alert
          variant="warning"
          title="Project diubah di tab atau perangkat lain. Muat ulang?"
          action={
            <div className="flex gap-1">
              <Button size="sm" onClick={() => void reloadFromRemote()}>
                Muat ulang
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissRemoteChange}>
                Abaikan
              </Button>
            </div>
          }
        >
          Jika mengabaikan, perubahan dari tab ini akan menimpa (last-write-wins).
        </Alert>
      )}
      {saveStatus === 'error' && (
        <Alert
          variant="error"
          title="Gagal menyimpan"
          action={
            <Button size="sm" variant="outline" onClick={() => void flush()}>
              Coba lagi
            </Button>
          }
        >
          {MSG.saveFailed}
        </Alert>
      )}
      {restoredBackup && (
        <Alert variant="info" title="Perubahan yang belum tersimpan dipulihkan">
          Perubahan dari sesi sebelumnya (saat tab ditutup sebelum sempat tersimpan) dipulihkan dan sedang disimpan.
        </Alert>
      )}
      {trimmedWarning && (
        <Alert variant="warning" title="Riwayat versi dipangkas">
          Dokumen scene mendekati batas 1 MB Firestore, sehingga versi tertua dihapus.
        </Alert>
      )}
      {invalidDocs.length > 0 && (
        <Alert variant="warning" title="Sebagian data tidak valid">
          Dokumen berikut gagal divalidasi dan diabaikan: {invalidDocs.join(', ')}. Membuat ulang bagian tersebut akan menimpanya.
        </Alert>
      )}
      <Outlet />
    </div>
  );
}
