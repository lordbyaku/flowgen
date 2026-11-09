// Nilai enum (sumber untuk skema Zod) beserta label Indonesia untuk UI.

export const OBJECTIVES = ['awareness', 'direct_sales', 'lead', 'education', 'launch', 'promo', 'retargeting'] as const;
export const PLATFORMS = ['tiktok', 'reels', 'shorts', 'ig_feed', 'facebook', 'wa_status', 'youtube'] as const;
export const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:5'] as const;
export const SCRIPT_LANGUAGES = ['id_formal', 'id_casual', 'en', 'mixed', 'regional'] as const;
export const PRODUCT_TYPES = ['physical', 'food_beverage', 'service', 'digital', 'software'] as const;
export const ANGLES = [
  'problem_solution',
  'before_after',
  'demo',
  'testimonial_ugc',
  'pov',
  'emotional_story',
  'comparison',
  'unboxing',
  'bts',
  'comedy_skit',
  'edu_tips',
  'promo_fomo',
] as const;
export const HOOK_STYLES = [
  'question',
  'bold_statement',
  'shocking_visual',
  'relatable_problem',
  'number',
  'pattern_interrupt',
] as const;
export const REALISMS = ['photoreal', 'stylized', 'animation_3d', 'illustration_2d'] as const;
export const CREATIVE_STYLES = [
  'cinematic_commercial',
  'realistic_ugc',
  'minimalist',
  'storytelling',
  'premium_ad',
  'documentary',
] as const;
export const TONES = ['emotional', 'professional', 'energetic', 'premium', 'humorous', 'inspirational'] as const;
export const PACINGS = ['slow', 'medium', 'fast'] as const;
export const GRADINGS = ['natural', 'warm', 'cool', 'high_contrast', 'pastel', 'teal_orange'] as const;
export const CAMERA_STYLES = ['tripod', 'gimbal', 'handheld', 'drone', 'macro', 'pov'] as const;
export const LENSES = ['wide', '35mm', '50mm', '85mm', 'macro'] as const;
export const DOFS = ['shallow', 'medium', 'deep'] as const;
export const LIGHTINGS = ['window_natural', 'golden_hour', 'studio_softbox', 'neon', 'low_key'] as const;
export const SHOTS = ['close_up', 'medium', 'wide', 'overhead', 'ots'] as const;
export const TRANSITIONS = ['cut', 'match_cut', 'whip_pan', 'dissolve', 'zoom'] as const;
export const CHARACTER_MODES = ['single', 'hands_only', 'no_people', 'multiple'] as const;
export const TRACKER_STATUSES = ['prompt_ready', 'copied', 'clip_generated', 'downloaded', 'in_capcut', 'final'] as const;
export const KEY_STATUSES = [
  'not_tested',
  'connected',
  'invalid_key',
  'model_unavailable',
  'rate_limited',
  'quota_exhausted',
  'network_error',
  'disabled',
] as const;
export const AI_TASKS = ['key_test', 'brief_assist', 'concepts', 'script_storyboard', 'scene_prompts', 'scene_regen'] as const;
export const GENDERS = ['all', 'male', 'female'] as const;
export const AWARENESS = ['unaware', 'problem_aware', 'solution_aware', 'product_aware'] as const;
export const SPEECH_STYLES = ['formal', 'casual', 'slang', 'regional'] as const;
export const INDOOR_OUTDOOR = ['indoor', 'outdoor', 'both'] as const;
export const TIMES_OF_DAY = ['morning', 'noon', 'afternoon', 'night'] as const;
export const EXTRAS = ['none', 'few', 'crowded'] as const;
export const VO_STYLES = ['friendly', 'firm', 'warm', 'energetic'] as const;
export const TEXT_LANGUAGES = ['id', 'en'] as const;
export const VARIANTS = ['standard', 'cinematic', 'premium'] as const;
export const PROMPT_LENGTHS = ['short', 'detailed'] as const;
export const FLOW_MODES = ['text_to_video', 'image_to_video', 'frames'] as const;
export const ROUTINGS = ['round_robin', 'priority', 'single'] as const;
export const VAULT_MODES = ['persistent', 'session', 'cloud'] as const;
export const PROJECT_STATUSES = ['draft', 'in_progress', 'completed'] as const;
export const PROJECT_STAGES = ['brief', 'concepts', 'script', 'prompts', 'production', 'done'] as const;

