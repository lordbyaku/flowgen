import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/Field';
import { MultiToggle, optionsFrom } from '@/components/common/ToggleGroup';
import { GLOBAL_NEGATIVE_OPTIONS, LABELS } from '@/config/enums';
import { MAX_DIALOGUE_WORDS, WORDS_PER_SEC } from '@/config/constants';
import { totalWordBudget } from '@/domain/wordBudget';
import { BoolField, EnumField, ListField, StepSection, TextField, useBrief, useSetBrief } from '../fields';

export function Step8Output() {
  const brief = useBrief();
  const set = useSetBrief();
  const a = brief.audio;
  const wps = brief.project.scriptLanguage === 'en' ? WORDS_PER_SEC.en : WORDS_PER_SEC.id;
  return (
    <StepSection title="Langkah 8 — Audio, Teks, Larangan, dan Output" description="Teks overlay dibuat di CapCut, bukan di AI video.">
      <BoolField path="audio.voiceOver" label="Voice-over" />
      {a.voiceOver ? (
        <EnumField path="audio.voStyle" label="Gaya VO" options={optionsFrom(LABELS.voStyle)} />
      ) : (
        <div />
      )}
      {a.voiceOver && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground md:col-span-2">
          Kecepatan bicara ±{wps} kata/detik → anggaran VO maksimal{' '}
          <strong>{totalWordBudget(brief.project.durationSec, brief.project.scriptLanguage)} kata</strong> untuk {brief.project.durationSec} detik.
        </p>
      )}
      <BoolField path="audio.characterDialogue" label="Dialog karakter di dalam video" hint={`Bila Ya, prompt memuat dialog (maks ±${MAX_DIALOGUE_WORDS} kata per scene)`} />
      <TextField path="audio.musicMood" label="Mood musik" placeholder="mis. Upbeat ringan, akustik" />
      <TextField path="audio.sfx" label="SFX" placeholder="mis. Bunyi notifikasi, kasir" />
      <TextField path="audio.ambient" label="Ambient" placeholder="mis. Keramaian warung pagi" />
      <BoolField path="audio.textOverlay" label="Teks overlay (dibuat di CapCut)" />
      {a.textOverlay ? (
        <>
          <TextField path="audio.textStyle" label="Gaya teks" placeholder="mis. Bold sans putih dengan outline hitam" />
          <EnumField path="audio.textLanguage" label="Bahasa teks" options={optionsFrom(LABELS.textLanguage)} />
          <TextField path="audio.onScreenCta" label="CTA on-screen" placeholder="mis. Download gratis!" />
        </>
      ) : (
        <div />
      )}
      <BoolField path="audio.outroLogo" label="Outro logo" />
      {a.outroLogo && (
        <Field id="f-outro" label="Durasi outro (detik)" level="O">
          <Input id="f-outro" type="number" min={1} max={8} value={a.outroSec ?? ''} onChange={(e) => set('audio.outroSec', e.target.value ? Number(e.target.value) : undefined)} />
        </Field>
      )}
      <ListField path="output.globalNegatives" label="Larangan visual global" suggestions={GLOBAL_NEGATIVE_OPTIONS} placeholder="mis. blurry product" className="md:col-span-2" hint="Ditambahkan ke baris Avoid di setiap prompt (Inggris)" />
      <Field label="Varian prompt" level="O" hint="Standard selalu dibuat; Cinematic & Premium menambah panjang output">
        <MultiToggle
          options={optionsFrom(LABELS.variant)}
          value={brief.output.variants}
          onChange={(v) => set('output.variants', v.includes('standard') ? v : ['standard', ...v])}
          ariaLabel="Varian prompt"
        />
      </Field>
      <EnumField path="output.promptLength" label="Panjang prompt" options={optionsFrom(LABELS.promptLength)} clearable={false} />
      <EnumField path="output.flowMode" label="Mode di Google Flow" options={optionsFrom(LABELS.flowMode)} clearable={false} hint="Verifikasi fitur terbaru di Google Flow" />
    </StepSection>
  );
}
