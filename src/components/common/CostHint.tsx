import { Coins } from 'lucide-react';
import type { CallEstimate } from '@/ai/aiService';
import { formatNumber } from '@/lib/format';

/** Perkiraan biaya panggilan AI sebelum generate (lokal; bukan angka resmi Google). */
export function CostHint({ est }: { est: CallEstimate }) {
  if (est.calls === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" title="Perkiraan lokal (karakter ÷ 4). Perbaikan JSON dapat menambah 1 panggilan.">
      <Coins className="h-3.5 w-3.5" aria-hidden />≈ {est.calls} panggilan · ±{formatNumber(est.inputTokens)} token input · maks{' '}
      {formatNumber(est.maxOutputTokens)} token output
      {est.images > 0 && ` · ${est.images} gambar referensi`}
    </p>
  );
}
