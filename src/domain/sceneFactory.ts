import { newShortId } from '@/lib/ids';
import type { Scene } from '@/types';

export function createBlankScene(order: number, durationSec = 4): Scene {
  return {
    id: `scene_${newShortId()}`,
    order,
    title: `Scene ${order + 1}`,
    durationSec,
    purpose: '',
    visualDescription: '',
    characterIds: [],
    characterAction: '',
    environment: '',
    shot: '',
    cameraMovement: '',
    lighting: '',
    transition: 'cut',
    voiceOver: '',
    dialogue: '',
    sfxAmbient: '',
    textOverlay: '',
    flowPrompts: { standard: '' },
    negativePrompt: '',
    approved: false,
    tracker: 'prompt_ready',
    versions: [],
    updatedAt: Date.now(),
  };
}

export function duplicateScene(s: Scene): Scene {
  return { ...structuredClone(s), id: `scene_${newShortId()}`, title: `${s.title} (salinan)`, approved: false, versions: [], updatedAt: Date.now() };
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length || from === to) return arr;
  const out = [...arr];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}