export const LABELS = {
  objective: {
    awareness: 'Awareness',
    direct_sales: 'Penjualan langsung',
    lead: 'Lead/DM',
    education: 'Edukasi',
    launch: 'Launching',
    promo: 'Promo/diskon',
    retargeting: 'Retargeting',
  },
  platform: {
    tiktok: 'TikTok',
    reels: 'Reels',
    shorts: 'YouTube Shorts',
    ig_feed: 'Feed IG',
    facebook: 'Facebook',
    wa_status: 'Status WhatsApp',
    youtube: 'YouTube',
  },
  aspectRatio: { '9:16': '9:16 (vertikal)', '16:9': '16:9 (horizontal)', '1:1': '1:1 (persegi)', '4:5': '4:5 (feed)' },
  scriptLanguage: {
    id_formal: 'Indonesia baku',
    id_casual: 'Indonesia santai',
    en: 'Inggris',
    mixed: 'Campuran',
    regional: 'Daerah (isi manual)',
  },
  productType: {
    physical: 'Barang fisik',
    food_beverage: 'Makanan/minuman',
    service: 'Jasa',
    digital: 'Produk digital',
    software: 'Software/aplikasi',
  },
  angle: {
    problem_solution: 'Masalah ke Solusi',
    before_after: 'Before/After',
    demo: 'Demo cara pakai',
    testimonial_ugc: 'Testimoni/UGC',
    pov: 'POV',
    emotional_story: 'Storytelling emosional',
    comparison: 'Perbandingan',
    unboxing: 'Unboxing',
    bts: 'Behind the scenes',
    comedy_skit: 'Skit humor',
    edu_tips: 'Tips edukasi',
    promo_fomo: 'Promo/FOMO',
  },
  hookStyle: {
    question: 'Pertanyaan',
    bold_statement: 'Pernyataan mengejutkan',
    shocking_visual: 'Visual mengejutkan',
    relatable_problem: 'Masalah relatable',
    number: 'Angka',
    pattern_interrupt: 'Pattern interrupt',
  },
  realism: {
    photoreal: 'Fotorealistik',
    stylized: 'Stylized',
    animation_3d: 'Animasi 3D',
    illustration_2d: 'Ilustrasi 2D',
  },
  creativeStyle: {
    cinematic_commercial: 'Cinematic commercial',
    realistic_ugc: 'Realistis/UGC',
    minimalist: 'Minimalis',
    storytelling: 'Storytelling',
    premium_ad: 'Premium ad',
    documentary: 'Dokumenter',
  },
  tone: {
    emotional: 'Emosional',
    professional: 'Profesional',
    energetic: 'Energik',
    premium: 'Premium',
    humorous: 'Humor',
    inspirational: 'Inspiratif',
  },
  pacing: { slow: 'Lambat', medium: 'Sedang', fast: 'Cepat' },
  grading: {
    natural: 'Natural',
    warm: 'Warm',
    cool: 'Cool',
    high_contrast: 'High contrast',
    pastel: 'Pastel',
    teal_orange: 'Teal-orange',
  },
  cameraStyle: {
    tripod: 'Tripod statis',
    gimbal: 'Gimbal halus',
    handheld: 'Handheld',
    drone: 'Drone',
    macro: 'Macro',
    pov: 'POV',
  },
  lens: { wide: 'Wide', '35mm': '35mm', '50mm': '50mm', '85mm': '85mm', macro: 'Macro' },
  dof: { shallow: 'Dangkal (latar buram)', medium: 'Sedang', deep: 'Dalam' },
  lighting: {
    window_natural: 'Jendela natural',
    golden_hour: 'Golden hour',
    studio_softbox: 'Softbox studio',
    neon: 'Neon',
    low_key: 'Low-key dramatis',
  },
  shot: { close_up: 'Close-up', medium: 'Medium', wide: 'Wide', overhead: 'Overhead', ots: 'Over-the-shoulder' },
  transition: { cut: 'Cut', match_cut: 'Match cut', whip_pan: 'Whip pan', dissolve: 'Dissolve', zoom: 'Zoom' },
  characterMode: {
    single: 'Karakter utama',
    hands_only: 'Tangan saja',
    no_people: 'Tanpa orang (produk saja)',
    multiple: 'Beberapa karakter (maks 3)',
  },
  tracker: {
    prompt_ready: 'Prompt siap',
    copied: 'Disalin',
    clip_generated: 'Klip dibuat di Flow',
    downloaded: 'Diunduh',
    in_capcut: 'Masuk CapCut',
    final: 'Final',
  },
  keyStatus: {
    not_tested: 'Belum dites',
    connected: 'Terhubung',
    invalid_key: 'Key tidak valid',
    model_unavailable: 'Model tidak tersedia',
    rate_limited: 'Kena batas (jeda)',
    quota_exhausted: 'Kuota habis',
    network_error: 'Error jaringan',
    disabled: 'Nonaktif',
  },
  aiTask: {
    key_test: 'Tes key',
    brief_assist: 'Asisten brief',
    concepts: 'Konsep',
    script_storyboard: 'Naskah & storyboard',
    scene_prompts: 'Prompt scene',
    scene_regen: 'Regenerasi scene',
  },
  gender: { all: 'Semua', male: 'Pria', female: 'Wanita' },
  awareness: {
    unaware: 'Belum sadar masalah',
    problem_aware: 'Sadar masalah',
    solution_aware: 'Tahu solusi',
    product_aware: 'Tahu produk',
  },
  speechStyle: { formal: 'Formal', casual: 'Santai', slang: 'Gaul', regional: 'Daerah' },
  indoorOutdoor: { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Keduanya' },
  timeOfDay: { morning: 'Pagi', noon: 'Siang', afternoon: 'Sore', night: 'Malam' },
  extras: { none: 'Tanpa', few: 'Sedikit', crowded: 'Ramai' },
  voStyle: { friendly: 'Ramah', firm: 'Tegas', warm: 'Hangat', energetic: 'Energik' },
  textLanguage: { id: 'Indonesia', en: 'Inggris' },
  variant: { standard: 'Standard', cinematic: 'Cinematic', premium: 'Premium Commercial' },
  promptLength: { short: 'Ringkas', detailed: 'Detail' },
  flowMode: { text_to_video: 'Teks ke video', image_to_video: 'Gambar ke video', frames: 'Frame awal-akhir' },
  routing: { round_robin: 'Round Robin', priority: 'Prioritas', single: 'Satu Key' },
  vaultMode: { persistent: 'Persisten di browser (terenkripsi)', session: 'Hanya sesi (memori)', cloud: 'Tersimpan di akun (sinkron)' },
  projectStatus: { draft: 'Draft', in_progress: 'Berjalan', completed: 'Selesai' },
  stage: {
    brief: 'Brief',
    concepts: 'Konsep',
    script: 'Naskah',
    prompts: 'Prompt',
    production: 'Produksi',
    done: 'Selesai',
  },
} as const;

export const LOCATION_OPTIONS = [
  'Warung',
  'Toko',
  'Kafe',
  'Restoran',
  'Kantor',
  'Rumah',
  'Pasar',
  'Gudang',
  'Hotel',
  'Outdoor',
  'Studio',
] as const;
export const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+', '18-34', '25-45', 'Semua umur'] as const;
export const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const CHARACTER_ROLES = ['Pemilik usaha', 'Pelanggan', 'Karyawan', 'Kurir', 'Ibu rumah tangga', 'Pelajar'] as const;
export const GLOBAL_NEGATIVE_OPTIONS = [
  'distorted text',
  'wrong logo',
  'deformed hands',
  'extra fingers',
  'watermark',
  'sensitive content',
  'blurry product',
  'unnatural face',
] as const;
