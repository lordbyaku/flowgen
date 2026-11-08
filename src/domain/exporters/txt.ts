import type { Scene, Variant } from '@/types';
import type { ExportBundle } from './bundle';
import { scenePrompt } from '@/domain/promptText';

export function scenePromptTxt(scene: Scene, index: number, variant: Variant = 'standard'): string {
  const head = `=== SCENE ${index + 1}: ${scene.title} (${scene.durationSec}s) ===`;
  const prompt = scenePrompt(scene, variant).trim();
  const neg = scene.negativePrompt.trim();
  return [head, prompt, '', neg ? `Avoid: ${neg}` : ''].join('\n').trimEnd();
}

export function promptsTxt(bundle: ExportBundle, variant: Variant = 'standard'): string {
  return bundle.scenes.map((s, i) => scenePromptTxt(s, i, variant)).join('\n\n') + '\n';
}

export function voTxt(bundle: ExportBundle): string {
  return (
    bundle.scenes
      .filter((s) => s.voiceOver.trim())
      .map((s) => `${s.order + 1}. ${s.voiceOver.trim()}`)
      .join('\n\n') + '\n'
  );
}
