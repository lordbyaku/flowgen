import type { Brief, CharacterInput } from '@/types';
import { nanoid } from 'nanoid';

export type FieldLevel = 'W' | 'P' | 'O';

export interface FieldSpec {
  /** Path titik di dalam Brief, mis. `product.benefits`. */
  path: string;
  level: FieldLevel;
  label: string;
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** Hanya dihitung jika berlaku untuk brief ini. */
  applies?: (b: Brief) => boolean;
  /** Override cek "terisi" (default: string non-kosong / array non-kosong / angka). */
  filled?: (b: Brief) => boolean;
}

export const LEVEL_WEIGHT: Record<FieldLevel, number> = { W: 3, P: 2, O: 1 };

const isSoftware = (b: Brief) => b.product.type === 'software';
const hasPeople = (b: Brief) => b.characters.mode === 'single' || b.characters.mode === 'multiple';

/** Peta field Brief -> level (W/P/O). Dipakai skor kelengkapan, validasi, dan serializer [MISSING]. */
export const BRIEF_FIELDS: FieldSpec[] = [
  // Langkah 1
  { path: 'project.name', level: 'W', label: 'Nama project', step: 1 },
  { path: 'project.brandId', level: 'W', label: 'Brand', step: 1 },
  { path: 'project.objective', level: 'W', label: 'Tujuan video', step: 1 },
  { path: 'project.platforms', level: 'W', label: 'Platform tujuan', step: 1 },
  { path: 'project.aspectRatio', level: 'W', label: 'Aspect ratio', step: 1 },
  { path: 'project.durationSec', level: 'W', label: 'Durasi total', step: 1 },
  {
    path: 'project.sceneCount',
    level: 'O',
    label: 'Jumlah scene',
    step: 1,
    applies: (b) => b.project.sceneCountMode === 'manual',
  },
  { path: 'project.scriptLanguage', level: 'W', label: 'Bahasa naskah dan VO', step: 1 },
  {
    path: 'project.regionalNote',
    level: 'P',
    label: 'Bahasa daerah',
    step: 1,
    applies: (b) => b.project.scriptLanguage === 'regional',
  },
  // Langkah 2
  { path: 'product.name', level: 'W', label: 'Nama produk', step: 2 },
  { path: 'product.type', level: 'W', label: 'Jenis produk', step: 2 },
  { path: 'product.category', level: 'W', label: 'Kategori', step: 2 },
  { path: 'product.description', level: 'W', label: 'Deskripsi singkat', step: 2 },
  { path: 'product.benefits', level: 'W', label: 'Manfaat utama', step: 2 },
  { path: 'product.usps', level: 'P', label: 'Unique Selling Point', step: 2 },
  { path: 'product.priceAndPromo', level: 'O', label: 'Harga dan promo', step: 2 },
  { path: 'product.proof', level: 'P', label: 'Bukti dan angka', step: 2 },
  { path: 'product.allowedClaims', level: 'P', label: 'Klaim yang boleh dipakai', step: 2 },
  { path: 'product.forbiddenClaims', level: 'P', label: 'Klaim yang dilarang', step: 2 },
  { path: 'product.usageSteps', level: 'P', label: 'Cara pakai / alur demo', step: 2 },
  { path: 'product.shapeSize', level: 'P', label: 'Bentuk dan ukuran', step: 2 },
  { path: 'product.dominantColors', level: 'P', label: 'Warna dominan produk', step: 2 },
  { path: 'product.materialTexture', level: 'O', label: 'Material dan tekstur', step: 2 },
  { path: 'product.packaging', level: 'O', label: 'Kemasan', step: 2 },
  { path: 'product.logoPlacement', level: 'P', label: 'Logo dan posisinya', step: 2 },
  { path: 'product.textOnProduct', level: 'O', label: 'Teks pada produk', step: 2 },
  {
    path: 'product.softwareScreens',
    level: 'P',
    label: 'Layar software yang ditampilkan',
    step: 2,
    applies: isSoftware,
  },
  { path: 'product.referenceImages', level: 'P', label: 'Gambar referensi produk', step: 2 },
  // Langkah 3
  { path: 'audience.ageRange', level: 'W', label: 'Rentang usia', step: 3 },
  { path: 'audience.gender', level: 'O', label: 'Gender sasaran', step: 3 },
  { path: 'audience.location', level: 'O', label: 'Lokasi audiens', step: 3 },
  { path: 'audience.segment', level: 'W', label: 'Segmen/profesi', step: 3 },
  { path: 'audience.painPoint', level: 'W', label: 'Masalah utama audiens', step: 3 },
  { path: 'audience.desire', level: 'P', label: 'Keinginan audiens', step: 3 },
  { path: 'audience.objection', level: 'P', label: 'Keberatan utama', step: 3 },
  { path: 'audience.awareness', level: 'P', label: 'Tingkat kesadaran', step: 3 },
  { path: 'audience.speechStyle', level: 'O', label: 'Gaya bicara audiens', step: 3 },
  { path: 'audience.keyMessage', level: 'W', label: 'Pesan utama', step: 3 },
  { path: 'audience.cta', level: 'W', label: 'Call to action', step: 3 },
  { path: 'audience.offerDeadline', level: 'O', label: 'Penawaran dan batas waktu', step: 3 },
  { path: 'audience.competitorDiff', level: 'O', label: 'Kompetitor dan pembeda', step: 3 },
  // Langkah 4
  {
    path: 'strategy.angles',
    level: 'W',
    label: 'Angle kampanye',
    step: 4,
    filled: (b) => b.strategy.angles.length > 0 || b.strategy.aiPicksAngle,
  },
  { path: 'strategy.hookStyles', level: 'P', label: 'Gaya hook', step: 4 },
  { path: 'strategy.conceptAlternatives', level: 'O', label: 'Jumlah alternatif konsep', step: 4 },
  {
    path: 'strategy.referenceAds',
    level: 'O',
    label: 'Iklan referensi',
    step: 4,
    filled: (b) => b.strategy.referenceAds.some((r) => r.url.trim() !== ''),
  },
  { path: 'strategy.mustInclude', level: 'P', label: 'Wajib ada', step: 4 },
  { path: 'strategy.mustAvoid', level: 'P', label: 'Wajib dihindari', step: 4 },
  // Langkah 5
  { path: 'visual.realism', level: 'W', label: 'Tingkat realisme', step: 5 },
  { path: 'visual.style', level: 'W', label: 'Gaya kreatif', step: 5 },
  { path: 'visual.tone', level: 'W', label: 'Tone', step: 5 },
  { path: 'visual.pacing', level: 'P', label: 'Pacing', step: 5 },
  { path: 'visual.palette', level: 'P', label: 'Palet warna', step: 5 },
  { path: 'visual.grading', level: 'O', label: 'Color grading', step: 5 },
  { path: 'visual.cameraStyles', level: 'P', label: 'Gaya kamera', step: 5 },
  { path: 'visual.lens', level: 'O', label: 'Lensa', step: 5 },
  { path: 'visual.depthOfField', level: 'O', label: 'Depth of field', step: 5 },
  { path: 'visual.lighting', level: 'P', label: 'Pencahayaan', step: 5 },
  { path: 'visual.dominantShots', level: 'O', label: 'Shot dominan', step: 5 },
  { path: 'visual.transitions', level: 'O', label: 'Transisi', step: 5 },
  { path: 'visual.referenceVideoUrl', level: 'O', label: 'Video referensi', step: 5 },
  // Langkah 6 — field per karakter ditambahkan dinamis (lihat characterFieldSpecs)
  {
    path: 'characters.list',
    level: 'W',
    label: 'Data karakter',
    step: 6,
    applies: hasPeople,
  },
  // Langkah 7
  { path: 'location.main', level: 'W', label: 'Lokasi utama', step: 7 },
  { path: 'location.indoorOutdoor', level: 'P', label: 'Indoor/Outdoor', step: 7 },
  { path: 'location.timeOfDay', level: 'P', label: 'Waktu', step: 7 },
  { path: 'location.weather', level: 'O', label: 'Cuaca', step: 7 },
  { path: 'location.condition', level: 'O', label: 'Kondisi tempat', step: 7 },
  { path: 'location.extras', level: 'O', label: 'Jumlah figuran', step: 7 },
  { path: 'location.requiredProps', level: 'P', label: 'Props wajib', step: 7 },
  { path: 'location.perSceneNotes', level: 'O', label: 'Lokasi khusus per scene', step: 7 },
  { path: 'location.localFlavor', level: 'P', label: 'Nuansa lokal', step: 7 },
  // Langkah 8
  { path: 'audio.voStyle', level: 'P', label: 'Gaya VO', step: 8, applies: (b) => b.audio.voiceOver },
  { path: 'audio.musicMood', level: 'O', label: 'Mood musik', step: 8 },
  { path: 'audio.sfx', level: 'O', label: 'SFX', step: 8 },
  { path: 'audio.ambient', level: 'O', label: 'Ambient', step: 8 },
  { path: 'audio.textStyle', level: 'P', label: 'Gaya teks overlay', step: 8, applies: (b) => b.audio.textOverlay },
  { path: 'audio.onScreenCta', level: 'O', label: 'CTA on-screen', step: 8, applies: (b) => b.audio.textOverlay },
  { path: 'audio.outroSec', level: 'O', label: 'Durasi outro logo', step: 8, applies: (b) => b.audio.outroLogo },
  { path: 'output.globalNegatives', level: 'P', label: 'Larangan visual global', step: 8 },
  { path: 'output.variants', level: 'O', label: 'Varian prompt', step: 8 },
  { path: 'output.promptLength', level: 'O', label: 'Panjang prompt', step: 8 },
  { path: 'output.flowMode', level: 'P', label: 'Mode di Google Flow', step: 8 },
];

