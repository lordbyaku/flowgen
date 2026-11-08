import { optionsFrom } from '@/components/common/ToggleGroup';
import { LABELS } from '@/config/enums';
import { EnumField, ListField, MultiEnumField, StepSection, TextField } from '../fields';

export function Step5Visual() {
  return (
    <StepSection title="Langkah 5 — Gaya Visual dan Sinematografi" description="Dipakai untuk Visual Bible yang diikuti semua prompt.">
      <EnumField path="visual.realism" label="Tingkat realisme" options={optionsFrom(LABELS.realism)} />
      <EnumField path="visual.style" label="Gaya kreatif" options={optionsFrom(LABELS.creativeStyle)} />
      <EnumField path="visual.tone" label="Tone" options={optionsFrom(LABELS.tone)} />
      <EnumField path="visual.pacing" label="Pacing" options={optionsFrom(LABELS.pacing)} />
      <ListField path="visual.palette" label="Palet warna" max={4} placeholder="#16a34a" hint="Hex, maksimal 4" />
      <EnumField path="visual.grading" label="Color grading" options={optionsFrom(LABELS.grading)} />
      <MultiEnumField path="visual.cameraStyles" label="Gaya kamera" options={optionsFrom(LABELS.cameraStyle)} hint="Hindari kombinasi kontradiktif seperti tripod + handheld dalam satu scene" />
      <EnumField path="visual.lens" label="Lensa" options={optionsFrom(LABELS.lens)} />
      <EnumField path="visual.depthOfField" label="Depth of field" options={optionsFrom(LABELS.dof)} />
      <MultiEnumField path="visual.lighting" label="Pencahayaan" options={optionsFrom(LABELS.lighting)} />
      <MultiEnumField path="visual.dominantShots" label="Shot dominan" options={optionsFrom(LABELS.shot)} />
      <MultiEnumField path="visual.transitions" label="Transisi" options={optionsFrom(LABELS.transition)} />
      <TextField path="visual.referenceVideoUrl" label="Video referensi" placeholder="https://…" type="url" />
    </StepSection>
  );
}
