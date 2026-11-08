import type { PromptSnippet } from '@/types';

export const SNIPPET_CATEGORY_LABEL: Record<PromptSnippet['category'], string> = {
  camera: 'Kamera',
  lighting: 'Cahaya',
  style: 'Gaya',
  environment: 'Lingkungan',
  product: 'Produk',
  negative: 'Negatif',
  other: 'Lainnya',
};
