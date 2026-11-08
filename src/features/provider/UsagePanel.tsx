import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/states';
import { LABELS } from '@/config/enums';
import { formatDateTime, formatNumber } from '@/lib/format';
import { startOfLocalDay } from '@/lib/time';
import type { UsageLog } from '@/types';
import { usageStore } from '@/vault/vaultStore';
import { summarizeByKey as summarize } from '@/domain/usageStats';

export function useUsage(days = 30) {
  const [logs, setLogs] = React.useState<UsageLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      await usageStore.trim(Date.now());
      setLogs((await usageStore.since(Date.now() - days * 86400_000)).sort((a, b) => b.ts - a.ts));
    } finally {
      setLoading(false);
    }
  }, [days]);
  React.useEffect(() => {
    void reload();
  }, [reload]);
  return { logs, loading, reload };
}

function Bars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-muted-foreground">{r.label}</span>
          <span className="h-3 overflow-hidden rounded bg-muted">
            <span className="block h-full rounded bg-primary" style={{ width: `${(100 * r.value) / max}%` }} />
          </span>
          <span className="tabular-nums">
            {formatNumber(r.value)}
            {r.sub && <span className="text-muted-foreground"> {r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function UsagePanel() {
  const { logs, loading, reload } = useUsage();
  const summary = summarize(logs);
  const days = Array.from({ length: 7 }, (_, i) => startOfLocalDay(Date.now() - (6 - i) * 86400_000));
  const perDay = days.map((d) => {
    const dayLogs = logs.filter((l) => l.ts >= d && l.ts < d + 86400_000);
    return {
      label: new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      value: dayLogs.length,
      sub: dayLogs.some((l) => !l.ok) ? `(${dayLogs.filter((l) => !l.ok).length} gagal)` : undefined,
    };
  });
  const errors = logs.filter((l) => !l.ok).slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Penggunaan AI</CardTitle>
          <CardDescription>
            <Badge variant="warning">Data lokal, bukan kuota resmi Google</Badge> Sisa kuota tidak dapat dipastikan dari aplikasi.
          </CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void reload()} loading={loading} aria-label="Muat ulang usage">
          <RefreshCw />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {logs.length === 0 ? (
          <EmptyState title="Belum ada request" description="Usage tercatat setiap kali aplikasi memanggil Gemini." />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-medium">Request per key (30 hari)</p>
                <Bars rows={summary.map((s) => ({ label: s.keyLabel, value: s.requests, sub: s.failed ? `(${s.failed} gagal)` : undefined }))} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Estimasi token per key</p>
                <Bars rows={summary.map((s) => ({ label: s.keyLabel, value: s.inputTokens + s.outputTokens }))} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Request 7 hari terakhir</p>
                <Bars rows={perDay} />
              </div>
            </div>
            {errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Riwayat error terakhir</p>
                <ul className="space-y-1 text-xs">
                  {errors.map((e) => (
                    <li key={e.requestId} className="flex flex-wrap gap-2">
                      <span className="text-muted-foreground">{formatDateTime(e.ts)}</span>
                      <span>{e.keyLabel}</span>
                      <Badge variant="destructive">{e.errorCode ?? 'error'}</Badge>
                      <span className="text-muted-foreground">HTTP {e.httpStatus ?? '-'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <caption className="mb-2 text-left text-sm font-medium">50 request terakhir</caption>
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-1.5 pr-2 font-medium">Waktu</th>
                    <th className="pr-2 font-medium">Key</th>
                    <th className="pr-2 font-medium">Model</th>
                    <th className="pr-2 font-medium">Tugas</th>
                    <th className="pr-2 font-medium">Token (in/out)</th>
                    <th className="pr-2 font-medium">Status</th>
                    <th className="font-medium">Latensi</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 50).map((l) => (
                    <tr key={`${l.requestId}-${l.ts}`} className="border-b last:border-0">
                      <td className="py-1.5 pr-2">{formatDateTime(l.ts)}</td>
                      <td className="pr-2">{l.keyLabel}</td>
                      <td className="pr-2">{l.model}</td>
                      <td className="pr-2">{LABELS.aiTask[l.task]}</td>
                      <td className="pr-2 tabular-nums">
                        {formatNumber(l.inputTokens)}/{formatNumber(l.outputTokens)}
                        {l.estimated && <span className="text-muted-foreground"> (est.)</span>}
                      </td>
                      <td className="pr-2">
                        <Badge variant={l.ok ? 'success' : 'destructive'}>{l.ok ? `OK ${l.httpStatus ?? ''}` : `${l.errorCode ?? 'gagal'} ${l.httpStatus ?? ''}`}</Badge>
                      </td>
                      <td className="tabular-nums">{formatNumber(l.latencyMs)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
