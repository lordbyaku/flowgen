import * as React from 'react';
import { optionsFrom } from '@/components/common/ToggleGroup';
import { Field } from '@/components/common/Field';
import { Input } from '@/components/ui/input';
import { SingleToggle } from '@/components/common/ToggleGroup';
import { LABELS, LOCATION_OPTIONS } from '@/config/enums';
import { EnumField, ListField, StepSection, TextField, useBrief, useSetBrief } from '../fields';

export function Step7Location() {
  const brief = useBrief();
  const set = useSetBrief();
  const main = brief.location.main;
  const isPreset = (LOCATION_OPTIONS as readonly string[]).includes(main);
  // Mode kustom disimpan di state UI, bukan dengan nilai palsu di data.
  const [custom, setCustom] = React.useState(main !== '' && !isPreset);
  return (
    <StepSection title="Langkah 7 — Lokasi dan Props" description="Setting yang konsisten membuat klip terasa satu cerita.">
      <Field id="f-loc" label="Lokasi utama" level="W" className="md:col-span-2" empty={!main.trim()}>
        <SingleToggle
          options={[...LOCATION_OPTIONS.map((l) => ({ value: l as string, label: l as string })), { value: '__custom', label: 'Kustom' }]}
          value={custom ? '__custom' : main || undefined}
          onChange={(v) => {
            if (v === '__custom') {
              setCustom(true);
              if (isPreset) set('location.main', '');
            } else {
              setCustom(false);
              set('location.main', v ?? '');
            }
          }}
          ariaLabel="Lokasi utama"
        />
        {custom && (
          <Input id="f-loc" className="mt-2" value={main} placeholder="mis. Bengkel motor pinggir jalan" onChange={(e) => set('location.main', e.target.value)} />
        )}
      </Field>
      <EnumField path="location.indoorOutdoor" label="Indoor/Outdoor" options={optionsFrom(LABELS.indoorOutdoor)} />
      <EnumField path="location.timeOfDay" label="Waktu" options={optionsFrom(LABELS.timeOfDay)} />
      <EnumField
        path="location.weather"
        label="Cuaca"
        options={['Cerah', 'Mendung', 'Hujan', 'Tidak relevan'].map((v) => ({ value: v, label: v }))}
      />
      <EnumField
        path="location.condition"
        label="Kondisi tempat"
        options={['Rapi', 'Ramai', 'Sibuk', 'Minimalis'].map((v) => ({ value: v, label: v }))}
      />
      <EnumField path="location.extras" label="Jumlah figuran" options={optionsFrom(LABELS.extras)} />
      <ListField path="location.requiredProps" label="Props wajib" placeholder="mis. Meja kasir kayu" />
      <TextField path="location.perSceneNotes" label="Lokasi khusus per scene" multiline placeholder="mis. Scene terakhir di depan warung" />
      <TextField path="location.localFlavor" label="Nuansa lokal" multiline placeholder="mis. Papan harga, meja kasir khas warung, galon air" hint="Detail khas Indonesia yang membuat video terasa lokal" />
    </StepSection>
  );
}
