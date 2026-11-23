import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Clapperboard, RotateCcw, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Alert, Progress } from '@/components/ui/misc';
import { CopyButton } from '@/components/common/CopyButton';
import { EmptyState } from '@/components/common/states';
import { LABELS } from '@/config/enums';
import { buildShootQueue, firstPending, nextPending, type ShootItem } from '@/domain/shootQueue';
import { FixPromptDialog, LastFixNote } from '@/features/prompts/FixPromptDialog';
import { useProjectStore } from '@/stores/projectStore';
import type { Scene, TrackerStatus, Variant } from '@/types';

const GROUP_LABEL: Record<ShootItem['group'], string> = { asset: 'Aset Flow', scene: 'Scene', hook: 'Varian hook' };

/** Mode produksi untuk HP: satu item per layar, salin → buat di Flow → tandai → lanjut. */
export default function ShootPage() {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const setDoc = useProjectStore((s) => s.setDoc);
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const [params, setParams] = useSearchParams();
  const variants = project.brief.output.variants;
  const [variant, setVariant] = React.useState<Variant>(variants[0] ?? 'standard');
  const [fixing, setFixing] = React.useState<Scene | null>(null);

  const scenes = docs.scenes?.items ?? [];
  const queue = buildShootQueue(project.brief, { scenes, assets: docs.assets, hooks: docs.hooks }, variant);
  const raw = Number(params.get('i'));
  const index = Number.isInteger(raw) && params.has('i') ? Math.min(Math.max(raw, 0), Math.max(queue.length - 1, 0)) : firstPending(queue);
  const item = queue[index];
  const doneCount = queue.filter((q) => q.done).length;

  const go = (i: number) => {
    setParams({ i: String(i) }, { replace: true });
    document.getElementById('main')?.scrollIntoView?.({ block: 'start' });
  };

  const setTracker = (it: ShootItem, tracker: TrackerStatus) => {
    const t = it.target;
    if (t.kind === 'scene') updateScenes((cur) => cur.map((s) => (s.id === t.id ? { ...s, tracker, updatedAt: Date.now() } : s)));
    if (t.kind === 'hook' && docs.hooks)
      setDoc('hooks', {
        ...docs.hooks,
        items: docs.hooks.items.map((h) => (h.id === t.id ? { ...h, tracker, updatedAt: Date.now() } : h)),
        updatedAt: Date.now(),
      });
  };

  const setAssetDone = (it: ShootItem, done: boolean) => {
    const a = docs.assets;
    const t = it.target;
    if (!a) return;
    setDoc('assets', {
      ...a,
      characters: a.characters.map((c) => (t.kind === 'character' && c.id === t.id ? { ...c, done } : c)),
      locations: a.locations.map((l) => (t.kind === 'location' && l.id === t.id ? { ...l, done } : l)),
      product: a.product && t.kind === 'product' ? { ...a.product, done } : a.product,
      updatedAt: Date.now(),
    });
  };

  const markDone = (it: ShootItem) => {
    if (it.group === 'asset') setAssetDone(it, true);
    else setTracker(it, 'clip_generated');
    const after = queue.map((q) => (q.key === it.key ? { ...q, done: true } : q));
    const n = nextPending(after, index);
    if (n === null) toast.success('Semua item selesai dibuat di Flow');
    else go(n);
  };

  const undo = (it: ShootItem) => (it.group === 'asset' ? setAssetDone(it, false) : setTracker(it, 'copied'));

  const onCopied = (it: ShootItem) => {
    if (it.group !== 'asset' && it.tracker === 'prompt_ready') setTracker(it, 'copied');
  };

  if (!item)
    return (
      <EmptyState
        icon={Clapperboard}
        title="Belum ada yang perlu dibuat di Flow"
        description="Buat prompt scene dulu."
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/prompts`}>Ke Prompt</Link>
          </Button>
        }
      />
    );

  const target = item.target;
  const scene = target.kind === 'scene' ? (scenes.find((s) => s.id === target.id) ?? null) : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-24 md:pb-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mode Produksi</h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {index + 1}/{queue.length} · {doneCount} selesai
          </span>
        </div>
        <Progress value={(100 * doneCount) / queue.length} label="Progres produksi" />
        {variants.length > 1 && (
          <Select value={variant} onChange={(e) => setVariant(e.target.value as Variant)} aria-label="Varian prompt" className="h-8 text-xs">
            {variants.map((v) => (
              <option key={v} value={v}>
                Varian: {LABELS.variant[v]}
              </option>
            ))}
          </Select>
        )}
      </div>

      {doneCount === queue.length && (
        <Alert
          variant="success"
          title="Semua sudah dibuat di Flow"
          action={
            <Button asChild size="sm" variant="outline">
              <Link to={`/projects/${project.id}/capcut`}>Ke CapCut</Link>
            </Button>
          }
        >
          Unduh klipnya, lalu susun di CapCut.
        </Alert>
      )}

      <Card className={item.done ? 'border-success/50' : undefined}>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{GROUP_LABEL[item.group]}</Badge>
            {item.tracker && <Badge variant="outline">{LABELS.tracker[item.tracker]}</Badge>}
            {item.done && (
              <Badge variant="success">
                <CheckCircle2 /> Selesai
              </Badge>
            )}
          </div>
          <CardTitle className="text-base">{item.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {item.context.map((c, i) => (
            <p key={i} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
              {c}
            </p>
          ))}
          {item.copies.length === 0 ? (
            <Alert variant="warning" title="Prompt belum ada">
              Buat prompt di halaman Prompt dulu.
            </Alert>
          ) : (
            item.copies.map((c) => (
              <div key={c.label} className="space-y-2">
                <CopyButton label={`Salin ${c.label.toLowerCase()}`} size="lg" variant="default" className="h-12 w-full text-base" getText={() => c.text} onCopied={() => onCopied(item)} />
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Lihat teks</summary>
                  <p className="prose-prompt mt-2 whitespace-pre-wrap">{c.text}</p>
                </details>
              </div>
            ))
          )}
          {scene && <LastFixNote scene={scene} />}
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {item.done ? (
          <Button size="lg" variant="outline" className="h-12" onClick={() => undo(item)}>
            <RotateCcw /> Tandai belum dibuat
          </Button>
        ) : (
          <Button size="lg" className="h-12 bg-success text-white hover:bg-success/90" onClick={() => markDone(item)} disabled={item.copies.length === 0}>
            <CheckCircle2 /> Sudah dibuat di Flow
          </Button>
        )}
        {scene && scene.flowPrompts.standard && (
          <Button size="lg" variant="outline" className="h-12" onClick={() => setFixing(scene)}>
            <Wrench /> Hasil gagal, perbaiki prompt
          </Button>
        )}
      </div>

      <nav aria-label="Navigasi item" className="fixed inset-x-0 bottom-14 z-20 flex gap-2 border-t bg-background/95 p-2 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <Button variant="outline" className="h-11 flex-1" onClick={() => go(index - 1)} disabled={index === 0}>
          <ChevronLeft /> Sebelumnya
        </Button>
        <Button variant="outline" className="h-11 flex-1" onClick={() => go(index + 1)} disabled={index >= queue.length - 1}>
          Lanjut <ChevronRight />
        </Button>
      </nav>

      <FixPromptDialog scene={fixing} onOpenChange={(v) => !v && setFixing(null)} defaultVariant={variant} />
    </div>
  );
}
