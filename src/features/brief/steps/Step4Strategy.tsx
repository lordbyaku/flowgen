import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/Field';
import { MultiToggle, SingleToggle, optionsFrom } from '@/components/common/ToggleGroup';
import { LABELS } from '@/config/enums';
import { ListField, MultiEnumField, StepSection, useBrief, useSetBrief } from '../fields';

export function Step4Strategy() {
  const brief = useBrief();
  const set = useSetBrief();
  const s = brief.strategy;
  const filled = s.angles.length > 0 || s.aiPicksAngle;
  return (
    <StepSection title="Langkah 4 — Strategi Kreatif" description="Arah kreatif kampanye. Boleh biarkan AI memilih angle.">
      <Field label="Angle kampanye" level="W" className="md:col-span-2" empty={!filled} hint="Maksimal 2, atau biarkan AI memilihkan">
        <MultiToggle
          options={optionsFrom(LABELS.angle)}
          value={s.angles}
          max={2}
          onChange={(v) => {
            set('strategy.angles', v);
            if (v.length) set('strategy.aiPicksAngle', false);
          }}
          ariaLabel="Angle kampanye"
        />
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.aiPicksAngle}
            onChange={(e) => {
              set('strategy.aiPicksAngle', e.target.checked);
              if (e.target.checked) set('strategy.angles', []);
            }}
          />
          AI pilihkan angle terbaik
        </label>
      </Field>
      <MultiEnumField path="strategy.hookStyles" label="Gaya hook" options={optionsFrom(LABELS.hookStyle)} className="md:col-span-2" />
      <Field label="Jumlah alternatif konsep" level="O">
        <SingleToggle
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
          ]}
          value={String(s.conceptAlternatives)}
          clearable={false}
          onChange={(v) => set('strategy.conceptAlternatives', Number(v))}
          ariaLabel="Jumlah alternatif konsep"
        />
      </Field>
      <div />
      <Field label="Iklan referensi" level="O" className="md:col-span-2" hint="URL iklan plus apa yang Anda sukai">
        <div className="space-y-2">
          {s.referenceAds.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={r.url}
                placeholder="https://www.tiktok.com/…"
                onChange={(e) => set('strategy.referenceAds', s.referenceAds.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                aria-label={`URL iklan ${i + 1}`}
              />
              <Input
                value={r.liked}
                placeholder="Yang disukai: transisi cepat, hook pertanyaan"
                onChange={(e) => set('strategy.referenceAds', s.referenceAds.map((x, j) => (j === i ? { ...x, liked: e.target.value } : x)))}
                aria-label={`Yang disukai dari iklan ${i + 1}`}
              />
              <Button type="button" size="icon" variant="ghost" aria-label="Hapus iklan" onClick={() => set('strategy.referenceAds', s.referenceAds.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          {s.referenceAds.length < 5 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set('strategy.referenceAds', [...s.referenceAds, { url: '', liked: '' }])}>
              <Plus /> Tambah iklan referensi
            </Button>
          )}
        </div>
      </Field>
      <ListField path="strategy.mustInclude" label="Wajib ada (must include)" placeholder="mis. Adegan pelanggan tersenyum" />
      <ListField path="strategy.mustAvoid" label="Wajib dihindari (must avoid)" placeholder="mis. Menyebut merek kompetitor" />
    </StepSection>
  );
}
