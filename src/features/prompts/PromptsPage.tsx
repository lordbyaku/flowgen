import * as React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, BookMarked, CheckCircle2, History, ImageIcon, Info, Pencil, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/misc';
import { AiErrorPanel } from '@/components/common/AiStatus';
import { CopyButton } from '@/components/common/CopyButton';
import { EmptyState } from '@/components/common/states';
import { CostHint } from '@/components/common/CostHint';
import { LABELS } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { applyLintFixes, FIX_LABEL, isFixable, lintScene, worstSeverity, type FixableRule, type LintIssue } from '@/domain/linter';
import { copyAllText, copyText, frameCopyText } from '@/domain/promptText';
import { pushVersion, restoreVersion } from '@/domain/sceneVersions';
import { countWords, cn } from '@/lib/utils';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAiAction } from '@/features/shared/useAiAction';
import { RegenDialog } from '@/features/storyboard/RegenDialog';
import { DurationBar } from '@/features/storyboard/StoryboardPage';
import type { Scene, Variant } from '@/types';
import { VersionCompare, versionLabel } from './VersionCompare';
import { SnippetPicker } from './SnippetPicker';

const SEV = {
  error: { icon: AlertCircle, variant: 'destructive' as const, label: 'error' },
  warn: { icon: AlertTriangle, variant: 'warning' as const, label: 'peringatan' },
  info: { icon: Info, variant: 'muted' as const, label: 'info' },
};

