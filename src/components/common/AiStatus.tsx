import * as React from 'react';
import { Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';
import { LABELS } from '@/config/enums';
import { formatTime } from '@/lib/format';
import { phaseLabel, useAiStatusStore } from '@/stores/aiStatusStore';

/** Bar status AI global dengan tombol Batal. */
export function AiRunBar() {
  const running = useAiStatusStore((s) => s.running);
  const phase = useAiStatusStore((s) => s.phase);
  const detail = useAiStatusStore((s) => s.detail);
  const cancel = useAiStatusStore((s) => s.cancel);
  if (!running) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-16 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-xl items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-lg md:bottom-4"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{LABELS.aiTask[running]}</span>
        <span className="text-muted-foreground"> · {phaseLabel(phase)}</span>
        {detail && <span className="text-muted-foreground"> · {detail}</span>}
      </div>
      <Button size="sm" variant="ghost" onClick={cancel}>
        <Square /> Batal
      </Button>
    </div>
  );
}

/** Kartu error AI terakhir dengan panel Lihat output mentah dan tombol Coba lagi. */
export function AiErrorPanel({ onRetry }: { onRetry?: () => void }) {
  const err = useAiStatusStore((s) => s.lastError);
  const clear = useAiStatusStore((s) => s.clearError);
  const [showRaw, setShowRaw] = React.useState(false);
  if (!err) return null;
  return (
    <Alert
      variant={err.code === 'rate_limit' || err.code === 'quota_daily' || err.code === 'no_eligible_key' ? 'warning' : 'error'}
      title="Permintaan AI gagal"
      className="mb-4"
      action={
        <div className="flex gap-1">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Coba lagi
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={clear}>
            Tutup
          </Button>
        </div>
      }
    >
      <p>{err.message}</p>
      {err.retryAt && <p className="text-xs">Bisa dicoba lagi sekitar {formatTime(err.retryAt)}.</p>}
      {err.rawOutput && (
        <div className="mt-2">
          <button type="button" className="text-xs underline" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? 'Sembunyikan' : 'Lihat'} output mentah
          </button>
          {showRaw && (
            <pre className="prose-prompt mt-2 max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">{err.rawOutput}</pre>
          )}
        </div>
      )}
    </Alert>
  );
}
