import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, Progress } from '@/components/ui/misc';
import { LevelBadge } from '@/components/common/Field';
import { COMPLETENESS_WARN_BELOW } from '@/config/constants';
import { aiService } from '@/ai/aiService';
import { applyBriefAnswer } from '@/domain/briefAnswer';
import { computeCompleteness } from '@/domain/completeness';
import { useAiAction } from '@/features/shared/useAiAction';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useProjectStore } from '@/stores/projectStore';
import type { BriefAssistQuestion } from '@/types';
import { cn } from '@/lib/utils';
import { useBrief } from './fields';

function AssistantCards({ questions, onDone }: { questions: BriefAssistQuestion[]; onDone: (path: string) => void }) {
  const updateBrief = useProjectStore((s) => s.updateBrief);
  const [custom, setCustom] = React.useState<Record<string, string>>({});
  const answer = (q: BriefAssistQuestion, value: string) => {
    let ok = false;
    updateBrief((b) => {
      const next = applyBriefAnswer(b, q.fieldPath, value);
      ok = !!next;
      return next ?? b;
    });
    if (ok) {
      toast.success('Jawaban disimpan ke brief');
      onDone(q.fieldPath);
    } else toast.error('Jawaban tidak cocok untuk field ini. Isi manual di langkah terkait.');
  };
  return (
    <ul className="space-y-3">
      {questions.map((q) => (
        <li key={q.fieldPath} className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">{q.question}</p>
          <p className="mb-2 text-[11px] text-muted-foreground">{q.fieldPath}</p>
          <div className="flex flex-wrap gap-1.5">
            {q.suggestedOptions.map((o) => (
              <button key={o} type="button" onClick={() => answer(q, o)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                {o}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              answer(q, custom[q.fieldPath] ?? '');
            }}
          >
            <input
              className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs"
              placeholder="Jawaban sendiri…"
              value={custom[q.fieldPath] ?? ''}
              onChange={(e) => setCustom({ ...custom, [q.fieldPath]: e.target.value })}
              aria-label={`Jawaban untuk ${q.question}`}
            />
            <Button size="sm" type="submit" variant="outline">
              Simpan
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export function CompletenessPanel({ projectId }: { projectId: string }) {
  const brief = useBrief();
  const c = computeCompleteness(brief);
  const run = useAiAction();
  const running = useAiStatusStore((s) => s.running);
  const [questions, setQuestions] = React.useState<BriefAssistQuestion[]>([]);

  const ask = async () => {
    const r = await run('brief_assist', (opts) => aiService.briefAssist(brief, opts));
    if (r) {
      setQuestions(r);
      if (r.length === 0) toast.info('Asisten tidak menemukan pertanyaan penting.');
    }
  };

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Kelengkapan brief
          <span className={cn('text-2xl font-bold', c.warn ? 'text-warning' : 'text-success')}>{c.score}%</span>
        </CardTitle>
        <Progress value={c.score} label="Skor kelengkapan" />
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {c.blockers.length > 0 && (
          <Alert variant="error" title={`${c.blockers.length} field wajib kosong`}>
            Generate diblokir sampai semua field W terisi.
          </Alert>
        )}
        {c.warn && (
          <Alert variant="warning" title={`Skor di bawah ${COMPLETENESS_WARN_BELOW}%`}>
            Hasil AI bisa melenceng. Lengkapi field berikut atau minta bantuan asisten.
          </Alert>
        )}
        {c.suggestions.length > 0 ? (
          <div>
            <p className="mb-2 font-medium">Saran diisi berikutnya</p>
            <ul className="space-y-1">
              {c.suggestions.map((f) => (
                <li key={f.path}>
                  <Link to={`/projects/${projectId}/brief?step=${f.step}`} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted">
                    <LevelBadge level={f.level} />
                    <span className="flex-1 truncate">{f.label}</span>
                    <span className="text-xs text-muted-foreground">L{f.step}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-success">
            <Sparkles className="h-4 w-4" /> Brief lengkap!
          </p>
        )}
        {c.warn && (
          <Button variant="secondary" className="w-full" onClick={ask} disabled={!!running} loading={running === 'brief_assist'}>
            <Bot /> AI Brief Assistant
          </Button>
        )}
        {questions.length > 0 && (
          <AssistantCards questions={questions} onDone={(p) => setQuestions((qs) => qs.filter((q) => q.fieldPath !== p))} />
        )}
      </CardContent>
    </Card>
  );
}