function LintBadge({ issues, onFix }: { issues: LintIssue[]; onFix: (rules: FixableRule[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const worst = worstSeverity(issues);
  const fixable = [...new Set(issues.map((i) => i.ruleId).filter(isFixable))];
  if (!worst)
    return (
      <Badge variant="success">
        <CheckCircle2 /> Linter OK
      </Badge>
    );
  const s = SEV[worst];
  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-full focus-visible:ring-2">
        <Badge variant={s.variant}>
          <s.icon /> {issues.length} {s.label} linter
        </Badge>
      </button>
      {open && (
        <ul className="mt-2 space-y-1 rounded-md border bg-muted/40 p-2 text-xs">
          {issues.map((i, k) => {
            const I = SEV[i.severity].icon;
            return (
              <li key={k} className="flex gap-1.5">
                <I className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', i.severity === 'error' ? 'text-destructive' : i.severity === 'warn' ? 'text-warning' : 'text-muted-foreground')} />
                <span className="flex-1">
                  <strong>{i.ruleId}</strong> {i.message}
                </span>
                {isFixable(i.ruleId) && (
                  <button type="button" className="shrink-0 text-primary underline" onClick={() => onFix([i.ruleId as FixableRule])}>
                    Perbaiki
                  </button>
                )}
              </li>
            );
          })}
          <li className="flex flex-wrap items-center gap-2 pt-1 text-muted-foreground">
            Peringatan tidak memblokir penyalinan.
            {fixable.length > 1 && (
              <button type="button" className="text-primary underline" onClick={() => onFix(fixable)}>
                <Wand2 className="mr-1 inline h-3 w-3" />
                Perbaiki semua ({fixable.length})
              </button>
            )}
          </li>
        </ul>
      )}
    </div>
  );
}

function PromptCard({ scene, index, variants, onRegen }: { scene: Scene; index: number; variants: Variant[]; onRegen: () => void }) {
  const project = useProjectStore((s) => s.project)!;
  const bibles = useProjectStore((s) => s.docs.bibles);
  const allScenes = useProjectStore((s) => s.docs.scenes?.items ?? []);
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const [variant, setVariant] = React.useState<Variant>('standard');
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [compare, setCompare] = React.useState(false);
  const [snip, setSnip] = React.useState(false);

  const lintCtx = { brief: project.brief, bibles, scenes: allScenes, variant };
  const issues = lintScene(scene, lintCtx, project.lintDisabled);
  const fix = (rules: FixableRule[]) => {
    const fixed = applyLintFixes(scene, lintCtx, rules, variant);
    save(pushVersion({ ...fixed, approved: false, updatedAt: Date.now() }, 'edited', Date.now()));
    toast.success(rules.length > 1 ? `${rules.length} perbaikan diterapkan` : FIX_LABEL[rules[0]]);
  };
  const available = variants.filter((v) => v === 'standard' || scene.flowPrompts[v]);
  const save = (next: Scene) => updateScenes((cur) => cur.map((s) => (s.id === next.id ? next : s)));

  const commitEdit = () => {
    const prompts = { ...scene.flowPrompts, [variant]: draft };
    save(pushVersion({ ...scene, flowPrompts: prompts, approved: false, updatedAt: Date.now() }, 'edited', Date.now()));
    setEditing(false);
    toast.success('Prompt disimpan sebagai versi baru');
  };

  return (
    <Card className={cn(scene.approved && 'border-success/50')}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
          <p className="min-w-0 flex-1 truncate font-medium">{scene.title}</p>
          <Badge variant="outline">{scene.durationSec} dtk</Badge>
          <Badge variant="secondary">{LABELS.tracker[scene.tracker]}</Badge>
          {scene.approved && (
            <Badge variant="success">
              <CheckCircle2 /> Approved
            </Badge>
          )}
        </div>
        <LintBadge issues={issues} onFix={fix} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={variant} onValueChange={(v) => setVariant(v as Variant)}>
          {available.length > 1 && (
            <TabsList>
              {available.map((v) => (
                <TabsTrigger key={v} value={v}>
                  {LABELS.variant[v]}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          {available.map((v) => (
            <TabsContent key={v} value={v} className={available.length > 1 ? undefined : 'mt-0'}>
              {editing && variant === v ? (
                <div className="space-y-2">
                  <Textarea className="prose-prompt min-h-48" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit prompt" />
                  <p className="text-xs text-muted-foreground">{countWords(draft)} kata</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={commitEdit}>
                      Simpan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-muted/60 p-3">
                  <p className="prose-prompt">{(v === 'standard' ? scene.flowPrompts.standard : scene.flowPrompts[v]) || '— belum ada prompt —'}</p>
                  {scene.negativePrompt && (
                    <p className="prose-prompt mt-3 border-t pt-2 text-muted-foreground">
                      <strong>Avoid:</strong> {scene.negativePrompt}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        {scene.framePrompts && (scene.framePrompts.start || scene.framePrompts.end) && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Prompt gambar frame ({LABELS.flowMode[project.brief.output.flowMode]}) — buat gambarnya dulu, lalu unggah ke Flow
            </p>
            {(['start', 'end'] as const).map((k) =>
              scene.framePrompts?.[k] ? (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{k === 'start' ? 'Frame awal' : 'Frame akhir'}</span>
                    <CopyButton label="Salin" getText={() => frameCopyText(scene, k)} />
                  </div>
                  <p className="prose-prompt text-xs">{scene.framePrompts[k]}</p>
                </div>
              ) : null,
            )}
          </div>
        )}
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <CopyButton
              label="Salin"
              getText={() => copyText(scene, variant)}
              onCopied={() => scene.tracker === 'prompt_ready' && save({ ...scene, tracker: 'copied', updatedAt: Date.now() })}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft((variant === 'standard' ? scene.flowPrompts.standard : scene.flowPrompts[variant]) ?? '');
                setEditing(true);
              }}
            >
              <Pencil /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSnip(true)}>
              <BookMarked /> Sisipkan
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCompare(true)} disabled={scene.versions.length === 0}>
              <History /> Versi ({scene.versions.length})
            </Button>
            <Button size="sm" variant="outline" onClick={onRegen}>
              <RefreshCw /> Regenerate
            </Button>
            <Button size="sm" variant={scene.approved ? 'secondary' : 'default'} onClick={() => save({ ...scene, approved: !scene.approved })}>
              <CheckCircle2 /> {scene.approved ? 'Batalkan approve' : 'Approve'}
            </Button>
          </div>
        )}
        {scene.versions[0] && <p className="text-xs text-muted-foreground">Versi terakhir: {versionLabel(scene.versions[0])}</p>}
      </CardContent>
      <VersionCompare
        scene={scene}
        open={compare}
        onOpenChange={setCompare}
        onRestore={(v) => {
          save(restoreVersion(scene, v, Date.now()));
          toast.success('Versi dipulihkan');
        }}
      />
      <SnippetPicker
        open={snip}
        onOpenChange={setSnip}
        onPick={(s) => {
          const base = scene.flowPrompts.standard.trim();
          const next = s.category === 'negative'
            ? { ...scene, negativePrompt: [scene.negativePrompt, s.text].filter(Boolean).join(', ') }
            : { ...scene, flowPrompts: { ...scene.flowPrompts, standard: `${base} ${s.text}`.trim() } };
          save(pushVersion({ ...next, approved: false, updatedAt: Date.now() }, 'edited', Date.now()));
          toast.success(`"${s.title}" disisipkan`);
        }}
      />
    </Card>
  );
}

export default function PromptsPage() {
  const project = useProjectStore((s) => s.project)!;
  const scenesDoc = useProjectStore((s) => s.docs.scenes);
  const bibles = useProjectStore((s) => s.docs.bibles);
  const capcut = useProjectStore((s) => s.docs.capcut);
  const setDoc = useProjectStore((s) => s.setDoc);
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const patchProject = useProjectStore((s) => s.patchProject);
  const running = useAiStatusStore((s) => s.running);
  const run = useAiAction();
  const [regen, setRegen] = React.useState<Scene | null>(null);
  const scenes = [...(scenesDoc?.items ?? [])].sort((a, b) => a.order - b.order);
  const variants = project.brief.output.variants;
  const hasPrompts = scenes.some((s) => s.flowPrompts.standard.trim());

  const generate = async () => {
    if (!bibles) return toast.error('Character/Visual Bible belum ada. Buat naskah & storyboard dulu.');
    const r = await run('scene_prompts', (opts) => aiService.generateScenePrompts({ brief: project.brief, scenes, bibles }, opts));
    if (!r) return;
    // Gabungkan hanya scene yang memang diproses, ke state terkini.
    const byId = new Map(r.scenes.map((s) => [s.id, s]));
    updateScenes((cur) => cur.map((s) => {
      const n = byId.get(s.id);
      return n && n.updatedAt !== s.updatedAt ? n : s;
    }));
    if (r.capcut) setDoc('capcut', { ...r.capcut, updatedAt: Date.now(), checklist: capcut?.checklist ?? {} });
    if (['brief', 'concepts', 'script', 'prompts'].includes(project.stage)) patchProject({ stage: 'production' });
    if (r.partialError) toast.warning(`Sebagian batch gagal: ${r.partialError.message} Batch yang sukses tetap disimpan.`);
    else toast.success('Prompt Flow dan panduan CapCut dibuat');
  };

  if (scenes.length === 0)
    return (
      <EmptyState
        icon={Sparkles}
        title="Belum ada scene"
        description="Buat naskah dan storyboard terlebih dahulu."
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/script`}>Ke Naskah</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Prompt Google Flow</h2>
          <p className="text-sm text-muted-foreground">Panggilan AI 3: prompt per scene (Inggris, mandiri) + panduan CapCut. Batch 6 scene.</p>
          <CostHint est={aiService.estimate('prompts', { brief: project.brief, scenes, bibles })} />
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPrompts && <CopyButton label="Salin Semua" getText={() => copyAllText(scenes)} />}
          <Button onClick={generate} disabled={!!running} loading={running === 'scene_prompts'} variant={hasPrompts ? 'outline' : 'default'}>
            {hasPrompts ? <RefreshCw /> : <Sparkles />} {hasPrompts ? 'Buat ulang (scene belum approve)' : 'Buat prompt'}
          </Button>
        </div>
      </div>
      <DurationBar scenes={scenes} target={project.brief.project.durationSec} />
      <Alert variant="info" title="Teks overlay dibuat di CapCut">
        Prompt tidak meminta teks di dalam video karena teks hasil AI sering rusak. Batas klip Flow saat ini dianggap 8 detik — verifikasi di Flow.
      </Alert>
      <AiErrorPanel onRetry={generate} />
      <div className="grid gap-3 xl:grid-cols-2">
        {scenes.map((s, i) => (
          <PromptCard key={s.id} scene={s} index={i} variants={variants} onRegen={() => setRegen(s)} />
        ))}
      </div>
      <RegenDialog scene={regen} onOpenChange={(v) => !v && setRegen(null)} />
    </div>
  );
}
