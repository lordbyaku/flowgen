/** Pilih elemen berikutnya setelah kursor; kursor tidak ditemukan (-1) menghasilkan elemen pertama. */
export function nextAfterCursor<T extends { id: string }>(items: T[], cursor?: string): T | null {
  if (items.length === 0) return null;
  const i = items.findIndex((k) => k.id === cursor);
  return items[(i + 1) % items.length];
}