const CHARACTER_FIELDS: { key: keyof CharacterInput; level: FieldLevel; label: string }[] = [
  { key: 'nickname', level: 'W', label: 'Nama panggilan' },
  { key: 'role', level: 'W', label: 'Peran' },
  { key: 'genderPresentation', level: 'W', label: 'Gender presentation' },
  { key: 'approxAge', level: 'W', label: 'Perkiraan usia' },
  { key: 'ethnicLook', level: 'P', label: 'Penampilan etnis' },
  { key: 'skinTone', level: 'P', label: 'Warna kulit' },
  { key: 'faceShape', level: 'P', label: 'Bentuk wajah' },
  { key: 'hair', level: 'P', label: 'Rambut / hijab' },
  { key: 'build', level: 'O', label: 'Postur tubuh' },
  { key: 'clothing', level: 'W', label: 'Pakaian' },
  { key: 'accessories', level: 'O', label: 'Aksesori' },
  { key: 'expression', level: 'P', label: 'Ekspresi dan kepribadian' },
  { key: 'relationToProduct', level: 'P', label: 'Hubungan dengan produk' },
  { key: 'referenceImages', level: 'P', label: 'Gambar referensi karakter' },
  { key: 'restrictions', level: 'O', label: 'Larangan visual karakter' },
];

