import type { Scene, Variant } from '@/types';
import { avoidLineOn, copyAllText, copyText } from '@/domain/promptText';
import type { ExportBundle } from './bundle';
import { capcutText } from './capcutGuide';
import { toMarkdown } from './markdown';

export type ClipboardKind = 'scene' | 'allPrompts' | 'storyboard' | 'script' | 'capcut';

export function clipboardText(
  bundle: ExportBundle,
  kind: ClipboardKind,
  opts: { scene?: Scene; variant?: Variant } = {},
): string {
  const variant = opts.variant ?? 'standard';
  const avoid = avoidLineOn(bundle.brief);
  switch (kind) {
    case 'scene':
      return opts.scene ? copyText(opts.scene, variant, avoid) : '';
    case 'allPrompts':
      return copyAllText(bundle.scenes, variant, avoid);
    case 'storyboard':
      return toMarkdown(bundle, ['storyboard']);
    case 'script':
      return toMarkdown(bundle, ['script']);
    case 'capcut':
      return bundle.capcut ? capcutText(bundle.capcut, bundle.scenes) : '';
  }
}

/** Tulis ke clipboard browser; kembalikan false bila gagal. */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
