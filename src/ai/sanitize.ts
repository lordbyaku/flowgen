/** Pola key Gemini umum (AIza + 35 karakter) dan pola query string `key=`. */
const KEY_PATTERN = /AIza[0-9A-Za-z_-]{35}/g;
const QUERY_KEY = /([?&]key=)[^&\s"']+/gi;

/** Ganti semua pola key dengan [REDACTED]. Dipakai untuk setiap string error/log. */
export function redactSecrets(text: string, extraSecrets: string[] = []): string {
  let out = text.replace(KEY_PATTERN, '[REDACTED]').replace(QUERY_KEY, '$1[REDACTED]');
  for (const s of extraSecrets) {
    if (s && s.length >= 8) out = out.split(s).join('[REDACTED]');
  }
  return out;
}

/** Peringatan format key (bukan pemblokir). */
export function looksLikeGeminiKey(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{35}$/.test(key.trim());
}
