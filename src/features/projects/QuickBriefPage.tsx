import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { Field } from '@/components/common/Field';
import { LoadingState, PageHeader } from '@/components/common/states';
import { DURATION_OPTIONS, LABELS, PLATFORMS, SCRIPT_LANGUAGES } from '@/config/enums';
import { QUICK_BRIEF_NOTES } from '@/config/constants';
import { createEmptyBrief } from '@/config/presets';
import { aiService } from '@/ai/aiService';
import { createBrand } from '@/data/brandRepo';
import { createProject } from '@/data/projectRepo';
import { computeCompleteness } from '@/domain/completeness';
import { BrandFormSchema } from '@/schemas/project.schema';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useAiAction } from '@/features/shared/useAiAction';
import { useBrands } from '@/features/brands/useBrands';
import { cn } from '@/lib/utils';
import type { Brief, Platform, ScriptLanguage } from '@/types';

const NEW_BRAND = '__new__';

interface Done {
  projectId: string;
  filled: number;
  assumptions: string[];
  blockers: string[];
}

export default function QuickBriefPage() {
  const { brands, loading, uid } = useBrands();
  const navigate = useNavigate();
  const run = useAiAction();
  const running = useAiStatusStore((s) => s.running);
  const [brandId, setBrandId] = React.useState('');
  const [brandName, setBrandName] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [platforms, setPlatforms] = React.useState<Platform[]>(['tiktok']);
  const [duration, setDuration] = React.useState(30);
  const [language, setLanguage] = React.useState<ScriptLanguage>('id_casual');
  const [projectName, setProjectName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<Done | null>(null);

  React.useEffect(() => {
    if (!loading && !brandId) setBrandId(brands[0]?.id ?? NEW_BRAND);
  }, [loading, brands, brandId]);

  const isNewBrand = brandId === NEW_BRAND;
  const notesOk = notes.trim().length >= QUICK_BRIEF_NOTES.min;
  const canSubmit = notesOk && platforms.length > 0 && (!isNewBrand || brandName.trim().length > 0);

  const togglePlatform = (p: Platform) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !canSubmit) return;
    const seed: Brief = createEmptyBrief();
    seed.project = { ...seed.project, platforms, durationSec: duration, scriptLanguage: language };
    const r = await run('brief_assist', (opts) => aiService.quickBrief(seed, notes, opts));
    if (!r) return;
    setBusy(true);
    try {
      let finalBrandId = brandId;
      if (isNewBrand) {
        const brand = await createBrand(uid, BrandFormSchema.parse({ name: brandName.trim(), description: notes.trim().slice(0, 2000) }));
        finalBrandId = brand.id;
      }
      const name = projectName.trim() || `Video ${r.brief.product.name || brandName.trim() || 'baru'}`.slice(0, 120);
      const project = await createProject(uid, { name, brandId: finalBrandId, brief: r.brief });
      const c = computeCompleteness(project.brief);
      setDone({ projectId: project.id, filled: r.filled.length, assumptions: r.assumptions, blockers: c.blockers.map((b) => b.label) });
      toast.success('Brief cepat siap');
    } catch {
      toast.error('Gagal menyimpan project.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;

  if (done)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Brief cepat siap" description={`AI mengisi ${done.filled} field brief. Periksa sebentar, lalu lanjut ke konsep.`} />
        {done.assumptions.length > 0 && (
          <Alert variant="info" title="Tebakan AI yang perlu Anda cek">
            <ul className="list-disc space-y-1 pl-5">
              {done.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Alert>
        )}
        {done.blockers.length > 0 ? (
          <Alert variant="warning" title={`${done.blockers.length} field wajib belum terisi`}>
            Lengkapi dulu di brief: {done.blockers.join(', ')}.
          </Alert>
        ) : (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Semua field wajib sudah terisi.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate(`/projects/${done.projectId}/brief?step=9`)}>Periksa brief</Button>
          {done.blockers.length === 0 && (
            <Button variant="outline" onClick={() => navigate(`/projects/${done.projectId}/concepts`)}>
              Langsung buat konsep
            </Button>
          )}
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Brief cepat"
        description="Ceritakan produk Anda dalam beberapa kalimat. AI mengisi brief lengkapnya, lalu Anda tinggal memeriksa."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Tentang usaha Anda
          </CardTitle>
          <CardDescription>
            Lebih suka mengisi sendiri?{' '}
            <Link to="/projects/new" className="text-primary underline">
              Buat project dengan brief lengkap
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="qb-brand" label="Brand / nama usaha">
            {brands.length > 0 && (
              <Select id="qb-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} className="mb-2">
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                <option value={NEW_BRAND}>+ Brand baru</option>
              </Select>
            )}
            {isNewBrand && (
              <Input
                id={brands.length ? 'qb-brand-name' : 'qb-brand'}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="mis. Kopi Senja"
                aria-label="Nama brand baru"
                maxLength={120}
              />
            )}
          </Field>
          <Field
            id="qb-notes"
            label="Ceritakan produk atau jasa Anda"
            hint={`Apa yang dijual, untuk siapa, kelebihannya, dan harga/promo bila ada. Minimal ${QUICK_BRIEF_NOTES.min} karakter.`}
          >
            <Textarea
              id="qb-notes"
              rows={6}
              value={notes}
              maxLength={QUICK_BRIEF_NOTES.max}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="mis. Kopi susu gula aren dalam botol 250 ml, dijual di kedai kecil dekat kampus. Pembelinya mahasiswa dan pekerja muda. Manisnya pas, dibuat tiap pagi, harga Rp15.000. Mau ajak orang pesan lewat WhatsApp."
            />
          </Field>
          <Field id="qb-platforms" label="Mau diposting di mana?">
            <div id="qb-platforms" className="flex flex-wrap gap-2" role="group" aria-label="Platform tujuan">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={platforms.includes(p)}
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    platforms.includes(p) ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  {LABELS.platform[p]}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="qb-duration" label="Durasi video">
              <Select id="qb-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} detik
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="qb-language" label="Bahasa voice-over">
              <Select id="qb-language" value={language} onChange={(e) => setLanguage(e.target.value as ScriptLanguage)}>
                {SCRIPT_LANGUAGES.filter((l) => l !== 'regional').map((l) => (
                  <option key={l} value={l}>
                    {LABELS.scriptLanguage[l]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field id="qb-name" label="Nama project" level="O" hint="Kosongkan untuk memakai nama produk.">
            <Input id="qb-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} maxLength={120} />
          </Field>
          <Button type="submit" className="w-full" disabled={!canSubmit || !!running} loading={running === 'brief_assist' || busy}>
            <Sparkles /> Buat brief dengan AI
          </Button>
          <p className="text-center text-xs text-muted-foreground">Satu panggilan AI. Semua isian bisa diubah setelahnya.</p>
        </CardContent>
      </Card>
    </form>
  );
}
