import * as React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/common/states';
import { deleteBrand, duplicateBrand } from '@/data/brandRepo';
import { formatRelative } from '@/lib/format';
import type { Brand } from '@/types';
import { useBrands } from './useBrands';

export default function BrandsPage() {
  const { brands, loading, error, reload, uid } = useBrands();
  const [toDelete, setToDelete] = React.useState<Brand | null>(null);

  return (
    <div>
      <PageHeader
        title="Brand Profile"
        description="Identitas brand dipakai sebagai konteks di setiap brief."
        actions={
          <Button asChild>
            <Link to="/brands/new">
              <Plus /> Brand baru
            </Link>
          </Button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : brands.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum ada brand"
          description="Buat brand terlebih dahulu; setiap project wajib memilih brand."
          action={
            <Button asChild>
              <Link to="/brands/new">Buat brand</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Card key={b.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate">{b.name}</CardTitle>
                  <div className="flex shrink-0 gap-1">
                    {b.colors.slice(0, 4).map((c) => (
                      <span key={c} className="h-4 w-4 rounded-full border" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{b.tagline || b.industry || 'Tanpa tagline'}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Diubah {formatRelative(b.updatedAt)}</span>
                <div className="flex gap-1">
                  <Button asChild size="icon" variant="ghost" aria-label={`Edit ${b.name}`}>
                    <Link to={`/brands/${b.id}`}>
                      <Pencil />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Duplikat ${b.name}`}
                    onClick={async () => {
                      if (!uid) return;
                      await duplicateBrand(uid, b);
                      toast.success('Brand diduplikat');
                      void reload();
                    }}
                  >
                    <Copy />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Hapus ${b.name}`} onClick={() => setToDelete(b)}>
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`Hapus brand "${toDelete?.name}"?`}
        description="Project yang memakai brand ini tetap ada, tetapi kehilangan konteks brand."
        destructive
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!uid || !toDelete) return;
          await deleteBrand(uid, toDelete.id);
          toast.success('Brand dihapus');
          void reload();
        }}
      />
    </div>
  );
}
