import type { Scene, Variant } from '@/types';
import type { ExportBundle } from './bundle';
import { scenePrompt } from '@/domain/promptText';
import { assetsText } from '@/domain/assets';

export function scenePromptTxt(scene: Scene, index: number, variant: Variant = 'standard'): string {
  const head = `=== SCENE ${index + 1}: ${scene.title} (${scene.durationSec}s) ===`;
  const prompt = scenePrompt(scene, variant).trim();
  const neg = scene.negativePrompt.trim();
  const frames = [
    scene.framePrompts?.start ? `\n[FRAME AWAL]\n${scene.framePrompts.start}` : '',
    scene.framePrompts?.end ? `\n[FRAME AKHIR]\n${scene.framePrompts.end}` : '',
  ].filter(Boolean);
  return [head, prompt, '', neg ? `Avoid: ${neg}` : '', ...frames].join('\n').trimEnd();
}

/** Semua prompt berurutan: aset (karakter → tempat → produk) lalu scene (story). */
export function promptsTxt(bundle: ExportBundle, variant: Variant = 'standard'): string {
  const head = bundle.assets ? [assetsText(bundle.assets)] : [];
  return [...head, ...bundle.scenes.map((s, i) => scenePromptTxt(s, i, variant))].join('\n\n') + '\n';
}

export function voTxt(bundle: ExportBundle): string {
  return (
    bundle.scenes
      .filter((s) => s.voiceOver.trim())
      .map((s) => `${s.order + 1}. ${s.voiceOver.trim()}`)
      .join('\n\n') + '\n'
  );
}
