import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lightbulb, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { AiErrorPanel } from '@/components/common/AiStatus';
import { EmptyState } from '@/components/common/states';
import { CostHint } from '@/components/common/CostHint';
import { ANGLES, LABELS } from '@/config/enums';
import { MAX_CONCEPT_HISTORY } from '@/config/constants';
import { aiService } from '@/ai/aiService';
import { computeCompleteness } from '@/domain/completeness';
import { getBrand } from '@/data/brandRepo';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAiAction } from '@/features/shared/useAiAction';
import type { Concept, ConceptRound, CreativeDoc } from '@/types';

const FIELDS: { key: keyof Concept; label: string; multiline?: boolean }[] = [
  { key: 'coreMessage', label: 'Pesan inti', multiline: true },
  { key: 'emotion', label: 'Arah emosi' },
  { key: 'visualIdentity', label: 'Identitas visual', multiline: true },
  { key: 'storytelling', label: 'Pendekatan cerita', multiline: true },
  { key: 'openingHook', label: 'Hook pembuka', multiline: true },
  { key: 'closingCta', label: 'CTA penutup' },
  { key: 'rationale', label: 'Alasan kreatif', multiline: true },
];

function ConceptCard({
  concept,
  selected,
  onSelect,
  onChange,
  locked,
}: {
  concept: Concept;
  selected: boolean;
  onSelect: () => void;
  onChange: (c: Concept) => void;
  locked: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  return (
    <Card className={cn('flex flex-col transition-shadow', selected && 'ring-2 ring-primary')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <Input value={concept.title} onChange={(e) => onChange({ ...concept, title: e.target.value })} aria-label="Judul konsep" />
          ) : (
            <CardTitle className="text-base">{concept.title}</CardTitle>
          )}
          {selected && (
            <Badge variant="success">
              <CheckCircle2 /> Dipilih
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {editing ? (
            <Select value={concept.angle} onChange={(e) => onChange({ ...concept, angle: e.target.value as Concept['angle'] })} aria-label="Angle">
              {ANGLES.map((a) => (
                <option key={a} value={a}>
                  {LABELS.angle[a]}
                </option>
              ))}
            </Select>
          ) : (
            <Badge variant="secondary">{LABELS.angle[concept.angle]}</Badge>
          )}
          <Badge variant="outline">{concept.recommendedSceneCount} scene</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
            {editing ? (
              f.multiline ? (
                <Textarea value={String(concept[f.key])} onChange={(e) => onChange({ ...concept, [f.key]: e.target.value })} aria-label={f.label} />
              ) : (
                <Input value={String(concept[f.key])} onChange={(e) => onChange({ ...concept, [f.key]: e.target.value })} aria-label={f.label} />
              )
            ) : (
              <p className="whitespace-pre-wrap">{String(concept[f.key]) || '-'}</p>
            )}
          </div>
        ))}
        {editing && (
          <label className="block text-xs">
            Jumlah scene
            <Input
              type="number"
              min={1}
              max={60}
              value={concept.recommendedSceneCount}
              onChange={(e) => onChange({ ...concept, recommendedSceneCount: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
        )}
      </CardContent>
      <div className="flex gap-2 p-4 pt-0">
        <Button variant={selected ? 'secondary' : 'default'} size="sm" onClick={onSelect} disabled={locked}>
          {selected ? 'Terpilih' : 'Pilih konsep ini'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)} disabled={locked}>
          {editing ? 'Selesai edit' : 'Edit'}
        </Button>
      </div>
    </Card>
  );
}

export default function ConceptPage() {
  const project = useProjectStore((s) => s.project)!;
  const creative = useProjectStore((s) => s.docs.creative);
  const setDoc = useProjectStore((s) => s.setDoc);
  const patchProject = useProjectStore((s) => s.patchProject);
  const uid = useAuthStore((s) => s.user?.uid);
  const running = useAiStatusStore((s) => s.running);
  const run = useAiAction();
  const navigate = useNavigate();
  const blockers = computeCompleteness(project.brief).blockers;

  const generate = async () => {
    const brand = uid && project.brief.project.brandId ? await getBrand(uid, project.brief.project.brandId) : null;
    const round = await run('concepts', (opts) => aiService.generateConcepts(project.brief, brand, opts));
    if (!round) return; // output lama dipertahankan
    const history: ConceptRound[] = creative
      ? [
          {
            id: `round_prev_${Date.now()}`,
            createdAt: creative.updatedAt || Date.now(),
            analysis: creative.analysis,
            concepts: creative.concepts,
            assumptions: creative.assumptions,
          },
          ...creative.history,
        ].slice(0, MAX_CONCEPT_HISTORY)
      : [];
    const next: CreativeDoc = {
      analysis: round.analysis,
      concepts: round.concepts,
      assumptions: round.assumptions,
      selectedConceptId: round.concepts[0]?.id,
      approved: false,
      history,
      updatedAt: Date.now(),
    };
    setDoc('creative', next);
    toast.success(`${round.concepts.length} konsep dibuat`);
  };

  const update = (patch: Partial<CreativeDoc>) => creative && setDoc('creative', { ...creative, ...patch });

  const restore = (r: ConceptRound) => {
    if (!creative) return;
    const current: ConceptRound = {
      id: `round_prev_${Date.now()}`,
      createdAt: creative.updatedAt,
      analysis: creative.analysis,
      concepts: creative.concepts,
      assumptions: creative.assumptions,
    };
    update({
      analysis: r.analysis,
      concepts: r.concepts,
      assumptions: r.assumptions,
      selectedConceptId: r.concepts[0]?.id,
      approved: false,
      history: [current, ...creative.history.filter((h) => h.id !== r.id)].slice(0, MAX_CONCEPT_HISTORY),
    });
    toast.success('Ronde konsep dipulihkan');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Konsep</h2>
          <p className="text-sm text-muted-foreground">Panggilan AI 1: analisis dan {project.brief.strategy.conceptAlternatives} alternatif konsep.</p>
          {blockers.length === 0 && <CostHint est={aiService.estimate('concepts', { brief: project.brief })} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {creative && creative.history.length > 0 && (
            <Select
              aria-label="Riwayat konsep"
              className="w-auto"
              value=""
              onChange={(e) => {
                const r = creative.history.find((h) => h.id === e.target.value);
                if (r) restore(r);
              }}
            >
              <option value="">Riwayat ({creative.history.length})</option>
              {creative.history.map((h) => (
                <option key={h.id} value={h.id}>
                  {formatDateTime(h.createdAt)} · {h.concepts.map((c) => c.title).join(' / ').slice(0, 50)}
                </option>
              ))}
            </Select>
          )}
          <Button
            variant={creative ? 'outline' : 'default'}
            onClick={generate}
            disabled={blockers.length > 0 || !!running}
            loading={running === 'concepts'}
          >
            {creative ? <RefreshCw /> : <Lightbulb />} {creative ? 'Regenerate' : 'Buat konsep'}
          </Button>
        </div>
      </div>

      {blockers.length > 0 && (
        <Alert variant="error" title="Brief belum lengkap">
          Isi dulu field wajib: {blockers.map((b) => b.label).join(', ')}.
        </Alert>
      )}
      <AiErrorPanel onRetry={generate} />

      {!creative ? (
        <EmptyState
          icon={Lightbulb}
          title="Belum ada konsep"
          description="Klik Buat konsep. AI akan menganalisis brief dan mengusulkan konsep yang berbeda nyata."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Analisis produk dan pasar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Produk</p>
                <p className="whitespace-pre-wrap">{creative.analysis.product}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pasar</p>
                <p className="whitespace-pre-wrap">{creative.analysis.market}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Angle terkuat</p>
                <p className="whitespace-pre-wrap">{creative.analysis.strongestAngle}</p>
              </div>
            </CardContent>
          </Card>
          {creative.assumptions.length > 0 && (
            <Alert variant="info" title="Asumsi AI">
              <ul className="list-disc pl-4">
                {creative.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Alert>
          )}
          {creative.approved && (
            <Alert variant="success" title="Konsep sudah di-approve" action={<Button size="sm" variant="outline" onClick={() => update({ approved: false })}>Buka kunci</Button>}>
              Lanjutkan ke Naskah. Buka kunci untuk mengganti konsep.
            </Alert>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            {creative.concepts.map((c) => (
              <ConceptCard
                key={c.id}
                concept={c}
                locked={creative.approved}
                selected={c.id === creative.selectedConceptId}
                onSelect={() => update({ selectedConceptId: c.id })}
                onChange={(nc) => update({ concepts: creative.concepts.map((x) => (x.id === nc.id ? nc : x)) })}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!creative.selectedConceptId}
              onClick={() => {
                update({ approved: true });
                if (project.stage === 'brief' || project.stage === 'concepts') patchProject({ stage: 'script', status: 'in_progress' });
                navigate(`/projects/${project.id}/script`);
              }}
            >
              <CheckCircle2 /> Approve & lanjut ke Naskah
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
