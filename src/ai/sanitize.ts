/**
 * Pola API key Gemini yang dikenali.
 * - Format lama: `AIza` + 35 karakter.
 * - Format baru (2026): `AQ.` + token base64url panjang. [VERIFIKASI] panjang pasti tidak dipublikasikan,
 *   jadi pola dibuat longgar (≥ 20 karakter) agar redaksi tetap aman.
 */
export const GEMINI_KEY_PATTERNS: RegExp[] = [/AIza[0-9A-Za-z_-]{35}/g, /AQ\.[0-9A-Za-z_-]{20,}/g];
const QUERY_KEY = /([?&]key=)[^&\s"']+/gi;

/** Ganti semua pola key dengan [REDACTED]. Dipakai untuk setiap string error/log. */
export function redactSecrets(text: string, extraSecrets: string[] = []): string {
  let out = GEMINI_KEY_PATTERNS.reduce((acc, re) => acc.replace(re, '[REDACTED]'), text).replace(QUERY_KEY, '$1[REDACTED]');
  for (const s of extraSecrets) {
    if (s && s.length >= 8) out = out.split(s).join('[REDACTED]');
  }
  return out;
}

/** Peringatan format key (bukan pemblokir): menerima format lama `AIza…` dan format baru `AQ.…`. */
export function looksLikeGeminiKey(key: string): boolean {
  const k = key.trim();
  return /^AIza[0-9A-Za-z_-]{35}$/.test(k) || /^AQ\.[0-9A-Za-z_-]{30,}$/.test(k);
}

export const KEY_FORMAT_HINT = 'Format umum: AQ.… (baru) atau AIza… (lama).';
