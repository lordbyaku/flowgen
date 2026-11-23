import * as React from 'react';
import { ExternalLink, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { HOOK_STYLES, LABELS, PLATFORMS } from '@/config/enums';
import { MAX_PERFORMANCE_ENTRIES } from '@/config/constants';
import { hookLetter, openingScene } from '@/domain/hooks';
import { engagementRate, formatPct, summarize } from '@/domain/performance';
import { formatDateTime, formatNumber } from '@/lib/format';
import { newShortId } from '@/lib/ids';
import { useProjectStore } from '@/stores/projectStore';
import type { HookStyle, PerformanceEntry, Platform } from '@/types';

interface VersionOption {
  id: string;
  label: string;
  hookStyle?: HookStyle;
  hookText: string;
}

function useVersionOptions(): VersionOption[] {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const opening = openingScene(docs.scenes?.items ?? []);
  return [
    {
      id: 'main',
      label: 'Hook utama (scene 1)',
      hookStyle: project.brief.strategy.hookStyles[0],
      hookText: opening?.textOverlay || docs.script?.hook || opening?.voiceOver || '',
    },
    ...(docs.hooks?.items ?? []).map((h, i) => ({
      id: h.id,
      label: `${hookLetter(i)}: ${h.title}`,
      hookStyle: h.hookStyle,
      hookText: h.textOverlay || h.voiceOver || h.title,
    })),
  ];
}

type Form = {
  platform: Platform;
  date: string;
  url: string;
  version: string;
  hookStyle: HookStyle | '';
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  avgWatchSec: string;
  retention3sPct: string;
  note: string;
};

const toDateInput = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const int = (s: string) => Math.max(0, Math.round(Number(s) || 0));
const optNum = (s: string, max: number) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Math.min(max, Math.max(0, Number(s))));

