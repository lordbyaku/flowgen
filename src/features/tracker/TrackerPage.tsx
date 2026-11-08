import { Link } from 'react-router-dom';
import { KanbanSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, Textarea } from '@/components/ui/input';
import { Progress } from '@/components/ui/misc';
import { CopyButton } from '@/components/common/CopyButton';
import { EmptyState } from '@/components/common/states';
import { LABELS, TRACKER_STATUSES } from '@/config/enums';
import { copyText } from '@/domain/promptText';
import { useProjectStore } from '@/stores/projectStore';
import type { Scene, TrackerStatus } from '@/types';

export function trackerProgress(scenes: Scene[]): number {
  return scenes.length ? Math.round((100 * scenes.filter((s) => s.tracker === 'final').length) / scenes.length) : 0;
}

export default function TrackerPage() {
  const project = useProjectStore((s) => s.project)!;
  const scenes = [...(useProjectStore((s) => s.docs.scenes?.items) ?? [])].sort((a, b) => a.order - b.order);
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const patchProject = useProjectStore((s) => s.patchProject);
  const pct = trackerProgress(scenes);

  const patch = (id: string, p: Partial<Scene>) => {
    updateScenes((cur) => cur.map((s) => (s.id === id ? { ...s, ...p, updatedAt: Date.now() } : s)));
    const next = scenes.map((s) => (s.id === id ? { ...s, ...p } : s));
    if (next.length && next.every((s) => s.tracker === 'final') && project.status !== 'completed') {
      patchProject({ status: 'completed', stage: 'done' });
    }
  };

  if (scenes.length === 0)
    return (
      <EmptyState
        icon={KanbanSquare}
        title="Belum ada scene untuk dilacak"
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/storyboard`}>Ke Storyboard</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Production Tracker</h2>
        <p className="text-sm text-muted-foreground">Prompt siap → Disalin → Klip dibuat di Flow → Diunduh → Masuk CapCut → Final.</p>
      </div>
      <Card className="p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>Progres produksi</span>
          <span className="font-semibold">
            {pct}% ({scenes.filter((s) => s.tracker === 'final').length}/{scenes.length} final)
          </span>
        </div>
        <Progress value={pct} label="Progres produksi" />
      </Card>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TRACKER_STATUSES.map((status) => {
          const col = scenes.filter((s) => s.tracker === status);
          return (
            <section key={status} aria-label={LABELS.tracker[status]} className="rounded-lg border bg-muted/40 p-2">
              <h3 className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
                {LABELS.tracker[status]} <span className="text-xs text-muted-foreground">{col.length}</span>
              </h3>
              <div className="space-y-2">
                {col.map((s) => (
                  <Card key={s.id} className="space-y-2 p-3">
                    <p className="text-sm font-medium">
                      {s.order + 1}. {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.durationSec} detik</p>
                    <Select
                      value={s.tracker}
                      onChange={(e) => patch(s.id, { tracker: e.target.value as TrackerStatus })}
                      aria-label={`Status scene ${s.order + 1}`}
                      className="h-8 text-xs"
                    >
                      {TRACKER_STATUSES.map((t) => (
                        <option key={t} value={t}>
                          {LABELS.tracker[t]}
                        </option>
                      ))}
                    </Select>
                    <Textarea
                      className="min-h-14 text-xs"
                      placeholder="Catatan, mis. klip terbaik #3, perlu generate ulang"
                      value={s.trackerNote ?? ''}
                      onChange={(e) => patch(s.id, { trackerNote: e.target.value })}
                      aria-label={`Catatan scene ${s.order + 1}`}
                    />
                    {s.flowPrompts.standard && (
                      <CopyButton
                        label="Salin prompt"
                        className="w-full"
                        getText={() => copyText(s)}
                        onCopied={() => s.tracker === 'prompt_ready' && patch(s.id, { tracker: 'copied' })}
                      />
                    )}
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
