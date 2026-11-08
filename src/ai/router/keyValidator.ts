import { looksLikeGeminiKey } from '@/ai/sanitize';
import { MAX_KEYS } from '@/config/constants';

export interface FormatCheck {
  /** Peringatan saja, bukan pemblokir (format dapat berubah). */
  warning: string | null;
}

export function checkKeyFormat(apiKey: string): FormatCheck {
  return {
    warning: looksLikeGeminiKey(apiKey)
      ? null
      : 'Format key tidak seperti biasanya (AIza + 35 karakter). Tetap bisa disimpan, tetapi periksa kembali.',
  };
}

export function canAddKey(currentCount: number): boolean {
  return currentCount < MAX_KEYS;
}
