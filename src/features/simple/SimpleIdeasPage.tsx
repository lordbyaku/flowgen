import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/Field';
import { PageHeader } from '@/components/common/states';
import { SingleToggle } from '@/components/common/ToggleGroup';
import { aiService } from '@/ai/aiService';
import { SimpleIdeasInputSchema } from '@/schemas/simple.schema';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useAiAction } from '@/features/shared/useAiAction';
import type { SimpleIdeasInput, SimpleIdeasOutput } from '@/types';

type Idea = SimpleIdeasOutput['ideas'][number];
const STORE = 'simpleIdeas.last';

const GOALS: { value: SimpleIdeasInput['goal']; label: string }[] = [
  { value: 'sell', label: 'Jualan' },
  { value: 'educate', label: 'Edukasi' },
  { value: 'entertain', label: 'Hiburan' },
];

/** Ide → teks untuk form Ide → Video. */
const ideaToText = (i: Idea) => `${i.idea.trim()} Pembuka: ${i.hook.trim()}`;

function loadLast(): { topic: string; ideas: Idea[] } {
  try {
    const raw = sessionStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as { topic: string; ideas: Idea[] }) : { topic: '', ideas: [] };
  } catch {
    return { topic: '', ideas: [] };
  }
}

export default function SimpleIdeasPage() {
  const run = useAiAction();
  const running = useAiStatusStore((s) => s.running);
  const last = React.useMemo(loadLast, []);
  const [topic, setTopic] = React.useState(last.topic);
  const [goal, setGoal] = React.useState<SimpleIdeasInput['goal']>('sell');
  const [ideas, setIdeas] = React.useState<Idea[]>(last.ideas);
  const parsed = SimpleIdeasInputSchema.safeParse({ topic, goal });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.success) return;
    const r = await run('simple_ideas', (opts) => aiService.simpleIdeas(parsed.data, opts));
    if (r) {
      setIdeas(r);
      sessionStorage.setItem(STORE, JSON.stringify({ topic, ideas: r }));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Ide Konten" description="Bingung mau bikin video apa? Tulis produk atau topikmu, dapat 10 ide yang mudah dibuat dengan Omni." />
      <form onSubmit={submit}>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <Field id="si-topic" label="Produk atau topik">
              <Input id="si-topic" value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)} placeholder="mis. kopi susu gula aren botolan, jualan di dekat kampus" />
            </Field>
            <Field id="si-goal" label="Tujuan">
              <SingleToggle ariaLabel="Tujuan" clearable={false} options={GOALS} value={goal} onChange={(v) => v && setGoal(v)} />
            </Field>
            <Button type="submit" disabled={!parsed.success || !!running} loading={running === 'simple_ideas'}>
              <Lightbulb /> Cari ide
            </Button>
          </CardContent>
        </Card>
      </form>
      {ideas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ideas.map((i, k) => (
            <Card key={`${i.title}-${k}`}>
              <CardContent className="flex h-full flex-col gap-2 pt-4 text-sm">
                <p className="font-semibold">{i.title}</p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Pembuka:</span> {i.hook}
                </p>
                <p className="flex-1">{i.idea}</p>
                <Button asChild size="sm" variant="secondary" className="self-start">
                  <Link to={`/simple/video?idea=${encodeURIComponent(ideaToText(i))}`}>
                    Jadikan video <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
