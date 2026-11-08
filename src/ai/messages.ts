import { formatTime } from '@/lib/format';
import type { AppErrorCode } from '@/types';

/** Microcopy Indonesia (26.9). Tidak pernah memuat key. */
export const MSG = {
  noKeys: 'Belum ada API key. Tambahkan di menu AI Provider agar fitur AI bisa dipakai.',
  vaultLocked: 'Vault terkunci. Masukkan passphrase untuk melanjutkan.',
  allCooldown: (t: number) => `Semua key sedang dalam jeda. Coba lagi pada ${formatTime(t)}.`,
  noActive: 'Tidak ada key aktif yang siap dipakai. Aktifkan atau tes ulang key di menu AI Provider.',
  rateLimited: (label: string, t: number) =>
    `Batas permintaan tercapai pada project ${label}. Jeda sampai ${formatTime(t)}. Output sebelumnya tetap aman.`,
  quotaDaily: (label: string) =>
    `Kuota harian project ${label} tampaknya habis. Coba lagi besok atau gunakan project lain milik Anda.`,
  invalidJson: 'AI mengembalikan format yang tidak valid. Output sebelumnya dipertahankan. Lihat output mentah atau coba lagi.',
  blocked: 'Permintaan diblokir oleh filter keamanan. Ubah deskripsi produk atau larangan di brief.',
  truncated: 'Hasil terpotong karena terlalu panjang. Coba kurangi jumlah scene atau buat per batch.',
  saveFailed: 'Perubahan belum tersimpan. Perubahan Anda aman di layar ini. Coba lagi.',
  offline: 'Anda sedang offline. Perubahan akan disinkronkan saat tersambung.',
  validation: 'Permintaan ditolak (400). Periksa model atau isi brief, lalu coba lagi.',
  auth: 'Key tidak valid atau tidak berizin. Key ditandai error dan dilewati sampai dites ulang.',
  modelNotFound: 'Model tidak tersedia untuk key ini. Pilih model lain di menu AI Provider.',
  server: 'Server Gemini sedang bermasalah. Sudah dicoba ulang terbatas; coba lagi nanti.',
  network: 'Gagal terhubung ke Gemini. Periksa koneksi internet Anda.',
  aborted: 'Permintaan dibatalkan.',
  briefIncomplete: 'Brief belum lengkap. Isi semua field wajib (W) terlebih dahulu.',
  unknown: 'Terjadi kesalahan tak terduga. Output sebelumnya tetap aman.',
} as const;

export function messageFor(code: AppErrorCode): string {
  switch (code) {
    case 'validation':
      return MSG.validation;
    case 'auth':
      return MSG.auth;
    case 'model_not_found':
      return MSG.modelNotFound;
    case 'server':
      return MSG.server;
    case 'network':
      return MSG.network;
    case 'blocked':
      return MSG.blocked;
    case 'truncated':
      return MSG.truncated;
    case 'invalid_json':
      return MSG.invalidJson;
    case 'aborted':
      return MSG.aborted;
    case 'vault_locked':
      return MSG.vaultLocked;
    case 'brief_incomplete':
      return MSG.briefIncomplete;
    default:
      return MSG.unknown;
  }
}
