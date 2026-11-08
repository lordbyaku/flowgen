import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { LABELS, PROJECT_STATUSES } from '@/config/enums';
import { computeCompleteness } from '@/domain/completeness';
import { LINT_RULES } from '@/domain/linter';
import { formatDateTime } from '@/lib/format';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types';

export default function ProjectOverview() {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const patch = useProjectStore((s) => s.patchProject);
  const c = computeCompleteness(project.brief);
  const scenes = docs.scenes?.items ?? [];
  const finals = scenes.filter((s) => s.tracker === 'final').length;
  const concept = docs.creative?.concepts.find((x) => x.id === docs.creative?.selectedConceptId);

  const next = !c.blockers.length
    ? !docs.creative?.approved
      ? { to: 'concepts', label: 'Buat & pilih konsep' }
      : !docs.script?.approved
        ? { to: 'script', label: 'Review naskah' }
        : !scenes.some((s) => s.flowPrompts.standard)
          ? { to: 'prompts', label: 'Buat prompt Flow' }
          : { to: 'production', label: 'Lanjutkan produksi' }
    : { to: 'brief', label: 'Lengkapi brief' };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{project.name || 'Project tanpa nama'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {project.brief.product.name || 'Produk belum diisi'} · {project.brief.project.durationSec} detik · {project.brief.project.aspectRatio}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Kelengkapan brief</span>
              <span className="font-medium">{c.score}%</span>
            </div>
            <Progress value={c.score} label="Kelengkapan brief" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Produksi</span>
              <span className="font-medium">
                {finals}/{scenes.length} scene final
              </span>
            </div>
            <Progress value={scenes.length ? (finals / scenes.length) * 100 : 0} label="Progres produksi" />
          </div>
          {concept && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="text-xs text-muted-foreground">Konsep terpilih</p>
              <p className="font-medium">{concept.title}</p>
              <p className="text-muted-foreground">{concept.coreMessage}</p>
            </div>
          )}
          <Button asChild>
            <Link to={next.to}>
              {next.label} <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-muted-foreground">Status project</span>
            <Select value={project.status} onChange={(e) => patch({ status: e.target.value as Project['status'] })}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LABELS.projectStatus[s]}
                </option>
              ))}
            </Select>
          </label>
          <p>
            Tahap: <Badge variant="secondary">{LABELS.stage[project.stage]}</Badge>
          </p>
          <p className="text-muted-foreground">Dibuat {formatDateTime(project.createdAt)}</p>
          <p className="text-muted-foreground">Diubah {formatDateTime(project.updatedAt)}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Aturan Prompt Linter</CardTitle>
          <p className="text-sm text-muted-foreground">Matikan aturan yang tidak relevan untuk project ini. Linter hanya memberi peringatan.</p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LINT_RULES.map((r) => {
            const on = !project.lintDisabled.includes(r.id);
            return (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    patch({ lintDisabled: e.target.checked ? project.lintDisabled.filter((x) => x !== r.id) : [...project.lintDisabled, r.id] })
                  }
                />
                <span className="font-mono text-xs">{r.id}</span> {r.title}
                <Badge variant={r.severity === 'error' ? 'destructive' : r.severity === 'warn' ? 'warning' : 'muted'}>{r.severity}</Badge>
              </label>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
