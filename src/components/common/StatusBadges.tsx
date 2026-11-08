import { AlertCircle, CheckCircle2, CircleDashed, Clock, Cloud, CloudOff, Loader2, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LABELS } from '@/config/enums';
import type { KeyStatus } from '@/types';
import type { SaveStatus } from '@/stores/projectStore';

const KEY_VARIANT: Record<KeyStatus, 'success' | 'destructive' | 'warning' | 'muted'> = {
  not_tested: 'muted',
  connected: 'success',
  invalid_key: 'destructive',
  model_unavailable: 'destructive',
  rate_limited: 'warning',
  quota_exhausted: 'warning',
  network_error: 'warning',
  disabled: 'muted',
};

export function KeyStatusBadge({ status }: { status: KeyStatus }) {
  const Icon = status === 'connected' ? CheckCircle2 : status === 'not_tested' || status === 'disabled' ? CircleDashed : AlertCircle;
  return (
    <Badge variant={KEY_VARIANT[status]}>
      <Icon aria-hidden />
      {LABELS.keyStatus[status]}
    </Badge>
  );
}

export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry?: () => void }) {
  if (status === 'saving')
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
        <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan…
      </span>
    );
  if (status === 'saved')
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success" role="status">
        <Cloud className="h-3 w-3" /> Tersimpan
      </span>
    );
  if (status === 'error')
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive" role="alert">
        <CloudOff className="h-3 w-3" /> Gagal menyimpan
        {onRetry && (
          <button type="button" className="underline" onClick={onRetry}>
            Coba lagi
          </button>
        )}
      </span>
    );
  return null;
}

export function VaultBadge({ status }: { status: 'loading' | 'uninitialized' | 'locked' | 'unlocked' }) {
  if (status === 'unlocked')
    return (
      <Badge variant="success">
        <Unlock aria-hidden /> Vault terbuka
      </Badge>
    );
  if (status === 'locked')
    return (
      <Badge variant="warning">
        <Lock aria-hidden /> Vault terkunci
      </Badge>
    );
  if (status === 'uninitialized')
    return (
      <Badge variant="muted">
        <Lock aria-hidden /> Belum ada key
      </Badge>
    );
  return (
    <Badge variant="muted">
      <Clock aria-hidden /> Memuat
    </Badge>
  );
}
