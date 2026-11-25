import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Field } from '@/components/common/Field';
import { PageHeader } from '@/components/common/states';
import { SingleToggle, optionsFrom } from '@/components/common/ToggleGroup';
import { ASPECT_RATIOS, LABELS } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { saveSimpleVideo } from '@/data/simpleRepo';
import { planClips } from '@/domain/simpleVideo';
import { SimpleVideoInputSchema } from '@/schemas/simple.schema';
import { useAuthStore } from '@/stores/authStore';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useAiAction } from '@/features/shared/useAiAction';
import type { AspectRatio, SimpleSpeech, SimpleStyle, SimpleVideoInput } from '@/types';

const DURATIONS = ['8', '10', '15', '20', '30', '45', '60'] as const;

const DEFAULT_SIMPLE_INPUT: Omit<SimpleVideoInput, 'idea'> = {
  durationSec: 15,
  aspectRatio: '9:16',
  style: 'ugc',
  speech: 'none',
  speechLanguage: 'id',
  useAssets: true,
};

export default function SimpleVideoNew() {
  const uid = useAuthStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const run = useAiAction();
  const running = useAiStatusStore((s) => s.running);
  const [idea, setIdea] = React.useState(params.get('idea') ?? '');
  const [form, setForm] = React.useState(DEFAULT_SIMPLE_INPUT);
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const parsed = SimpleVideoInputSchema.safeParse({ ...form, idea });
  const clips = planClips(form.durationSec);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !parsed.success) return;
    const v = await run('simple_video', (opts) => aiService.simpleVideo(parsed.data, opts));
    if (!v) return;
    setSaving(true);
    try {
      await saveSimpleVideo(uid, v);
      navigate(`/simple/video/${v.id}`);
    } catch {
      toast.error('Gagal menyimpan hasil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Ide → Video Omni" description="Tulis idemu. AI membaginya menjadi klip pendek dan menulis prompt yang siap ditempel di Google Flow." />
      <Card>
        <CardContent className="space-y-4 pt-4">
          <Field id="sv-idea" label="Ide video" hint="Siapa, di mana, terjadi apa. Sebut produk bila ada. Satu-tiga kalimat sudah cukup.">
            <Textarea
              id="sv-idea"
              rows={5}
              value={idea}
              maxLength={1500}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="mis. Ibu penjual kopi keliling di gang pagi hari membuat kopi susu gula aren untuk pekerja yang buru-buru, pekerja itu tersenyum setelah menyeruput."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sv-duration" label="Durasi total">
              <SingleToggle
                ariaLabel="Durasi total"
                clearable={false}
                options={DURATIONS.map((d) => ({ value: d, label: `${d} dtk` }))}
                value={String(form.durationSec) as (typeof DURATIONS)[number]}
                onChange={(v) => v && set('durationSec', Number(v))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {clips.length} klip: {clips.map((c) => `${c} dtk`).join(' + ')}
              </p>
            </Field>
            <Field id="sv-ratio" label="Rasio">
              <SingleToggle
                ariaLabel="Rasio"
                clearable={false}
                options={ASPECT_RATIOS.map((r) => ({ value: r, label: LABELS.aspectRatio[r] }))}
                value={form.aspectRatio}
                onChange={(v) => v && set('aspectRatio', v as AspectRatio)}
              />
            </Field>
          </div>
          <Field id="sv-speech" label="Suara orang di video">
            <SingleToggle ariaLabel="Suara orang" clearable={false} options={optionsFrom(LABELS.simpleSpeech)} value={form.speech} onChange={(v) => v && set('speech', v as SimpleSpeech)} />
          </Field>
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Opsi lain (gaya, bahasa, aset)</summary>
            <div className="mt-3 space-y-4">
              <Field id="sv-style" label="Gaya visual">
                <SingleToggle ariaLabel="Gaya visual" clearable={false} options={optionsFrom(LABELS.simpleStyle)} value={form.style} onChange={(v) => v && set('style', v as SimpleStyle)} />
              </Field>
              {form.speech !== 'none' && (
                <Field id="sv-lang" label="Bahasa ucapan">
                  <SingleToggle
                    ariaLabel="Bahasa ucapan"
                    clearable={false}
                    options={[
                      { value: 'id', label: 'Indonesia' },
                      { value: 'en', label: 'Inggris' },
                    ]}
                    value={form.speechLanguage}
                    onChange={(v) => v && set('speechLanguage', v as 'id' | 'en')}
                  />
                </Field>
              )}
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={form.useAssets} onChange={(e) => set('useAssets', e.target.checked)} />
                <span>
                  <span className="font-medium">Buat tokoh & produk sebagai aset Flow dulu</span>
                  <span className="block text-xs text-muted-foreground">
                    Disarankan: wajah dan produk tetap sama di semua klip. Matikan bila ingin langsung tempel prompt tanpa membuat gambar.
                  </span>
                </span>
              </label>
            </div>
          </details>
          <Button type="submit" className="w-full" disabled={!parsed.success || !!running} loading={running === 'simple_video' || saving}>
            <Sparkles /> Buat prompt
          </Button>
          <p className="text-center text-xs text-muted-foreground">Satu panggilan AI. Hasil tersimpan dan bisa dibuka lagi dari Beranda.</p>
        </CardContent>
      </Card>
    </form>
  );
}
