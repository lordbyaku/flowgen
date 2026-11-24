import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, Textarea } from '@/components/ui/input';
import { FLOW_ISSUES, LABELS } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { useAiAction } from '@/features/shared/useAiAction';
import { CopyButton } from '@/components/common/CopyButton';
import { useProjectStore } from '@/stores/projectStore';
import type { FlowIssue, Scene, Variant } from '@/types';

/**
 * Klip hasil Flow gagal → pilih masalahnya → AI menulis ulang prompt scene itu saja (satu panggilan kecil).
 * Storyboard (aksi, VO, durasi) tidak berubah; versi lama masuk riwayat.
 */
export function FixPromptDialog({
  scene,
  onOpenChange,
  defaultVariant = 'standard',
  onFixed,
}: {
  scene: Scene | null;
  onOpenChange: (v: boolean) => void;
  defaultVariant?: Variant;
  onFixed?: (s: Scene) => void;
}) {
  const [issues, setIssues] = React.useState<FlowIssue[]>([]);
  const [note, setNote] = React.useState('');
  const [variant, setVariant] = React.useState<Variant>(defaultVariant);
  const [mode, setMode] = React.useState<'rewrite' | 'edit'>('rewrite');
  const run = useAiAction();
  const variants: Variant[] = useProjectStore((s) => s.project?.brief.output.variants) ?? ['standard'];
  const available = variants.filter((v) => v === 'standard' || scene?.flowPrompts[v]);

  React.useEffect(() => {
    if (scene) {
      setIssues([]);
      setNote('');
      setVariant(defaultVariant);
      setMode('rewrite');
    }
  }, [scene, defaultVariant]);

  const toggle = (i: FlowIssue) => setIssues((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  const submit = async () => {
    const st = useProjectStore.getState();
    if (!st.project || !scene) return;
    onOpenChange(false);
    const fixed = await run('prompt_fix', (opts) =>
      aiService.fixScenePrompt(
        st.project!.brief,
        { scenes: st.docs.scenes?.items ?? [], sceneId: scene.id, bibles: st.docs.bibles, assets: st.docs.assets, variant, issues, note, mode },
        opts,
      ),
    );
    if (!fixed) return;
    useProjectStore.getState().updateScenes((cur) => cur.map((s) => (s.id === fixed.id ? fixed : s)));
    toast.success(mode === 'edit' ? 'Instruksi edit siap. Lampirkan klip di Flow lalu tempel instruksinya.' : 'Prompt diperbaiki. Salin lalu render ulang di Flow.');
    onFixed?.(fixed);
  };

  return (
    <Dialog open={!!scene} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perbaiki dari hasil Flow: {scene?.title}</DialogTitle>
          <DialogDescription>Pilih masalah pada klip. Hanya prompt scene ini yang ditulis ulang; naskah dan durasi tetap.</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium">Apa yang salah?</legend>
          {FLOW_ISSUES.map((i) => (
            <label key={i} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <input type="checkbox" checked={issues.includes(i)} onChange={() => toggle(i)} />
              {LABELS.flowIssue[i]}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium">Cara memperbaiki</legend>
          {(
            [
              ['rewrite', 'Tulis ulang prompt', 'Render ulang klip dari nol dengan prompt yang lebih tegas.'],
              ['edit', 'Instruksi edit klip (Omni)', 'Klip yang sudah jadi diedit di Flow. Prompt scene tidak berubah.'],
            ] as const
          ).map(([v, label, desc]) => (
            <label key={v} className="flex items-start gap-2 rounded-md border p-2 text-sm">
              <input type="radio" name="fix-mode" className="mt-1" checked={mode === v} onChange={() => setMode(v)} />
              <span>
                <span className="font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Catatan (opsional)</span>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Bu Sari jadi berambut panjang tanpa hijab di detik ke-3" />
        </label>
        {available.length > 1 && (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Varian prompt yang dipakai</span>
            <Select value={variant} onChange={(e) => setVariant(e.target.value as Variant)}>
              {available.map((v) => (
                <option key={v} value={v}>
                  {LABELS.variant[v]}
                </option>
              ))}
            </Select>
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={issues.length === 0 && !note.trim()}>
            {mode === 'edit' ? 'Buat instruksi edit' : 'Perbaiki prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ringkasan perbaikan terakhir (ditampilkan di kartu prompt/tracker). */
export function LastFixNote({ scene }: { scene: Scene }) {
  const f = scene.lastFix;
  if (!f) return null;
  return (
    <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">{f.mode === 'edit' ? 'Instruksi edit klip:' : 'Diperbaiki:'}</span>{' '}
        {f.issues.map((i) => LABELS.flowIssue[i]).join(', ') || f.note}
      </p>
      {f.mode === 'edit' && f.editInstruction && (
        <div className="mt-1 space-y-1">
          <p className="whitespace-pre-wrap rounded bg-muted p-2 font-mono text-foreground">{f.editInstruction}</p>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton label="Salin instruksi edit" getText={() => f.editInstruction ?? ''} />
            <span>Di Flow: lampirkan klip (+ → Videos), tempel instruksi ini. Biaya edit sama dengan generate per detik.</span>
          </div>
        </div>
      )}
      {f.changes.length > 0 && (
        <ul className="mt-1 list-disc pl-4">
          {f.changes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
