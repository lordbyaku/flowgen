import { optionsFrom } from '@/components/common/ToggleGroup';
import { AGE_RANGES, LABELS } from '@/config/enums';
import { EnumField, SelectField, StepSection, TextField } from '../fields';

export function Step3Audience() {
  return (
    <StepSection title="Langkah 3 — Audiens dan Pesan" description="Siapa yang ditonton, apa masalahnya, dan apa yang harus mereka lakukan.">
      <SelectField path="audience.ageRange" label="Rentang usia" options={AGE_RANGES.map((a) => ({ value: a, label: a }))} />
      <EnumField path="audience.gender" label="Gender sasaran" options={optionsFrom(LABELS.gender)} clearable={false} />
      <TextField path="audience.location" label="Lokasi" placeholder="mis. Jabodetabek, kota kecil Jawa Timur" />
      <TextField path="audience.segment" label="Segmen/profesi" placeholder="mis. Pemilik warung, karyawan admin" />
      <TextField path="audience.painPoint" label="Masalah utama audiens" multiline placeholder="mis. Catatan penjualan di buku sering salah hitung" className="md:col-span-2" />
      <TextField path="audience.desire" label="Keinginan audiens" multiline placeholder="mis. Tahu untung harian tanpa repot" />
      <TextField path="audience.objection" label="Keberatan utama" multiline placeholder="mis. Takut ribet, mahal" />
      <EnumField path="audience.awareness" label="Tingkat kesadaran" options={optionsFrom(LABELS.awareness)} className="md:col-span-2" />
      <EnumField path="audience.speechStyle" label="Gaya bicara audiens" options={optionsFrom(LABELS.speechStyle)} />
      <TextField path="audience.keyMessage" label="Pesan utama" placeholder="1 kalimat, mis. Kasir warung jadi rapi cukup dari HP" hint="Satu kalimat yang harus diingat penonton" />
      <TextField path="audience.cta" label="Call to action" placeholder="mis. Klik link di bio" />
      <TextField path="audience.offerDeadline" label="Penawaran dan batas waktu" placeholder="mis. Gratis 30 hari, sampai 31 Juli" />
      <TextField path="audience.competitorDiff" label="Alternatif/kompetitor dan pembeda" multiline placeholder="mis. Dibanding buku kas: otomatis & tidak hilang" className="md:col-span-2" />
    </StepSection>
  );
}
