import { CloudKeysDocSchema } from '@/schemas/key.schema';
import type { z } from 'zod';
import { parseStored } from './converters';
import { getBackend, paths } from './index';

export type CloudKeysDoc = z.infer<typeof CloudKeysDocSchema>;
export type CloudKeyItem = CloudKeysDoc['items'][number];

/**
 * Key yang disinkronkan ke akun (mode vault 'cloud'). Satu-satunya kode yang membaca/menulis dokumen ini.
 * Dokumen TIDAK pernah ikut ekspor project (exporter hanya menerima bundle project).
 */
export async function loadCloudKeys(uid: string): Promise<CloudKeysDoc | null> {
  const raw = await getBackend().get(paths.aiKeys(uid));
  if (!raw) return null;
  const p = parseStored(CloudKeysDocSchema, raw);
  return p.ok ? p.value : { items: [], updatedAt: 0 };
}

export async function saveCloudKeys(uid: string, items: CloudKeyItem[]): Promise<void> {
  await getBackend().set(paths.aiKeys(uid), { items, updatedAt: Date.now() });
}

export async function deleteCloudKeys(uid: string): Promise<void> {
  await getBackend().delete(paths.aiKeys(uid));
}
