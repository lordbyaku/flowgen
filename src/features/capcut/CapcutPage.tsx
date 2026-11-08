import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/misc';
import { CopyButton } from '@/components/common/CopyButton';
import { EmptyState } from '@/components/common/states';
import { buildTimelineFromScenes, capcutSections, capcutText } from '@/domain/exporters/capcutGuide';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

const CHECKLIST = [
  ['clips', 'Semua klip final sudah diunduh dari Flow'],
  ['order', 'Klip diurutkan sesuai timeline'],
  ['vo', 'Voice-over direkam/ditempel dan sinkron'],
  ['music', 'Musik dan SFX ditambahkan, volume diseimbangkan'],
  ['text', 'Teks overlay dan CTA ditambahkan'],
  ['ratio', 'Rasio kanvas sesuai brief'],
  ['export', 'Ekspor 1080p, cek ulang di HP'],
] as const;

export default function CapcutPage() {
  const project = useProjectStore((s) => s.project)!;
  const capcut = useProjectStore((s) => s.docs.capcut);
  const setDoc = useProjectStore((s) => s.setDoc);
  const scenes = [...(useProjectStore((s) => s.docs.scenes?.items) ?? [])].sort((a, b) => a.order - b.order);

  if (!capcut)
    return (
      <EmptyState
        icon={Film}
        title="Panduan CapCut belum ada"
        description="Panduan dibuat bersama prompt Flow (Panggilan AI 3)."
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/prompts`}>Ke Prompt</Link>
          </Button>
        }
      />
    );

  const timeline = capcut.timeline.length ? capcut.timeline : buildTimelineFromScenes(scenes);
  const total = project.brief.project.durationSec;
  const end = timeline.length ? Math.max(...timeline.map((t) => t.endSec)) : 0;
  const missing = scenes.filter((_, i) => !timeline.some((t) => t.scene === i + 1));
  const sections = capcutSections({ ...capcut, timeline }, scenes);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Panduan CapCut</h2>
          <p className="text-sm text-muted-foreground">Susun klip secara manual di CapCut. Aplikasi tidak merender video.</p>
        </div>
        <CopyButton label="Salin semua panduan" getText={() => capcutText({ ...capcut, timeline }, scenes)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline per detik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-10 w-full overflow-hidden rounded-md border" role="img" aria-label="Visual timeline scene">
            {timeline.map((t) => (
              <div
                key={`${t.scene}-${t.startSec}`}
                className={cn('flex items-center justify-center border-r text-[10px] font-medium last:border-r-0', t.scene % 2 ? 'bg-primary/15' : 'bg-accent')}
                style={{ width: `${(100 * (t.endSec - t.startSec)) / Math.max(end, total, 1)}%` }}
                title={`Scene ${t.scene}: ${t.startSec}–${t.endSec}s`}
              >
                S{t.scene}
              </div>
            ))}
          </div>
          <p className={cn('text-sm', end === total ? 'text-success' : 'text-destructive')}>
            Total timeline {end} dtk / target {total} dtk {end === total ? '✓' : '— periksa durasi scene'}
          </p>
          {missing.length > 0 && <Alert variant="warning" title="Scene belum ada di timeline">{missing.map((s) => s.title).join(', ')}</Alert>}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{s.title}</CardTitle>
              <CopyButton label="Salin" getText={() => s.text} />
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{s.text || '-'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {capcut.textOverlays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar teks overlay</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {capcut.textOverlays.map((o, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="w-16 text-xs text-muted-foreground">Scene {o.scene}</span>
                  <span className="min-w-0 flex-1 font-medium">“{o.text}”</span>
                  <span className="text-xs text-muted-foreground">
                    {o.position} · {o.style} · {o.startSec}–{o.endSec}s
                  </span>
                  <CopyButton label="Salin" getText={() => o.text} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checklist ekspor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!capcut.checklist[k]}
                onChange={(e) => setDoc('capcut', { ...capcut, checklist: { ...capcut.checklist, [k]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
