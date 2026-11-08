import { format, formatDistanceToNowStrict } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function formatDateTime(ms?: number): string {
  if (!ms) return '-';
  return format(ms, 'd MMM yyyy HH:mm', { locale: idLocale });
}

export function formatTime(ms?: number): string {
  if (!ms) return '-';
  return format(ms, 'HH:mm:ss', { locale: idLocale });
}

export function formatRelative(ms?: number): string {
  if (!ms) return '-';
  return formatDistanceToNowStrict(ms, { locale: idLocale, addSuffix: true });
}

export function formatCountdown(untilMs: number, now = Date.now()): string {
  const s = Math.max(0, Math.ceil((untilMs - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${sec}d`;
  return `${sec}d`;
}

export function yyyymmdd(ms = Date.now()): string {
  return format(ms, 'yyyyMMdd');
}

export function formatNumber(n?: number): string {
  if (n === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(n);
}
