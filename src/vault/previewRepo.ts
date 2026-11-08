import { MAX_REF_IMAGE_BYTES } from '@/config/constants';
import { newShortId } from '@/lib/ids';
import { getDb } from './db';

/** Simpan gambar referensi lokal sebagai pratinjau. Tidak pernah diunggah. */
export async function savePreview(file: File): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!file.type.startsWith('image/')) return { ok: false, message: 'Hanya file gambar yang diperbolehkan.' };
  if (file.size > MAX_REF_IMAGE_BYTES) return { ok: false, message: 'Ukuran gambar maksimal 3 MB.' };
  const id = `prev_${newShortId()}`;
  await (await getDb()).put('previews', {
    id,
    blob: file,
    mime: file.type,
    name: file.name,
    size: file.size,
    createdAt: Date.now(),
  });
  return { ok: true, id };
}

export async function getPreviewUrl(id: string): Promise<string | null> {
  const rec = await (await getDb()).get('previews', id);
  return rec ? URL.createObjectURL(rec.blob) : null;
}

export async function deletePreview(id: string): Promise<void> {
  await (await getDb()).delete('previews', id);
}
