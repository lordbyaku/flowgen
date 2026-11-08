import { MAX_AI_IMAGES } from '@/config/constants';
import type { AIImage } from '@/ai/providers/aiProvider';
import type { Brief, ReferenceImage } from '@/types';

export type ImageLoader = (localId: string) => Promise<{ mimeType: string; data: string } | null>;

interface Candidate {
  label: string;
  img: ReferenceImage;
}

/** Daftar gambar lokal yang akan dikirim (produk dulu, lalu karakter secara bergiliran), maks MAX_AI_IMAGES. */
export function referenceCandidates(brief: Brief, max = MAX_AI_IMAGES): Candidate[] {
  if (brief.output.sendReferenceImages === false) return [];
  const local = (imgs: ReferenceImage[]) => imgs.filter((i) => i.kind === 'local' && i.localId);
  const product = local(brief.product.referenceImages).map((img) => ({
    img,
    label: `Reference image — PRODUCT "${brief.product.name}"${img.note ? ` (note: ${img.note})` : ''}. Describe its exact shape, colors, material, packaging and logo placement.`,
  }));
  const people = brief.characters.mode === 'single' || brief.characters.mode === 'multiple';
  const chars = people
    ? brief.characters.list.map((c, i) =>
        local(c.referenceImages).map((img) => ({
          img,
          label: `Reference image — CHARACTER char_${i + 1} "${c.nickname || `Character ${i + 1}`}"${img.note ? ` (note: ${img.note})` : ''}. Use it for face, hair/hijab, build and clothing in masterDescriptionEn.`,
        })),
      )
    : [];
  // Ambil bergiliran agar setiap karakter kebagian sebelum kuota habis.
  const out: Candidate[] = [];
  const queues = [product, ...chars];
  while (out.length < max && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && out.length < max) out.push(next);
    }
  }
  return out;
}

export async function loadReferenceImages(brief: Brief, loader: ImageLoader): Promise<AIImage[]> {
  const out: AIImage[] = [];
  for (const c of referenceCandidates(brief)) {
    const data = await loader(c.img.localId!).catch(() => null);
    if (data) out.push({ label: c.label, ...data });
  }
  return out;
}
