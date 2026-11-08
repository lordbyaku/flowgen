import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { computeCompleteness } from '@/domain/completeness';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import { CompletenessPanel } from './CompletenessPanel';
import { Step1Project } from './steps/Step1Project';
import { Step2Product } from './steps/Step2Product';
import { Step3Audience } from './steps/Step3Audience';
import { Step4Strategy } from './steps/Step4Strategy';
import { Step5Visual } from './steps/Step5Visual';
import { Step6Characters } from './steps/Step6Characters';
import { Step7Location } from './steps/Step7Location';
import { Step8Output } from './steps/Step8Output';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = ['Project', 'Produk', 'Audiens', 'Strategi', 'Visual', 'Karakter', 'Lokasi', 'Audio & Output', 'Review'];

export default function BriefWizard() {
  const project = useProjectStore((s) => s.project)!;
  const patchProject = useProjectStore((s) => s.patchProject);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const step = Math.min(9, Math.max(1, Number(params.get('step')) || project.step || 1));
  const c = computeCompleteness(project.brief);
  const blocked = c.blockers.length > 0;

  const go = (n: number) => {
    setParams({ step: String(n) });
    if (n !== project.step) patchProject({ step: n });
    window.scrollTo({ top: 0 });
  };

  React.useEffect(() => {
    if (!params.get('step')) setParams({ step: String(step) }, { replace: true });
  }, [params, setParams, step]);

  const blockReason = blocked ? `Field wajib kosong: ${c.blockers.map((b) => b.label).join(', ')}` : '';

  return (
    <div className="space-y-4">
      <nav aria-label="Langkah brief" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const hasBlock = c.stepsWithBlockers.includes(n);
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => go(n)}
                  aria-current={step === n ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
                    step === n ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                  )}
                >
                  <span className="font-semibold">{n <= 8 ? n : '✓'}</span> {label}
                  {hasBlock && (
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="ada field wajib kosong" title="Ada field wajib kosong" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="pt-5">
            {step === 1 && <Step1Project />}
            {step === 2 && <Step2Product />}
            {step === 3 && <Step3Audience />}
            {step === 4 && <Step4Strategy />}
            {step === 5 && <Step5Visual />}
            {step === 6 && <Step6Characters />}
            {step === 7 && <Step7Location />}
            {step === 8 && <Step8Output />}
            {step === 9 && <ReviewStep projectId={project.id} />}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button variant="outline" disabled={step === 1} onClick={() => go(step - 1)}>
                <ArrowLeft /> Sebelumnya
              </Button>
              <div className="flex gap-2">
                {step < 9 && (
                  <Button variant="secondary" onClick={() => go(step + 1)}>
                    {step === 8 ? 'Review' : 'Berikutnya'} <ArrowRight />
                  </Button>
                )}
                <Tooltip content={blockReason}>
                  <span tabIndex={blocked ? 0 : -1}>
                    <Button
                      disabled={blocked}
                      onClick={() => {
                        if (project.stage === 'brief') patchProject({ stage: 'concepts', status: 'in_progress' });
                        navigate(`/projects/${project.id}/concepts`);
                      }}
                    >
                      <Lightbulb /> Buat Konsep
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
            {blocked && (
              <p className="mt-2 text-right text-xs text-destructive" role="status">
                {blockReason}
              </p>
            )}
          </CardContent>
        </Card>
        <CompletenessPanel projectId={project.id} />
      </div>
    </div>
  );
}
