import { SCENES_DOC_SOFT_LIMIT_BYTES } from '@/config/constants';
import type { Scene, ScenesDoc } from '@/types';
import { jsonSize } from './converters';

/**
 * Sebelum menulis docs/scenes: jika > 800 KB, pangkas versions tertua sampai muat.
 * Mengembalikan dokumen (mungkin dipangkas) dan flag peringatan.
 */
export function fitScenesDoc(doc: ScenesDoc, limit = SCENES_DOC_SOFT_LIMIT_BYTES): { doc: ScenesDoc; trimmed: boolean } {
  let items: Scene[] = doc.items;
  let trimmed = false;
  let guard = 100;
  while (jsonSize({ ...doc, items }) > limit && guard-- > 0) {
    const maxVersions = Math.max(...items.map((s) => s.versions.length));
    if (maxVersions === 0) break;
    items = items.map((s) => (s.versions.length >= maxVersions ? { ...s, versions: s.versions.slice(0, -1) } : s));
    trimmed = true;
  }
  return { doc: { ...doc, items }, trimmed };
}
