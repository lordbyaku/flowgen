import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { ANGLES, ASPECT_RATIOS, LABELS } from '@/config/enums';
import { createDerivedProject } from '@/data/projectRepo';
import { checkCutdown, deriveCutdown, deriveRatio, deriveSeries, type DerivedDraft, type SeriesPart } from '@/domain/derive';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Angle, AspectRatio, Project } from '@/types';

export type DeriveKind = NonNullable<Project['derivation']>;

const DESCRIPTION: Record<DeriveKind, string> = {
  series:
    'Beberapa project baru dengan angle berbeda. Brief, Character/Visual Bible, dan aset Flow disalin, jadi karakter dan tempat yang sudah dibuat di Flow bisa dipakai lagi. Konsep, naskah, dan scene dibuat baru per bagian.',
  cutdown:
    'Project baru dari scene yang dipilih. Prompt dan status produksi disalin, jadi klip yang sudah dirender bisa dipakai ulang tanpa render baru. Timeline CapCut dihitung ulang.',
  ratio:
    'Project baru dengan rasio lain. Konsep, naskah, storyboard, dan Bible disalin. Prompt scene dikosongkan karena rasio ada di dalam prompt, jadi cukup klik "Buat prompt" sekali lagi.',
};

/** Konten turunan tanpa panggilan AI: seri, versi pendek, rasio lain. */
export function DeriveDialog({ kind, onOpenChange }: { kind: DeriveKind | null; onOpenChange: (v: boolean) => void }) {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const uid = useAuthStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);
  const scenes = [...(docs.scenes?.items ?? [])].sort((a, b) => a.order - b.order);
  const currentAngle = docs.creative?.concepts.find((c) => c.id === docs.creative?.selectedConceptId)?.angle;
  const defaultAngles = ANGLES.filter((a) => a !== currentAngle);
  const [parts, setParts] = React.useState<SeriesPart[]>([]);
  const [keep, setKeep] = React.useState<string[]>([]);
  const ratios = ASPECT_RATIOS.filter((r) => r !== project.brief.project.aspectRatio);
  const [ratio, setRatio] = React.useState<AspectRatio>(ratios[0]);

  React.useEffect(() => {
    if (!kind) return;
    setParts(defaultAngles.slice(0, 2).map((angle) => ({ angle, focus: '' })));
    setKeep(scenes.map((s) => s.id));
    setRatio(ratios[0]);
    // Reset hanya saat dialog dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const cut = checkCutdown(scenes, keep);

  const create = async () => {
    if (!uid || !kind) return;
    let drafts: DerivedDraft[];
    try {
      drafts =
        kind === 'series' ? deriveSeries(project, docs, parts) : kind === 'cutdown' ? [deriveCutdown(project, docs, keep)] : [deriveRatio(project, docs, ratio)];
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Tidak bisa membuat konten turunan.');
      return;
    }
    setBusy(true);
    try {
      await useProjectStore.getState().flush();
      const created: Project[] = [];
      for (const d of drafts) created.push(await createDerivedProject(uid, project, d));
      toast.success(created.length > 1 ? `${created.length} project seri dibuat` : `Project "${created[0].name}" dibuat`);
      onOpenChange(false);
      navigate(created.length > 1 ? '/projects' : `/projects/${created[0].id}`);
    } catch {
      toast.error('Gagal membuat project turunan. Periksa koneksi lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const disabled =
    busy ||
    (kind === 'cutdown' && !cut.valid) ||
    (kind === 'ratio' && scenes.length === 0) ||
    (kind === 'series' && new Set(parts.map((p) => p.angle)).size !== parts.length);

  return (
    <Dialog open={!!kind} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konten turunan: {kind ? LABELS.derivation[kind] : ''}</DialogTitle>
          <DialogDescription>{kind ? DESCRIPTION[kind] : ''}</DialogDescription>
        </DialogHeader>

        {kind === 'series' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              Jumlah bagian
              <Select
                className="w-20"
                value={parts.length}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setParts((cur) =>
                    n <= cur.length
                      ? cur.slice(0, n)
                      : [...cur, ...defaultAngles.filter((a) => !cur.some((p) => p.angle === a)).slice(0, n - cur.length).map((angle) => ({ angle, focus: '' }))],
                  );
                }}
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
            {parts.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-2">
                <Select
                  aria-label={`Angle bagian ${i + 1}`}
                  value={p.angle}
                  onChange={(e) => setParts((cur) => cur.map((x, k) => (k === i ? { ...x, angle: e.target.value as Angle } : x)))}
                >
                  {ANGLES.map((a) => (
                    <option key={a} value={a}>
                      Part {i + 1}: {LABELS.angle[a]}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={`Fokus bagian ${i + 1}`}
                  placeholder="Fokus (opsional), mis. fitur stok"
                  value={p.focus}
                  onChange={(e) => setParts((cur) => cur.map((x, k) => (k === i ? { ...x, focus: e.target.value } : x)))}
                />
              </div>
            ))}
            {new Set(parts.map((p) => p.angle)).size !== parts.length && <p className="text-xs text-destructive">Setiap bagian harus memakai angle berbeda.</p>}
          </div>
        )}

        {kind === 'cutdown' &&
          (scenes.length < 2 ? (
            <Alert variant="warning" title="Minimal 2 scene">Versi pendek butuh storyboard dengan beberapa scene.</Alert>
          ) : (
            <div className="space-y-2">
              {scenes.map((s, i) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={keep.includes(s.id)}
                    onChange={(e) => setKeep((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
                  />
                  <span className="flex-1">
                    {i + 1}. {s.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.durationSec} dtk</span>
                </label>
              ))}
              <p className="text-sm">
                Durasi baru: <strong>{cut.durationSec} dtk</strong> (sumber {project.brief.project.durationSec} dtk)
              </p>
              {!cut.hasHook && <p className="text-xs text-warning">Scene pembuka (hook) tidak ikut — video bisa kurang menarik di detik pertama.</p>}
              {!cut.hasCta && <p className="text-xs text-warning">Scene penutup (CTA) tidak ikut — penonton tidak tahu harus melakukan apa.</p>}
              {cut.durationSec < 5 && <p className="text-xs text-destructive">Durasi minimal 5 detik.</p>}
              {keep.length === scenes.length && <p className="text-xs text-destructive">Hapus centang minimal satu scene.</p>}
            </div>
          ))}

        {kind === 'ratio' && (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Rasio baru (sumber {project.brief.project.aspectRatio})</span>
            <Select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)}>
              {ratios.map((r) => (
                <option key={r} value={r}>
                  {LABELS.aspectRatio[r]}
                </option>
              ))}
            </Select>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={create} disabled={disabled} loading={busy}>
            {kind === 'series' ? `Buat ${parts.length} project` : 'Buat project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
