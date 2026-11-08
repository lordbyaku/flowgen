import { BRIEF_PRESETS, createCharacter, createEmptyBrief } from '@/config/presets';
import { deepMerge } from '@/lib/utils';
import type { BiblesDoc, Brief, LocalKey, Scene, VaultMeta } from '@/types';

/** Brief lengkap (semua field W terisi) berbasis preset SaaS. */
export function makeBrief(patch: unknown = {}): Brief {
  const preset = BRIEF_PRESETS.find((p) => p.id === 'saas_umkm')!;
  const base = deepMerge(createEmptyBrief(), preset.values);
  base.project.brandId = 'brand_1';
  base.characters.list = [
    createCharacter({
      id: 'c1',
      nickname: 'Bu Sari',
      role: 'Pemilik warung',
      genderPresentation: 'Perempuan',
      approxAge: 'Sekitar 38 tahun',
      clothing: 'Kemeja batik biru tua, celemek hijau',
    }),
  ];
  return deepMerge(base, patch);
}

export const MASTER =
  'Bu Sari, a warm Indonesian woman in her late thirties with medium tan skin, an oval face, wearing a cream square hijab, a dark blue short-sleeve batik shirt and a green apron, silver wristwatch, friendly confident smile.';
export const PRODUCT =
  'An Android smartphone displaying the green and white Warungku-POS cashier app interface with a shopping basket icon logo at the top left header.';

export function makeBibles(): BiblesDoc {
  return {
    characters: [
      {
        id: 'char_1',
        name: 'Bu Sari',
        genderPresentation: 'female',
        approxAge: '38',
        appearance: 'oval face',
        hair: 'cream hijab',
        clothing: 'blue batik shirt',
        accessories: 'watch',
        personality: 'friendly',
        referenceImages: [],
        restrictions: '',
        masterDescriptionEn: MASTER,
      },
    ],
    visual: {
      artDirection: 'Bright natural warung',
      palette: ['#16a34a'],
      lightingStyle: 'window light',
      cinematography: 'handheld close-ups',
      environmentDesign: 'busy warung',
      lensPreference: '35mm',
      cameraMovementStyle: 'gentle handheld',
      productAppearanceEn: PRODUCT,
      restrictions: '',
      styleLineEn: 'Photorealistic UGC style with warm natural tones.',
    },
    updatedAt: 0,
  };
}

/** Prompt yang lolos semua aturan linter. */
export const GOOD_PROMPT = `${MASTER} She taps the screen to record a sale. Setting: a busy Indonesian warung with stocked shelves in the morning. Medium close-up, eye-level shot, gentle push-in. Soft window light, cheerful mood. Visual style: Photorealistic UGC style with warm natural tones. Product: ${PRODUCT} Continuity: same cream hijab, dark blue batik shirt, green apron, green and white app interface. Aspect ratio 9:16.`;

export function makeScene(patch: Partial<Scene> = {}): Scene {
  return {
    id: 's1',
    order: 0,
    title: 'Hook',
    durationSec: 5,
    purpose: 'hook',
    visualDescription: '',
    characterIds: ['char_1'],
    characterAction: '',
    environment: '',
    shot: '',
    cameraMovement: '',
    lighting: '',
    transition: 'cut',
    voiceOver: 'Masih catat jualan di buku?',
    dialogue: '',
    sfxAmbient: '',
    textOverlay: '',
    flowPrompts: { standard: GOOD_PROMPT },
    negativePrompt: 'on-screen text, watermark',
    approved: false,
    tracker: 'prompt_ready',
    versions: [],
    updatedAt: 0,
    ...patch,
  };
}

export function makeKey(patch: Partial<LocalKey> = {}): LocalKey {
  return {
    id: 'k1',
    label: 'Key 1',
    projectId: 'projA',
    model: 'gemini-test',
    enabled: true,
    status: 'connected',
    priority: 0,
    cipher: { iv: '', data: '' },
    last4: 'abcd',
    consecutiveErrors: 0,
    createdAt: 1,
    ...patch,
  };
}

export function makeMeta(patch: Partial<VaultMeta> = {}): VaultMeta {
  return {
    version: 1,
    salt: '',
    iterations: 0,
    verifier: { iv: '', data: '' },
    mode: 'session',
    routing: 'round_robin',
    projectCooldowns: {},
    ...patch,
  };
}
