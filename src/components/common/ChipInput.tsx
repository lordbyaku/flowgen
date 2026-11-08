import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Input daftar berbentuk chip dengan batas jumlah. Enter atau koma untuk menambah. */
export function ChipInput({
  id,
  value,
  onChange,
  max,
  placeholder,
  suggestions,
  ariaLabel,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  placeholder?: string;
  suggestions?: readonly string[];
  ariaLabel?: string;
}) {
  const [draft, setDraft] = React.useState('');
  const full = max !== undefined && value.length >= max;

  const add = (raw: string) => {
    const items = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.length) return;
    const next = [...value];
    for (const it of items) {
      if (max !== undefined && next.length >= max) break;
      if (!next.some((v) => v.toLowerCase() === it.toLowerCase())) next.push(it);
    }
    onChange(next);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={ariaLabel}>
          {value.map((v, i) => (
            <li key={`${v}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
              <span className="truncate">{v}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Hapus ${v}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={full}
          placeholder={full ? `Maksimal ${max} item` : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          aria-label={ariaLabel}
        />
        <Button type="button" variant="outline" size="icon" disabled={full || !draft.trim()} onClick={() => add(draft)} aria-label="Tambah">
          <Plus />
        </Button>
      </div>
      {suggestions && suggestions.length > 0 && !full && (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => add(s)}
                className={cn('rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted')}
              >
                + {s}
              </button>
            ))}
        </div>
      )}
      {max !== undefined && (
        <p className="text-xs text-muted-foreground">
          {value.length}/{max}
        </p>
      )}
    </div>
  );
}
