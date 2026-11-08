import * as React from 'react';
import { BRIEF_FIELDS, type FieldLevel } from '@/config/presets';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ChipInput } from '@/components/common/ChipInput';
import { Field } from '@/components/common/Field';
import { MultiToggle, SingleToggle } from '@/components/common/ToggleGroup';
import { getPath, isFilledValue, setPath } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import type { Brief } from '@/types';

export function useBrief(): Brief {
  return useProjectStore((s) => s.project!.brief);
}

export function useSetBrief() {
  const updateBrief = useProjectStore((s) => s.updateBrief);
  return React.useCallback((path: string, value: unknown) => updateBrief((b) => setPath(b, path, value)), [updateBrief]);
}

const levelOf = (path: string): FieldLevel | undefined => BRIEF_FIELDS.find((f) => f.path === path)?.level;
const idOf = (path: string) => `f-${path.replace(/\./g, '-')}`;

interface BaseProps {
  path: string;
  label: string;
  hint?: string;
  placeholder?: string;
  level?: FieldLevel;
  className?: string;
}

export function TextField({ path, label, hint, placeholder, level, className, multiline, type = 'text', maxLength }: BaseProps & { multiline?: boolean; type?: string; maxLength?: number }) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = (getPath(brief, path) as string | undefined) ?? '';
  const lv = level ?? levelOf(path);
  const id = idOf(path);
  const tooLong = maxLength !== undefined && value.length > maxLength;
  return (
    <Field id={id} label={label} level={lv} hint={hint} className={className} empty={!isFilledValue(value)} error={tooLong ? `Maksimal ${maxLength} karakter` : null}>
      {multiline ? (
        <Textarea id={id} value={value} placeholder={placeholder} onChange={(e) => set(path, e.target.value)} aria-invalid={tooLong} />
      ) : (
        <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => set(path, e.target.value)} aria-invalid={tooLong} />
      )}
    </Field>
  );
}

export function NumberField({ path, label, hint, placeholder, level, className, min, max }: BaseProps & { min: number; max: number }) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = getPath(brief, path) as number | undefined;
  const lv = level ?? levelOf(path);
  const id = idOf(path);
  const invalid = value !== undefined && (value < min || value > max || !Number.isInteger(value));
  return (
    <Field id={id} label={label} level={lv} hint={hint} className={className} error={invalid ? `Isi bilangan bulat ${min}–${max}` : null}>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(path, e.target.value === '' ? undefined : Number(e.target.value))}
        aria-invalid={invalid}
      />
    </Field>
  );
}

export function ListField({ path, label, hint, placeholder, level, className, max, suggestions }: BaseProps & { max?: number; suggestions?: readonly string[] }) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = (getPath(brief, path) as string[] | undefined) ?? [];
  const lv = level ?? levelOf(path);
  const id = idOf(path);
  return (
    <Field id={id} label={label} level={lv} hint={hint} className={className} empty={value.length === 0}>
      <ChipInput id={id} value={value} onChange={(v) => set(path, v)} max={max} placeholder={placeholder} suggestions={suggestions} ariaLabel={label} />
    </Field>
  );
}

export function EnumField<T extends string>({
  path,
  label,
  hint,
  level,
  className,
  options,
  clearable = true,
}: BaseProps & { options: { value: T; label: string }[]; clearable?: boolean }) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = getPath(brief, path) as T | undefined;
  const lv = level ?? levelOf(path);
  return (
    <Field label={label} level={lv} hint={hint} className={className} empty={!value}>
      <SingleToggle options={options} value={value} onChange={(v) => set(path, v)} clearable={clearable} ariaLabel={label} />
    </Field>
  );
}

export function MultiEnumField<T extends string>({
  path,
  label,
  hint,
  level,
  className,
  options,
  max,
}: BaseProps & { options: { value: T; label: string }[]; max?: number }) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = (getPath(brief, path) as T[] | undefined) ?? [];
  const lv = level ?? levelOf(path);
  return (
    <Field label={label} level={lv} hint={hint ?? (max ? `Maksimal ${max}` : undefined)} className={className} empty={value.length === 0}>
      <MultiToggle options={options} value={value} onChange={(v) => set(path, v)} max={max} ariaLabel={label} />
    </Field>
  );
}

export function SelectField<T extends string>({
  path,
  label,
  hint,
  level,
  className,
  options,
  placeholder = '— Pilih —',
}: BaseProps & { options: { value: T; label: string }[] }) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = (getPath(brief, path) as string | undefined) ?? '';
  const lv = level ?? levelOf(path);
  const id = idOf(path);
  return (
    <Field id={id} label={label} level={lv} hint={hint} className={className} empty={!value}>
      <Select id={id} value={value} onChange={(e) => set(path, e.target.value || undefined)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function BoolField({ path, label, hint, className }: BaseProps) {
  const brief = useBrief();
  const set = useSetBrief();
  const value = Boolean(getPath(brief, path));
  return (
    <Field label={label} hint={hint} className={className}>
      <SingleToggle
        options={[
          { value: 'yes', label: 'Ya' },
          { value: 'no', label: 'Tidak' },
        ]}
        value={value ? 'yes' : 'no'}
        clearable={false}
        onChange={(v) => set(path, v === 'yes')}
        ariaLabel={label}
      />
    </Field>
  );
}

export function StepSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}
