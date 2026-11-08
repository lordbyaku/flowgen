import * as React from 'react';
import { Link } from 'react-router-dom';
import { Copy, FolderKanban, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Progress } from '@/components/ui/misc';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/common/states';
import { LABELS, PROJECT_STATUSES } from '@/config/enums';
import { deleteProject, duplicateProject, listProjects } from '@/data/projectRepo';
import { formatRelative } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [items, setItems] = React.useState<Project[]>([]);
  const [cursor, setCursor] = React.useState<unknown | null>(null);
  const [status, setStatus] = React.useState('');
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [more, setMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<Project | null>(null);

  const load = React.useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const page = await listProjects(uid, { status: status || undefined });
      setItems(page.items);
      setCursor(page.cursor);
    } catch {
      setError('Gagal memuat project.');
    } finally {
      setLoading(false);
    }
  }, [uid, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!uid || !cursor) return;
    setMore(true);
    try {
      const page = await listProjects(uid, { status: status || undefined, cursor });
      setItems((x) => [...x, ...page.items]);
      setCursor(page.cursor);
    } finally {
      setMore(false);
    }
  };

  const filtered = items.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Semua project video promosi Anda."
        actions={
          <Button asChild>
            <Link to="/projects/new">
              <Plus /> Project baru
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama project…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" aria-label="Cari project" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48" aria-label="Filter status">
          <option value="">Semua status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABELS.projectStatus[s]}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={items.length ? 'Tidak ada yang cocok' : 'Belum ada project'}
          description={items.length ? 'Ubah kata kunci atau filter.' : 'Mulai dari preset atau brief kosong.'}
          action={
            !items.length && (
              <Button asChild>
                <Link to="/projects/new">Buat project</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link to={`/projects/${p.id}`} className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium hover:underline">{p.name || 'Project tanpa nama'}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={p.status === 'completed' ? 'success' : p.status === 'in_progress' ? 'default' : 'muted'}>
                    {LABELS.projectStatus[p.status]}
                  </Badge>
                  <span>Tahap: {LABELS.stage[p.stage]}</span>
                  <span>· {p.brief.project.durationSec} detik · {p.brief.project.aspectRatio}</span>
                  <span>· diubah {formatRelative(p.updatedAt)}</span>
                </div>
              </Link>
              <div className="flex items-center gap-3 sm:w-56">
                <div className="flex-1">
                  <Progress value={p.completeness} label="Kelengkapan brief" />
                  <p className="mt-1 text-xs text-muted-foreground">Brief {p.completeness}%</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Duplikat ${p.name}`}
                  onClick={async () => {
                    if (!uid) return;
                    await duplicateProject(uid, p);
                    toast.success('Project diduplikat');
                    void load();
                  }}
                >
                  <Copy />
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Hapus ${p.name}`} onClick={() => setToDelete(p)}>
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
          {cursor !== null && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} loading={more}>
                Muat lagi
              </Button>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`Hapus project "${toDelete?.name}"?`}
        description="Brief, konsep, naskah, storyboard, dan prompt ikut terhapus. Tindakan ini tidak dapat dibatalkan."
        destructive
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!uid || !toDelete) return;
          await deleteProject(uid, toDelete.id);
          toast.success('Project dihapus');
          void load();
        }}
      />
    </div>
  );
}
