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

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Perkecil gambar ke sisi terpanjang `maxDim` (JPEG) bila browser mendukung; jika tidak, kirim apa adanya. */
async function downscale(blob: Blob, maxDim: number): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return blob;
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (scale === 1 && blob.size < 1_000_000) return blob;
    const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  } catch {
    return blob;
  }
}

/** Gambar lokal untuk dikirim ke AI (base64, sudah diperkecil). */
export async function getPreviewForAI(id: string, maxDim: number): Promise<{ mimeType: string; data: string } | null> {
  const rec = await (await getDb()).get('previews', id);
  if (!rec) return null;
  const blob = await downscale(rec.blob, maxDim);
  return { mimeType: blob.type || rec.mime, data: await blobToBase64(blob) };
}

export async function deletePreview(id: string): Promise<void> {
  await (await getDb()).delete('previews', id);
}