function EntryDialog({ entry, open, onOpenChange }: { entry: PerformanceEntry | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const patchProject = useProjectStore((s) => s.patchProject);
  const versions = useVersionOptions();
  const platforms = [...project.brief.project.platforms, ...PLATFORMS.filter((p) => !project.brief.project.platforms.includes(p))];
  const blank = (): Form => ({
    platform: platforms[0] ?? 'tiktok',
    date: toDateInput(Date.now()),
    url: '',
    version: 'main',
    hookStyle: versions[0]?.hookStyle ?? '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    avgWatchSec: '',
    retention3sPct: '',
    note: '',
  });
  const [f, setF] = React.useState<Form>(blank);

  React.useEffect(() => {
    if (!open) return;
    setF(
      entry
        ? {
            platform: entry.platform,
            date: toDateInput(entry.postedAt),
            url: entry.url,
            version: entry.version,
            hookStyle: entry.hookStyle ?? '',
            views: String(entry.views),
            likes: String(entry.likes),
            comments: String(entry.comments),
            shares: String(entry.shares),
            saves: String(entry.saves),
            avgWatchSec: entry.avgWatchSec?.toString() ?? '',
            retention3sPct: entry.retention3sPct?.toString() ?? '',
            note: entry.note,
          }
        : blank(),
    );
    // Reset hanya saat dialog dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const save = () => {
    const v = versions.find((x) => x.id === f.version) ?? versions[0];
    const concept = docs.creative?.concepts.find((c) => c.id === docs.creative?.selectedConceptId);
    const urlOk = f.url.trim() === '' || /^https?:\/\//.test(f.url.trim());
    if (!urlOk) return toast.error('URL harus diawali http:// atau https://');
    const next: PerformanceEntry = {
      id: entry?.id ?? `perf_${newShortId()}`,
      platform: f.platform,
      postedAt: f.date ? new Date(`${f.date}T12:00:00`).getTime() : Date.now(),
      url: f.url.trim(),
      version: v.id,
      versionLabel: v.label,
      hookStyle: f.hookStyle || undefined,
      angle: entry?.angle ?? concept?.angle,
      hookText: entry?.version === v.id ? entry.hookText : v.hookText.slice(0, 300),
      views: int(f.views),
      likes: int(f.likes),
      comments: int(f.comments),
      shares: int(f.shares),
      saves: int(f.saves),
      avgWatchSec: optNum(f.avgWatchSec, 3600),
      retention3sPct: optNum(f.retention3sPct, 100),
      note: f.note.trim().slice(0, 500),
      updatedAt: Date.now(),
    };
    const list = project.performance;
    patchProject({ performance: entry ? list.map((e) => (e.id === entry.id ? next : e)) : [next, ...list].slice(0, MAX_PERFORMANCE_ENTRIES) });
    onOpenChange(false);
    toast.success('Hasil posting disimpan');
  };

  const num = (k: keyof Form, label: string, hint?: string) => (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input type="number" inputMode="numeric" min={0} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint} />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit hasil posting' : 'Catat hasil posting'}</DialogTitle>
          <DialogDescription>Isi angka dari insight platform (mis. setelah 48 jam). Hanya views yang wajib.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Platform</span>
            <Select value={f.platform} onChange={(e) => set('platform', e.target.value as Platform)}>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {LABELS.platform[p]}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Tanggal posting</span>
            <Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Versi video</span>
            <Select
              value={f.version}
              onChange={(e) => {
                const v = versions.find((x) => x.id === e.target.value);
                setF((cur) => ({ ...cur, version: e.target.value, hookStyle: v?.hookStyle ?? cur.hookStyle }));
              }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Gaya hook</span>
            <Select value={f.hookStyle} onChange={(e) => set('hookStyle', e.target.value as HookStyle | '')}>
              <option value="">Tidak tahu</option>
              {HOOK_STYLES.map((h) => (
                <option key={h} value={h}>
                  {LABELS.hookStyle[h]}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">URL video (opsional)</span>
            <Input value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://www.tiktok.com/@…" />
          </label>
          {num('views', 'Views')}
          {num('likes', 'Like')}
          {num('comments', 'Komentar')}
          {num('shares', 'Share')}
          {num('saves', 'Simpan')}
          {num('avgWatchSec', 'Rata-rata ditonton (dtk)', 'opsional')}
          {num('retention3sPct', 'Retensi 3 detik (%)', 'opsional')}
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Catatan</span>
            <Textarea value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="mis. diposting jam 19.00, dibantu iklan Rp20rb" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save} disabled={f.views.trim() === ''}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Catatan performa per project (v1.4): hasil posting per versi/platform + ringkasan versi terbaik. */
export function PerformanceSection() {
  const project = useProjectStore((s) => s.project)!;
  const patchProject = useProjectStore((s) => s.patchProject);
  const [editing, setEditing] = React.useState<PerformanceEntry | null>(null);
  const [open, setOpen] = React.useState(false);
  const entries = [...project.performance].sort((a, b) => b.postedAt - a.postedAt);
  const byVersion = summarize(entries, 'version');

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Performa setelah diposting
          </CardTitle>
          <p className="text-sm text-muted-foreground">Dipakai sebagai pelajaran saat membuat konsep dan varian hook berikutnya.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={entries.length >= MAX_PERFORMANCE_ENTRIES}
        >
          <Plus /> Catat hasil
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada hasil. Catat views dan interaksi setelah video diposting (mis. 48 jam).</p>
        ) : (
          <>
            {byVersion.length > 1 && (
              <div className="rounded-md bg-success/10 p-3 text-sm">
                Versi terbaik sejauh ini: <strong>{byVersion[0].label}</strong> — rata-rata {formatNumber(Math.round(byVersion[0].avgViews))} views, ER{' '}
                {formatPct(byVersion[0].avgEr)}.
              </div>
            )}
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {LABELS.platform[e.platform]} · {e.versionLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.postedAt)}
                      {e.hookStyle ? ` · ${LABELS.hookStyle[e.hookStyle]}` : ''}
                      {e.note ? ` · ${e.note}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{formatNumber(e.views)} views</Badge>
                    <Badge variant="outline">ER {formatPct(engagementRate(e))}</Badge>
                    {e.retention3sPct !== undefined && <Badge variant="outline">3 dtk {Math.round(e.retention3sPct)}%</Badge>}
                  </div>
                  {e.url && (
                    <Button asChild size="icon" variant="ghost" aria-label="Buka video">
                      <a href={e.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit hasil"
                    onClick={() => {
                      setEditing(e);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Hapus hasil"
                    onClick={() => patchProject({ performance: project.performance.filter((x) => x.id !== e.id) })}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
      <EntryDialog entry={editing} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
