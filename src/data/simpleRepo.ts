import { SimpleVideoSchema } from '@/schemas/simple.schema';
import type { SimpleVideo } from '@/types';
import { parseStored } from './converters';
import { getBackend, paths } from './index';

/** Mode Simpel (v1.7): riwayat hasil Ide → Video. */
export async function listSimpleVideos(uid: string, limit = 30): Promise<SimpleVideo[]> {
  const res = await getBackend().list(paths.simpleVideos(uid), { orderByUpdated: true, limit });
  return res.items.flatMap(({ id, data }) => {
    const p = parseStored(SimpleVideoSchema, { ...data, id });
    return p.ok ? [p.value] : [];
  });
}

export async function getSimpleVideo(uid: string, id: string): Promise<SimpleVideo | null> {
  const data = await getBackend().get(paths.simpleVideo(uid, id));
  if (!data) return null;
  const p = parseStored(SimpleVideoSchema, { ...data, id });
  return p.ok ? p.value : null;
}

export async function saveSimpleVideo(uid: string, video: SimpleVideo): Promise<SimpleVideo> {
  const v = SimpleVideoSchema.parse({ ...video, updatedAt: Date.now() });
  await getBackend().set(paths.simpleVideo(uid, v.id), v);
  return v;
}

export async function deleteSimpleVideo(uid: string, id: string): Promise<void> {
  await getBackend().delete(paths.simpleVideo(uid, id));
}
