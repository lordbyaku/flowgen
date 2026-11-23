import { Link } from 'react-router-dom';
import { ImageIcon, RefreshCw, Sparkles, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { AiErrorPanel } from '@/components/common/AiStatus';
import { CopyButton } from '@/components/common/CopyButton';
import { CostHint } from '@/components/common/CostHint';
import { EmptyState } from '@/components/common/states';
import { LABELS, TRACKER_STATUSES } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { hookCopyText, hookLetter, isHookProduced, mergeHooks, openingScene } from '@/domain/hooks';
import { frameCopyText } from '@/domain/promptText';
import { useAiAction } from '@/features/shared/useAiAction';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useProjectStore } from '@/stores/projectStore';
import type { HookVariant, TrackerStatus } from '@/types';

function HookCard({ hook, index, onChange, onDelete }: { hook: HookVariant; index: number; onChange: (h: HookVariant) => void; onDelete: () => void }) {
  const patch = (p: Partial<HookVariant>) => onChange({ ...hook, ...p, updatedAt: Date.now() });
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{hookLetter(index)}</Badge>
          <Badge variant="secondary">{LABELS.hookStyle[hook.hookStyle]}</Badge>
          <p className="min-w-0 flex-1 truncate font-medium">{hook.title}</p>
          <Button size="icon" variant="ghost" aria-label={`Hapus ${hookLetter(index)}`} onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{hook.rationale}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{hook.visualDescription}</p>
        {hook.voiceOver && (
          <p>
            <span className="text-xs font-medium text-muted-foreground">VO: </span>
            {hook.voiceOver}
          </p>
        )}
        {hook.textOverlay && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Teks overlay (CapCut):</span>
            <span className="min-w-0 flex-1 font-semibold">“{hook.textOverlay}”</span>
            <CopyButton label="Salin" getText={() => hook.textOverlay} />
          </div>
        )}
        <div className="rounded-md bg-muted/60 p-3">
          <p className="prose-prompt">{hook.flowPrompt}</p>
          {hook.negativePrompt && (
            <p className="prose-prompt mt-3 border-t pt-2 text-muted-foreground">
              <strong>Avoid:</strong> {hook.negativePrompt}
            </p>
          )}
        </div>
        {hook.framePrompts && (hook.framePrompts.start || hook.framePrompts.end) && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Prompt gambar frame
            </p>
            {(['start', 'end'] as const).map((k) =>
              hook.framePrompts?.[k] ? (
                <div key={k} className="flex items-start gap-2">
                  <p className="prose-prompt min-w-0 flex-1 text-xs">{hook.framePrompts[k]}</p>
                  <CopyButton
                    label={k === 'start' ? 'Frame awal' : 'Frame akhir'}
                    getText={() => frameCopyText(hook, k)}
                  />
                </div>
              ) : null,
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            label="Salin prompt"
            getText={() => hookCopyText(hook)}
            onCopied={() => hook.tracker === 'prompt_ready' && patch({ tracker: 'copied' })}
          />
          <Select
            value={hook.tracker}
            onChange={(e) => patch({ tracker: e.target.value as TrackerStatus })}
            aria-label={`Status ${hookLetter(index)}`}
            className="h-8 w-auto text-xs"
          >
            {TRACKER_STATUSES.map((t) => (
              <option key={t} value={t}>
                {LABELS.tracker[t]}
              </option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HooksPage() {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const setDoc = useProjectStore((s) => s.setDoc);
  const running = useAiStatusStore((s) => s.running);
  const run = useAiAction();
  const scenes = docs.scenes?.items ?? [];
  const opening = openingScene(scenes);
  const hooks = docs.hooks;
  const concept = docs.creative?.concepts.find((c) => c.id === docs.creative?.selectedConceptId) ?? null;
  const stale = !!hooks && !!opening && hooks.baseSceneId !== opening.id;

  const generate = async () => {
    if (!opening) return;
    const produced = hooks && !stale ? hooks.items.filter(isHookProduced) : [];
    const r = await run('hook_variants', (opts) =>
      aiService.generateHookVariants(
        { brief: project.brief, scenes, bibles: docs.bibles, assets: docs.assets, concept, avoidStyles: produced.map((h) => h.hookStyle) },
        opts,
      ),
    );
    if (!r) return;
    setDoc('hooks', mergeHooks(hooks, r, opening.id, Date.now()));
    toast.success(`${r.length} varian hook dibuat`);
  };

  const save = (items: HookVariant[]) => hooks && setDoc('hooks', { ...hooks, items, updatedAt: Date.now() });

  if (!opening || !docs.bibles)
    return (
      <EmptyState
        icon={Zap}
        title="Storyboard belum ada"
        description="Varian hook dibuat dari scene pembuka dan Character/Visual Bible."
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/storyboard`}>Ke Storyboard</Link>
          </Button>
        }
      />
    );

  const items = hooks?.items ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Varian Hook</h2>
          <p className="text-sm text-muted-foreground">Scene pembuka alternatif dengan gaya hook berbeda. Badan video tetap sama.</p>
          <CostHint est={aiService.estimate('hooks', { brief: project.brief, scenes, bibles: docs.bibles, assets: docs.assets, concept })} />
        </div>
        <Button onClick={generate} disabled={!!running} loading={running === 'hook_variants'} variant={items.length ? 'outline' : 'default'}>
          {items.length ? <RefreshCw /> : <Sparkles />} {items.length ? 'Buat ulang (yang belum diproduksi)' : 'Buat 3 varian hook'}
        </Button>
      </div>
      <Alert variant="info" title="Cara pakai di CapCut">
        Render klip tiap varian di Flow. Di CapCut, duplikat project video, lalu ganti scene 1 dengan klip varian (dan teks overlay-nya).
        Satu produksi menghasilkan beberapa video untuk diuji. Catat hasilnya di tahap Posting.
      </Alert>
      {stale && (
        <Alert variant="warning" title="Scene pembuka sudah berubah">
          Varian di bawah dibuat untuk scene pembuka lama. Buat ulang agar sesuai storyboard sekarang.
        </Alert>
      )}
      <AiErrorPanel onRetry={generate} />
      <Card className="p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Hook utama (scene 1 di storyboard)</p>
        <p className="font-medium">{opening.title}</p>
        <p className="text-muted-foreground">
          {opening.durationSec} dtk{opening.voiceOver ? ` · VO: ${opening.voiceOver}` : ''}
          {opening.textOverlay ? ` · Overlay: “${opening.textOverlay}”` : ''}
        </p>
      </Card>
      <div className="grid gap-3 xl:grid-cols-2">
        {items.map((h, i) => (
          <HookCard
            key={h.id}
            hook={h}
            index={i}
            onChange={(n) => save(items.map((x) => (x.id === n.id ? n : x)))}
            onDelete={() => save(items.filter((x) => x.id !== h.id))}
          />
        ))}
      </div>
    </div>
  );
}
