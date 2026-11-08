import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
}

const pill = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
    active ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-card hover:bg-muted',
  );

/** Pilihan ganda berbentuk pill (aria-pressed). */
export function MultiToggle<T extends string>({
  options,
  value,
  onChange,
  max,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  max?: number;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value.includes(o.value);
        const disabled = !active && max !== undefined && value.length >= max;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            className={pill(active)}
            onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
          >
            {active && <Check className="h-3.5 w-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pilihan tunggal berbentuk pill (radiogroup). Klik ulang untuk mengosongkan bila `clearable`. */
export function SingleToggle<T extends string>({
  options,
  value,
  onChange,
  clearable = true,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  clearable?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={pill(active)}
            onClick={() => onChange(active && clearable ? undefined : o.value)}
          >
            {active && <Check className="h-3.5 w-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function optionsFrom<T extends string>(map: Record<T, string>): Option<T>[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
