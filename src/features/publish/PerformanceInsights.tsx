import { formatNumber } from '@/lib/format';
import { formatPct, summarize, type PerfGroup } from '@/domain/performance';
import type { PerformanceEntry } from '@/types';

const TITLES: Partial<Record<PerfGroup, string>> = { hookStyle: 'Per gaya hook', angle: 'Per angle', platform: 'Per platform' };

/** Tabel ringkas performa per kelompok, urut views rata-rata tertinggi. */
export function PerformanceInsights({ entries, groups = ['hookStyle', 'angle', 'platform'] }: { entries: PerformanceEntry[]; groups?: PerfGroup[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {groups.map((g) => {
        const rows = summarize(entries, g);
        if (rows.length === 0) return null;
        return (
          <div key={g} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{TITLES[g]}</p>
            <ul className="space-y-1 text-sm">
              {rows.slice(0, 4).map((r, i) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span className={i === 0 && rows.length > 1 ? 'font-semibold text-success' : undefined}>{r.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {formatNumber(Math.round(r.avgViews))} views · ER {formatPct(r.avgEr)} · {r.posts}×
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
