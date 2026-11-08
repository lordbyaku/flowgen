/** Sumber waktu yang dapat dipalsukan di tes. */
export const now = (): number => Date.now();

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Tengah malam berikutnya pada zona waktu tertentu (default Pacific), dalam epoch ms.
 * Dihitung dengan Intl agar mengikuti DST.
 */
export function nextMidnightInZone(nowMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(nowMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const h = get('hour') % 24;
  const elapsedSec = h * 3600 + get('minute') * 60 + get('second');
  const msIntoSecond = nowMs % 1000;
  return nowMs - msIntoSecond + (86400 - elapsedSec) * 1000;
}
