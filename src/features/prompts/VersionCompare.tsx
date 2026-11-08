import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select } from '@/components/ui/input';
import { diffWords } from '@/domain/diff';
import { formatDateTime } from '@/lib/format';
import type { Scene, SceneVersion } from '@/types';

const REASON: Record<SceneVersion['reason'], string> = { generated: 'Dibuat', edited: 'Diedit', regenerated: 'Regenerasi' };

export function versionLabel(v: SceneVersion) {
  return `${formatDateTime(v.createdAt)} · ${REASON[v.reason]}`;
}

/** Perbandingan dua versi berdampingan dengan penanda perbedaan + Pulihkan. */
export function VersionCompare({
  scene,
  open,
  onOpenChange,
  onRestore,
}: {
  scene: Scene;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRestore: (v: SceneVersion) => void;
}) {
  const [leftId, setLeftId] = React.useState<string>('');
  const versions = scene.versions;
  const left = versions.find((v) => v.id === leftId) ?? versions[1] ?? versions[0];
  const current = scene.flowPrompts.standard;
  const tokens = left ? diffWords(left.prompt, current) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Riwayat versi — {scene.title}</DialogTitle>
          <DialogDescription>Maksimal 5 versi, terbaru di depan. Memulihkan versi tidak mengubah scene lain.</DialogDescription>
        </DialogHeader>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada versi tersimpan.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={left?.id ?? ''} onChange={(e) => setLeftId(e.target.value)} className="w-auto" aria-label="Versi pembanding">
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {versionLabel(v)}
                  </option>
                ))}
              </Select>
              <span className="text-sm text-muted-foreground">dibanding prompt saat ini</span>
              {left && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    onRestore(left);
                    onOpenChange(false);
                  }}
                >
                  Pulihkan versi ini
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Versi terpilih</p>
                <p className="prose-prompt">
                  {tokens.filter((t) => t.type !== 'added').map((t, i) => (
                    <span key={i} className={t.type === 'removed' ? 'bg-destructive/20 line-through decoration-destructive/60' : undefined}>
                      {t.text}
                    </span>
                  ))}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Saat ini</p>
                <p className="prose-prompt">
                  {tokens.filter((t) => t.type !== 'removed').map((t, i) => (
                    <span key={i} className={t.type === 'added' ? 'bg-success/20' : undefined}>
                      {t.text}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