/** Field karakter untuk setiap karakter di brief (hanya bila mode memakai orang). */
export function characterFieldSpecs(b: Brief): FieldSpec[] {
  if (!hasPeople(b)) return [];
  return b.characters.list.flatMap((c, i) =>
    CHARACTER_FIELDS.map((f) => ({
      path: `characters.list.${i}.${f.key}`,
      level: f.level,
      label: `${f.label} (${c.nickname || `Karakter ${i + 1}`})`,
      step: 6 as const,
    })),
  );
}

export function createCharacter(partial: Partial<CharacterInput> = {}): CharacterInput {
  return {
    id: nanoid(8),
    nickname: '',
    role: '',
    genderPresentation: '',
    approxAge: '',
    ethnicLook: 'typical Indonesian',
    clothing: '',
    referenceImages: [],
    ...partial,
  };
}

export function createEmptyBrief(): Brief {
  return {
    schemaVersion: 1,
    project: {
      name: '',
      brandId: '',
      platforms: [],
      aspectRatio: '9:16',
      durationSec: 30,
      sceneCountMode: 'auto',
      scriptLanguage: 'id_casual',
    },
    product: {
      name: '',
      type: 'physical',
      category: '',
      description: '',
      benefits: [],
      usps: [],
      allowedClaims: [],
      forbiddenClaims: [],
      usageSteps: [],
      dominantColors: [],
      referenceImages: [],
      mustBeVisible: true,
      wantCloseUp: true,
    },
    audience: {
      ageRange: '',
      gender: 'all',
      segment: '',
      painPoint: '',
      keyMessage: '',
      cta: '',
    },
    strategy: {
      angles: [],
      aiPicksAngle: false,
      hookStyles: [],
      conceptAlternatives: 3,
      referenceAds: [],
      mustInclude: [],
      mustAvoid: [],
    },
    visual: {
      palette: [],
      cameraStyles: [],
      lighting: [],
      dominantShots: [],
      transitions: [],
    },
    characters: { mode: 'single', list: [createCharacter()] },
    location: { main: '', requiredProps: [] },
    audio: { voiceOver: true, characterDialogue: false, textOverlay: true, outroLogo: true, outroSec: 2 },
    output: {
      globalNegatives: ['distorted text', 'wrong logo', 'deformed hands', 'watermark'],
      variants: ['standard'],
      promptLength: 'detailed',
      flowMode: 'text_to_video',
      characterRef: 'flow_assets',
      sendReferenceImages: true,
    },
  };
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface BriefPreset {
  id: string;
  name: string;
  description: string;
  phase: 1 | 2;
  values: DeepPartial<Brief>;
}

export const BRIEF_PRESETS: BriefPreset[] = [
  {
    id: 'warung_kuliner',
    name: 'Warung / Kuliner',
    description: 'Makanan & minuman, nuansa warung atau kedai lokal yang hangat.',
    phase: 1,
    values: {
      project: { objective: 'direct_sales', platforms: ['tiktok', 'reels'], aspectRatio: '9:16', durationSec: 15 },
      product: { type: 'food_beverage', category: 'Kuliner', mustBeVisible: true, wantCloseUp: true },
      audience: { ageRange: '18-34', gender: 'all', speechStyle: 'casual' },
      strategy: { angles: ['problem_solution'], hookStyles: ['shocking_visual', 'relatable_problem'] },
      visual: {
        realism: 'photoreal',
        style: 'realistic_ugc',
        tone: 'energetic',
        pacing: 'fast',
        grading: 'warm',
        cameraStyles: ['handheld', 'macro'],
        lighting: ['window_natural'],
        dominantShots: ['close_up', 'overhead'],
        transitions: ['cut', 'whip_pan'],
      },
      location: {
        main: 'Warung',
        indoorOutdoor: 'indoor',
        timeOfDay: 'noon',
        condition: 'Ramai',
        localFlavor: 'Meja kayu, etalase kaca, papan menu tulisan tangan khas warung Indonesia',
      },
      audio: { voStyle: 'energetic', musicMood: 'Upbeat, ceria', sfx: 'Suara sendok, sizzle penggorengan' },
    },
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Pakaian & aksesori dengan look premium dan pacing dinamis.',
    phase: 1,
    values: {
      project: { objective: 'awareness', platforms: ['reels', 'tiktok', 'ig_feed'], aspectRatio: '9:16', durationSec: 20 },
      product: { type: 'physical', category: 'Fashion', mustBeVisible: true, wantCloseUp: true },
      audience: { ageRange: '18-24', gender: 'female', speechStyle: 'casual' },
      strategy: { angles: ['before_after'], hookStyles: ['pattern_interrupt'] },
      visual: {
        realism: 'photoreal',
        style: 'premium_ad',
        tone: 'premium',
        pacing: 'medium',
        grading: 'pastel',
        cameraStyles: ['gimbal'],
        lens: '85mm',
        depthOfField: 'shallow',
        lighting: ['golden_hour', 'studio_softbox'],
        dominantShots: ['medium', 'close_up'],
        transitions: ['match_cut', 'whip_pan'],
      },
      location: { main: 'Studio', indoorOutdoor: 'both', timeOfDay: 'afternoon' },
      audio: { voStyle: 'warm', musicMood: 'Chic, modern' },
    },
  },
  {
    id: 'jasa_lokal',
    name: 'Jasa Lokal',
    description: 'Bengkel, laundry, salon, servis — menonjolkan kepercayaan dan hasil.',
    phase: 1,
    values: {
      project: { objective: 'lead', platforms: ['facebook', 'wa_status', 'reels'], aspectRatio: '9:16', durationSec: 30 },
      product: { type: 'service', category: 'Jasa', mustBeVisible: false, wantCloseUp: false },
      audience: { ageRange: '25-45', gender: 'all', speechStyle: 'casual', awareness: 'problem_aware' },
      strategy: { angles: ['problem_solution', 'testimonial_ugc'], hookStyles: ['relatable_problem'] },
      visual: {
        realism: 'photoreal',
        style: 'realistic_ugc',
        tone: 'professional',
        pacing: 'medium',
        grading: 'natural',
        cameraStyles: ['gimbal', 'handheld'],
        lighting: ['window_natural'],
        dominantShots: ['medium', 'wide'],
        transitions: ['cut'],
      },
      location: { main: 'Toko', indoorOutdoor: 'indoor', timeOfDay: 'morning' },
      audio: { voStyle: 'friendly', musicMood: 'Hangat, meyakinkan' },
    },
  },
  {
    id: 'saas_umkm',
    name: 'Software/SaaS UMKM',
    description: 'Contoh Warungku-POS: aplikasi kasir untuk warung dan toko kecil.',
    phase: 1,
    values: {
      project: {
        name: 'Warungku-POS — Kasir Praktis',
        objective: 'direct_sales',
        platforms: ['tiktok', 'reels', 'shorts'],
        aspectRatio: '9:16',
        durationSec: 30,
        scriptLanguage: 'id_casual',
      },
      product: {
        name: 'Warungku-POS',
        type: 'software',
        category: 'Aplikasi kasir (POS)',
        description:
          'Aplikasi kasir di HP untuk warung dan toko kecil. Catat penjualan, stok, dan laporan harian otomatis tanpa ribet.',
        benefits: ['Catat penjualan dalam hitungan detik', 'Stok otomatis berkurang', 'Laporan harian langsung jadi'],
        usps: ['Bisa offline', 'Gratis untuk 1 kasir'],
        allowedClaims: ['Bisa dipakai offline', 'Laporan harian otomatis'],
        forbiddenClaims: ['Dijamin omzet naik', 'Paling murah se-Indonesia'],
        usageSteps: ['Buka aplikasi', 'Ketuk produk', 'Terima pembayaran', 'Lihat laporan'],
        softwareScreens: ['Layar kasir', 'Laporan harian', 'Daftar stok'],
        mustBeVisible: true,
        wantCloseUp: true,
        dominantColors: ['#16a34a', '#ffffff'],
        logoPlacement: 'Ikon aplikasi di layar HP, pojok kiri atas header',
      },
      audience: {
        ageRange: '25-45',
        gender: 'all',
        segment: 'Pemilik warung dan toko kelontong',
        painPoint: 'Pencatatan manual di buku sering salah dan stok tidak terpantau',
        desire: 'Tahu untung harian tanpa hitung manual',
        objection: 'Takut ribet dan gaptek',
        awareness: 'problem_aware',
        speechStyle: 'casual',
        keyMessage: 'Kasir warung jadi rapi cukup dari HP',
        cta: 'Download gratis, link di bio',
      },
      strategy: { angles: ['problem_solution', 'demo'], hookStyles: ['relatable_problem', 'question'] },
      visual: {
        realism: 'photoreal',
        style: 'realistic_ugc',
        tone: 'energetic',
        pacing: 'fast',
        grading: 'natural',
        cameraStyles: ['handheld', 'macro'],
        lighting: ['window_natural'],
        dominantShots: ['close_up', 'ots'],
        transitions: ['cut', 'zoom'],
      },
      location: {
        main: 'Warung',
        indoorOutdoor: 'indoor',
        timeOfDay: 'morning',
        condition: 'Sibuk',
        requiredProps: ['HP Android', 'Meja kasir warung', 'Rak barang kelontong'],
        localFlavor: 'Papan harga, rak kelontong penuh, etalase rokok dan minuman khas warung Indonesia',
      },
      audio: { voStyle: 'friendly', musicMood: 'Upbeat ringan', sfx: 'Bunyi notifikasi transaksi' },
    },
  },
  {
    id: 'edukasi_tips',
    name: 'Edukasi / Tips',
    description: 'Konten tips singkat yang mengedukasi lalu mengarah ke produk.',
    phase: 1,
    values: {
      project: { objective: 'education', platforms: ['tiktok', 'shorts'], aspectRatio: '9:16', durationSec: 30 },
      audience: { ageRange: '18-34', gender: 'all', awareness: 'unaware' },
      strategy: { angles: ['edu_tips'], hookStyles: ['number', 'question'] },
      visual: {
        realism: 'photoreal',
        style: 'storytelling',
        tone: 'inspirational',
        pacing: 'medium',
        grading: 'natural',
        cameraStyles: ['tripod'],
        lighting: ['window_natural'],
        dominantShots: ['medium'],
        transitions: ['cut'],
      },
      location: { main: 'Rumah', indoorOutdoor: 'indoor', timeOfDay: 'afternoon' },
      audio: { voStyle: 'warm', musicMood: 'Lo-fi santai' },
    },
  },
  // Preset tambahan (Fase 2)
  {
    id: 'kecantikan',
    name: 'Kecantikan / Skincare',
    description: 'Skincare & kosmetik: tekstur produk, close-up, cahaya lembut.',
    phase: 2,
    values: {
      project: { objective: 'direct_sales', platforms: ['tiktok', 'reels'], aspectRatio: '9:16', durationSec: 20 },
      product: { type: 'physical', category: 'Kecantikan', mustBeVisible: true, wantCloseUp: true },
      audience: { ageRange: '18-34', gender: 'female' },
      strategy: {
        angles: ['testimonial_ugc'],
        hookStyles: ['relatable_problem'],
        mustAvoid: ['Klaim medis', 'Before/after berlebihan'],
      },
      visual: {
        realism: 'photoreal',
        style: 'premium_ad',
        tone: 'premium',
        pacing: 'slow',
        grading: 'pastel',
        cameraStyles: ['macro', 'gimbal'],
        depthOfField: 'shallow',
        lighting: ['studio_softbox'],
        dominantShots: ['close_up'],
        transitions: ['dissolve'],
      },
      location: { main: 'Studio', indoorOutdoor: 'indoor' },
      audio: { voStyle: 'warm', musicMood: 'Lembut, elegan' },
    },
  },
  {
    id: 'properti',
    name: 'Properti / Kos',
    description: 'Rumah, apartemen, kos: wide shot, drone, nuansa nyaman.',
    phase: 2,
    values: {
      project: { objective: 'lead', platforms: ['youtube', 'reels', 'facebook'], aspectRatio: '16:9', durationSec: 45 },
      product: { type: 'service', category: 'Properti', mustBeVisible: true, wantCloseUp: false },
      audience: { ageRange: '25-45', gender: 'all' },
      strategy: { angles: ['emotional_story'], hookStyles: ['shocking_visual'] },
      visual: {
        realism: 'photoreal',
        style: 'cinematic_commercial',
        tone: 'inspirational',
        pacing: 'slow',
        grading: 'warm',
        cameraStyles: ['drone', 'gimbal'],
        lens: 'wide',
        lighting: ['golden_hour'],
        dominantShots: ['wide'],
        transitions: ['dissolve', 'match_cut'],
      },
      location: { main: 'Rumah', indoorOutdoor: 'both', timeOfDay: 'afternoon', weather: 'Cerah' },
      audio: { voStyle: 'warm', musicMood: 'Sinematik hangat' },
    },
  },
  {
    id: 'promo_musiman',
    name: 'Promo Musiman',
    description: 'Ramadan, Harbolnas, 12.12 — FOMO dan batas waktu.',
    phase: 2,
    values: {
      project: { objective: 'promo', platforms: ['tiktok', 'reels', 'wa_status'], aspectRatio: '9:16', durationSec: 15 },
      strategy: { angles: ['promo_fomo'], hookStyles: ['number', 'bold_statement'] },
      visual: {
        realism: 'photoreal',
        style: 'cinematic_commercial',
        tone: 'energetic',
        pacing: 'fast',
        grading: 'high_contrast',
        cameraStyles: ['gimbal'],
        lighting: ['studio_softbox', 'neon'],
        dominantShots: ['close_up', 'medium'],
        transitions: ['whip_pan', 'zoom'],
      },
      location: { main: 'Studio', indoorOutdoor: 'indoor' },
      audio: { voStyle: 'energetic', musicMood: 'Hype, cepat', textOverlay: true, onScreenCta: 'Promo berakhir segera!' },
    },
  },
];
