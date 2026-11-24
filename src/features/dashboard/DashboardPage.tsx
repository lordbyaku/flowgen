import * as React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Building2, CheckCircle2, Circle, FilePen, FolderKanban, KeyRound, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, Progress } from '@/components/ui/misc';
import { KeyStatusBadge, VaultBadge } from '@/components/common/StatusBadges';
import { ErrorState, LoadingState, PageHeader } from '@/components/common/states';
import { LABELS } from '@/config/enums';
import { listProjects } from '@/data/projectRepo';
import { listBrands } from '@/data/brandRepo';
import { getPreferences } from '@/data/templateRepo';
import { countToday } from '@/domain/usageStats';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useVaultStore } from '@/vault/vaultStore';
import { useUsage } from '@/features/provider/UsagePanel';
import type { Project } from '@/types';
import { collectEntries } from '@/domain/performance';
import { PerformanceInsights } from '@/features/publish/PerformanceInsights';

function Stat({ icon: Icon, label, value, to }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; to?: string }) {
  const body = (
    <Card className="h-full transition-colors hover:bg-muted/40">
      <CardContent className="flex items-center gap-3 pt-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

/** Checklist "Mulai cepat" (v1.6) untuk pengguna baru: tampil sampai ada key dan project. */
function QuickStart({ hasKey, hasProject }: { hasKey: boolean; hasProject: boolean }) {
  const steps = [
    { done: hasKey, title: 'Siapkan API key Gemini', body: 'Gratis dari Google AI Studio. Sekali saja, lalu ikut di semua device.', to: '/provider', cta: 'Siapkan', icon: KeyRound },
    { done: hasProject, title: 'Buat project pertama dengan Brief cepat', body: 'Ceritakan produk Anda dalam beberapa kalimat; AI mengisi brief-nya.', to: '/projects/quick', cta: 'Mulai', icon: Sparkles },
    { done: false, title: 'Ikuti alurnya di Panduan', body: 'Dari prompt di aplikasi, klip di Google Flow, sampai video jadi di CapCut.', to: '/guide', cta: 'Baca', icon: BookOpen },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle>Mulai cepat</CardTitle>
        <CardDescription>Tiga langkah untuk video pertama Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-center gap-3 rounded-lg border p-3">
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="selesai" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className={s.done ? 'text-sm font-medium text-muted-foreground line-through' : 'text-sm font-medium'}>
                  {i + 1}. {s.title}
                </p>
                <p className="text-xs text-muted-foreground">{s.body}</p>
              </div>
              {!s.done && (
                <Button asChild size="sm" variant={i === next ? 'default' : 'outline'}>
                  <Link to={s.to}>
                    <s.icon /> {s.cta}
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { status, keys } = useVaultStore();
  const { logs } = useUsage(30);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [brandCount, setBrandCount] = React.useState(0);
  const [budget, setBudget] = React.useState(0);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!uid) return;
    setError(false);
    try {
      const [p, b, prefs] = await Promise.all([listProjects(uid), listBrands(uid), getPreferences(uid)]);
      setProjects(p.items);
      setBrandCount(b.length);
      setBudget(prefs.dailyCallBudget);
    } catch {
      setError(true);
    }
  }, [uid]);
  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState description="Gagal memuat dashboard." onRetry={load} />;
  if (!projects) return <LoadingState />;

  const perf = collectEntries(projects);
  const drafts = projects.filter((p) => p.status === 'draft').length;
  const done = projects.filter((p) => p.status === 'completed').length;
  const activeKeys = keys.filter((k) => k.enabled).length;
  const errorKeys = keys.filter((k) => ['invalid_key', 'model_unavailable', 'network_error'].includes(k.status)).length;
  const today = countToday(logs, null, Date.now());
  const keyConfig = status === 'uninitialized' || keys.length === 0 ? 'Belum ada' : status === 'locked' ? 'Terkunci' : 'Siap';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Ringkasan project dan status AI Anda."
        actions={
          <Button asChild>
            <Link to="/projects/new">
              <Plus /> Project baru
            </Link>
          </Button>
        }
      />

      {(keys.length === 0 || projects.length === 0) && <QuickStart hasKey={keys.length > 0} hasProject={projects.length > 0} />}
      {budget > 0 && today >= budget && (
        <Alert variant="warning" title="Anggaran panggilan AI harian terlampaui">
          {today} request hari ini (lokal) melewati ambang {budget} yang Anda atur di Settings.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FolderKanban} label="Total project" value={projects.length} to="/projects" />
        <Stat icon={FilePen} label="Draft" value={drafts} to="/projects" />
        <Stat icon={CheckCircle2} label="Selesai" value={done} to="/projects" />
        <Stat icon={Building2} label="Brand" value={brandCount} to="/brands" />
      </div>

      {perf.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performa konten</CardTitle>
            <CardDescription>Dari {perf.length} hasil posting yang dicatat di tahap Posting (20 project terbaru).</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceInsights entries={perf} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada project.{' '}
                <Link to="/projects/new" className="text-primary underline">
                  Buat yang pertama
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {projects.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name || 'Project tanpa nama'}</p>
                        <p className="text-xs text-muted-foreground">
                          {LABELS.stage[p.stage]} · diubah {formatRelative(p.updatedAt)}
                        </p>
                      </div>
                      <div className="w-24">
                        <Progress value={p.completeness} label="Kelengkapan" />
                      </div>
                      <Badge variant={p.status === 'completed' ? 'success' : 'muted'}>{LABELS.projectStatus[p.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Status provider
            </CardTitle>
            <CardDescription>
              Konfigurasi key: <strong>{keyConfig}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <VaultBadge status={status} />
            <p>
              {activeKeys} key aktif · <span className={errorKeys ? 'text-destructive' : undefined}>{errorKeys} error</span>
            </p>
            <ul className="space-y-1">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{k.label}</span>
                  <KeyStatusBadge status={k.status} />
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/provider">Kelola AI Provider</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Penggunaan AI terbaru</CardTitle>
          <CardDescription>Data lokal, bukan kuota resmi Google. Hari ini: {today} request.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada request AI.</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.slice(0, 5).map((l) => (
                <li key={`${l.requestId}-${l.ts}`} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="w-36 text-xs text-muted-foreground">{formatDateTime(l.ts)}</span>
                  <span className="flex-1">{LABELS.aiTask[l.task]}</span>
                  <span className="text-xs text-muted-foreground">{l.keyLabel}</span>
                  <Badge variant={l.ok ? 'success' : 'destructive'}>{l.ok ? 'OK' : (l.errorCode ?? 'gagal')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
