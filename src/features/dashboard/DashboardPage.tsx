import * as React from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, FilePen, FolderKanban, KeyRound, Plus } from 'lucide-react';
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

      {keyConfig === 'Belum ada' && (
        <Alert
          variant="info"
          title="Siapkan API key"
          action={
            <Button asChild size="sm">
              <Link to="/provider">Siapkan API key</Link>
            </Button>
          }
        >
          Belum ada API key. Tambahkan di menu AI Provider agar fitur AI bisa dipakai.
        </Alert>
      )}
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
