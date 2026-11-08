import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { AiErrorPanel } from '@/components/common/AiStatus';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/states';
import { aiService } from '@/ai/aiService';
import { getBrand } from '@/data/brandRepo';
import { estimateSpokenSec, totalWordBudget } from '@/domain/wordBudget';
import { countWords } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAiAction } from '@/features/shared/useAiAction';
import type { ScriptDoc } from '@/types';

const PARTS: { key: keyof ScriptDoc; label: string }[] = [
  { key: 'hook', label: 'Hook' },
  { key: 'problem', label: 'Masalah' },
  { key: 'productIntro', label: 'Perkenalan produk' },
  { key: 'mainBenefit', label: 'Manfaat utama' },
  { key: 'closing', label: 'Penutup' },
  { key: 'cta', label: 'CTA' },
];

/** Hook bersama: jalankan Panggilan 2 dan simpan naskah + storyboard + bible. */
export function useScriptStoryboardGenerator() {
  const project = useProjectStore((s) => s.project)!;
  const creative = useProjectStore((s) => s.docs.creative);
  const setDoc = useProjectStore((s) => s.setDoc);
  const uid = useAuthStore((s) => s.user?.uid);
  const run = useAiAction();
  return async () => {
    const concept = creative?.concepts.find((c) => c.id === creative.selectedConceptId);
    if (!concept || !creative) {
      toast.error('Pilih dan approve konsep terlebih dahulu.');
      return false;
    }
    const brand = uid && project.brief.project.brandId ? await getBrand(uid, project.brief.project.brandId) : null;
    const r = await run('script_storyboard', (opts) => aiService.generateScriptStoryboard(project.brief, concept, brand, opts));
    if (!r) return false;
    setDoc('script', r.script);
    setDoc('scenes', { items: r.scenes, updatedAt: Date.now() });
    setDoc('bibles', r.bibles);
    const merged = [...new Set([...creative.assumptions, ...r.assumptions])];
    setDoc('creative', { ...creative, assumptions: merged });
    toast.success(`Naskah dan ${r.scenes.length} scene dibuat`);
    return true;
  };
}

export default function ScriptPage() {
  const project = useProjectStore((s) => s.project)!;
  const script = useProjectStore((s) => s.docs.script);
  const creative = useProjectStore((s) => s.docs.creative);
  const hasScenes = useProjectStore((s) => (s.docs.scenes?.items.length ?? 0) > 0);
  const setDoc = useProjectStore((s) => s.setDoc);
  const patchProject = useProjectStore((s) => s.patchProject);
  const running = useAiStatusStore((s) => s.running);
  const generate = useScriptStoryboardGenerator();
  const navigate = useNavigate();
  const [confirm, setConfirm] = React.useState(false);

  const lang = project.brief.project.scriptLanguage;
  const budget = totalWordBudget(project.brief.project.durationSec, lang);
  const conceptOk = !!creative?.approved && !!creative.selectedConceptId;

  const update = (patch: Partial<ScriptDoc>) => {
    if (!script) return;
    const next = { ...script, ...patch };
    next.wordCount = countWords(next.voiceOver);
    next.estimatedDurationSec = estimateSpokenSec(next.voiceOver, lang);
    setDoc('script', next);
  };

  const onGenerate = () => (hasScenes ? setConfirm(true) : void generate());

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Naskah</h2>
          <p className="text-sm text-muted-foreground">Panggilan AI 2: naskah, VO, storyboard, Character Bible, dan Visual Bible sekaligus.</p>
        </div>
        <Button onClick={onGenerate} disabled={!conceptOk || !!running} loading={running === 'script_storyboard'} variant={script ? 'outline' : 'default'}>
          {script ? <RefreshCw /> : <FileText />} {script ? 'Buat ulang naskah & storyboard' : 'Buat naskah & storyboard'}
        </Button>
      </div>
      {!conceptOk && (
        <Alert
          variant="warning"
          title="Konsep belum di-approve"
          action={
            <Button asChild size="sm" variant="outline">
              <Link to={`/projects/${project.id}/concepts`}>Ke Konsep</Link>
            </Button>
          }
        >
          Naskah dibuat dari konsep yang disetujui (termasuk edit Anda).
        </Alert>
      )}
      <AiErrorPanel onRetry={() => void generate()} />
      {!script ? (
        <EmptyState icon={FileText} title="Belum ada naskah" description="Setelah konsep di-approve, buat naskah dan storyboard dalam satu panggilan AI." />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Struktur naskah</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {PARTS.map((p) => (
                <label key={p.key} className="space-y-1.5 text-sm">
                  <span className="font-medium">{p.label}</span>
                  <Textarea value={String(script[p.key])} onChange={(e) => update({ [p.key]: e.target.value })} disabled={script.approved} />
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Voice-over lengkap</CardTitle>
              <div className="flex gap-2">
                <Badge variant={script.wordCount > budget ? 'destructive' : 'success'}>
                  {script.wordCount}/{budget} kata
                </Badge>
                <Badge variant="outline">±{script.estimatedDurationSec} dtk / {project.brief.project.durationSec} dtk</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea className="min-h-40" value={script.voiceOver} onChange={(e) => update({ voiceOver: e.target.value })} disabled={script.approved} aria-label="Voice-over" />
              {script.wordCount > budget && (
                <p className="mt-2 text-xs text-destructive">VO melebihi anggaran kata; kemungkinan tidak muat dalam durasi video.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">VO per scene diedit di Storyboard.</p>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            {script.approved ? (
              <>
                <Button variant="outline" onClick={() => update({ approved: false })}>
                  Buka kunci
                </Button>
                <Button onClick={() => navigate(`/projects/${project.id}/storyboard`)}>Buka Storyboard</Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  update({ approved: true });
                  if (['brief', 'concepts', 'script'].includes(project.stage)) patchProject({ stage: 'prompts' });
                  navigate(`/projects/${project.id}/storyboard`);
                }}
              >
                <CheckCircle2 /> Approve & buka Storyboard
              </Button>
            )}
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Buat ulang naskah & storyboard?"
        description="Storyboard, Character Bible, dan Visual Bible saat ini akan diganti oleh hasil baru (jika berhasil). Prompt per scene perlu dibuat ulang."
        confirmLabel="Buat ulang"
        onConfirm={async () => {
          setConfirm(false);
          await generate();
        }}
      />
    </div>
  );
}
