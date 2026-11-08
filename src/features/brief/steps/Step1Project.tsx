import { Link } from 'react-router-dom';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/common/Field';
import { SingleToggle, optionsFrom } from '@/components/common/ToggleGroup';
import { DURATION_OPTIONS, LABELS } from '@/config/enums';
import { MAX_SCENE_SEC } from '@/config/constants';
import { maxScenes, minScenes, recommendedScenes, validateManualSceneCount } from '@/domain/duration';
import { totalWordBudget } from '@/domain/wordBudget';
import { useBrands } from '@/features/brands/useBrands';
import { EnumField, MultiEnumField, StepSection, TextField, useBrief, useSetBrief } from '../fields';

export function Step1Project() {
  const brief = useBrief();
  const set = useSetBrief();
  const { brands } = useBrands();
  const p = brief.project;
  const isCustom = !(DURATION_OPTIONS as readonly number[]).includes(p.durationSec);
  const countError = p.sceneCountMode === 'manual' && p.sceneCount ? validateManualSceneCount(p.durationSec, p.sceneCount) : null;
  const durErr = p.durationSec < 5 || p.durationSec > 120 ? 'Durasi 5–120 detik' : null;

  return (
    <StepSection title="Langkah 1 — Project dan Platform" description="Identitas project, tujuan, dan format video.">
      <TextField path="project.name" label="Nama project" placeholder="mis. Promo Warungku-POS Juli" hint="Nama internal untuk project ini" />
      <Field id="f-brand" label="Brand" level="W" empty={!p.brandId} hint="Konteks brand dikirim ke AI">
        <div className="flex gap-2">
          <Select id="f-brand" value={p.brandId} onChange={(e) => set('project.brandId', e.target.value)}>
            <option value="">— Pilih brand —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Link to="/brands/new" className="shrink-0 self-center text-xs text-primary underline">
            Brand baru
          </Link>
        </div>
      </Field>
      <EnumField path="project.objective" label="Tujuan video" options={optionsFrom(LABELS.objective)} className="md:col-span-2" hint="Apa yang ingin dicapai video ini" />
      <MultiEnumField path="project.platforms" label="Platform tujuan" options={optionsFrom(LABELS.platform)} className="md:col-span-2" />
      <EnumField path="project.aspectRatio" label="Aspect ratio" options={optionsFrom(LABELS.aspectRatio)} clearable={false} hint="9:16 untuk TikTok/Reels/Shorts" />
      <Field id="f-dur" label="Durasi total" level="W" error={durErr} hint={`Maks ${MAX_SCENE_SEC} detik per scene di Google Flow`}>
        <div className="flex flex-wrap gap-2">
          <SingleToggle
            options={[...DURATION_OPTIONS.map((d) => ({ value: String(d), label: `${d} dtk` })), { value: 'custom', label: 'Kustom' }]}
            value={isCustom ? 'custom' : String(p.durationSec)}
            clearable={false}
            onChange={(v) => v && v !== 'custom' && set('project.durationSec', Number(v))}
            ariaLabel="Durasi total"
          />
          {isCustom && (
            <Input
              id="f-dur"
              type="number"
              min={5}
              max={120}
              className="w-28"
              value={p.durationSec}
              onChange={(e) => set('project.durationSec', Number(e.target.value) || 0)}
              aria-label="Durasi kustom (detik)"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Minimal {minScenes(p.durationSec)} scene · anggaran VO ±{totalWordBudget(p.durationSec, p.scriptLanguage)} kata
        </p>
      </Field>
      <Field label="Jumlah scene" level="O" error={countError} hint="Auto disarankan. Minimum = durasi dibagi 8 detik, dibulatkan ke atas.">
        <SingleToggle
          options={[
            { value: 'auto', label: `Auto (≈${recommendedScenes(p.durationSec)})` },
            { value: 'manual', label: 'Manual' },
          ]}
          value={p.sceneCountMode}
          clearable={false}
          onChange={(v) => {
            set('project.sceneCountMode', v);
            if (v === 'manual' && !p.sceneCount) set('project.sceneCount', recommendedScenes(p.durationSec));
          }}
          ariaLabel="Mode jumlah scene"
        />
        {p.sceneCountMode === 'manual' && (
          <Input
            type="number"
            min={minScenes(p.durationSec)}
            max={maxScenes(p.durationSec)}
            className="mt-2 w-28"
            value={p.sceneCount ?? ''}
            onChange={(e) => set('project.sceneCount', e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Jumlah scene manual"
          />
        )}
      </Field>
      <EnumField path="project.scriptLanguage" label="Bahasa naskah dan VO" options={optionsFrom(LABELS.scriptLanguage)} clearable={false} />
      {p.scriptLanguage === 'regional' && (
        <TextField path="project.regionalNote" label="Bahasa daerah" placeholder="mis. Bahasa Jawa ngoko, logat Surabaya" />
      )}
    </StepSection>
  );
}
