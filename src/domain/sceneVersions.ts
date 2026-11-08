import { MAX_SCENE_VERSIONS } from '@/config/constants';
import { newShortId } from '@/lib/ids';
import { SceneSchema } from '@/schemas/scene.schema';
import type { Scene, SceneVersion } from '@/types';

/** Simpan state scene saat ini sebagai versi baru di depan (maks 5). */
export function pushVersion(scene: Scene, reason: SceneVersion['reason'], now: number): Scene {
  const { versions: _v, ...snapshot } = scene;
  const version: SceneVersion = { id: `v_${newShortId()}`, prompt: scene.flowPrompts.standard, snapshot, createdAt: now, reason };
  return { ...scene, versions: [version, ...scene.versions].slice(0, MAX_SCENE_VERSIONS) };
}

/** Pulihkan versi: snapshot lengkap bila valid, selain itu hanya prompt Standard. id/order/tracker tetap. */
export function restoreVersion(scene: Scene, version: SceneVersion, now: number): Scene {
  let restored: Scene = { ...scene, flowPrompts: { ...scene.flowPrompts, standard: version.prompt } };
  if (version.snapshot) {
    const parsed = SceneSchema.omit({ versions: true }).safeParse(version.snapshot);
    if (parsed.success) {
      restored = { ...parsed.data, id: scene.id, order: scene.order, tracker: scene.tracker, trackerNote: scene.trackerNote, versions: scene.versions };
    }
  }
  return pushVersion({ ...restored, approved: false, updatedAt: now }, 'edited', now);
}
