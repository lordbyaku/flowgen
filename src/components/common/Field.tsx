import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import type { FieldLevel } from '@/config/presets';
import { cn } from '@/lib/utils';

const LEVEL_STYLE: Record<FieldLevel, { cls: string; title: string }> = {
  W: { cls: 'bg-destructive/15 text-destructive', title: 'Wajib — generate diblokir bila kosong' },
  P: { cls: 'bg-warning/15 text-warning', title: 'Penting — sangat memengaruhi hasil' },
  O: { cls: 'bg-muted text-muted-foreground', title: 'Opsional' },
};

export function LevelBadge({ level }: { level: FieldLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold leading-none', s.cls)} title={s.title}>
      {level}
      <span className="sr-only"> ({s.title})</span>
    </span>
  );
}

/** Pembungkus field: label, penanda W/P/O, tooltip, contoh, dan pesan error inline. */
export function Field({
  id,
  label,
  level,
  hint,
  error,
  children,
  className,
  empty,
}: {
  id?: string;
  label: string;
  level?: FieldLevel;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  /** Tandai field W yang masih kosong. */
  empty?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {level && <LevelBadge level={level} />}
        {hint && (
          <Tooltip content={hint}>
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`Bantuan: ${label}`}>
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
        {empty && level === 'W' && <span className="text-xs text-destructive">belum diisi</span>}
      </div>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
