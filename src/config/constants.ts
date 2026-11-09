// Semua nilai yang bergantung pada layanan eksternal ditandai [VERIFIKASI] — lihat docs/VERIFY.md.
export const APP_VERSION = '1.1.1';

export const MAX_KEYS = 5;
export const MAX_SCENE_SEC = 8; // [VERIFIKASI] batas klip Google Flow
export const MIN_SCENE_SEC = 2;
export const MAX_AUTO_SCENES = 12;
export const WORDS_PER_SEC = { id: 2.3, en: 2.5 }; // estimasi VO
export const VO_FILL_RATIO = 0.85;
export const MAX_REF_IMAGES = 5;
export const MAX_REF_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_SCENE_VERSIONS = 5;
export const MAX_CONCEPT_HISTORY = 3;
export const MAX_CHARACTERS = 3;
export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const VAULT_IDLE_LOCK_MS = 30 * 60 * 1000;
export const PBKDF2_ITERATIONS = 600_000;
export const PASSPHRASE_MIN_LENGTH = 10;
export const UNLOCK_FREE_ATTEMPTS = 5;
export const UNLOCK_MAX_DELAY_SEC = 60;
export const REVEAL_KEY_MS = 10_000;
export const COOLDOWN_STEPS_SEC = [60, 120, 300, 900];
export const MAX_RETRIES_TRANSIENT = 2;
export const RETRY_BACKOFF_MS = [1000, 3000];
export const RETRY_JITTER_MS = 400;
export const REQUEST_TIMEOUT_MS = 90_000;
export const COMPLETENESS_WARN_BELOW = 70; // persen
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_MODEL_HINT = 'gemini-2.5-flash'; // [VERIFIKASI] hanya fallback; utamakan models.list
// Dinaikkan dari 19.7 (v1.1): model 2.5 menghitung token berpikir ke dalam batas ini. [VERIFIKASI]
export const MAX_OUTPUT_TOKENS = { concepts: 8192, script: 16384, prompts: 16384, regen: 4096, assist: 2048, schemaTest: 1024 };
/** Budget berpikir minimal untuk tugas JSON. 2.5 Pro tidak bisa 0 (min 128). [VERIFIKASI] */
export const THINKING_BUDGET = { flash: 0, pro: 128, gemini3Level: 'low' } as const;
/** Gambar referensi lokal yang dikirim ke AI (multimodal). */
export const MAX_AI_IMAGES = 6;
export const AI_IMAGE_MAX_DIM = 1024;
/** Perkiraan token per gambar untuk estimasi biaya. [VERIFIKASI] */
export const TOKENS_PER_IMAGE = 258;
export const TEMPERATURE = { concepts: 0.9, script: 0.7, prompts: 0.5, regen: 0.6, assist: 0.3 };
export const KEY_TEST_MAX_OUTPUT_TOKENS = 8;
export const SCENE_PROMPT_BATCH = 6;
export const BRIEF_FIELD_MAX_CHARS = 800;
export const MAX_DIALOGUE_WORDS = 18; // [VERIFIKASI] cara Flow menangani dialog
export const PROMPT_WORDS = { short: [50, 90], detailed: [120, 220] } as const;
export const LINT_MIN_WORDS = 40;
export const LINT_MAX_WORDS = 220;
export const SCENES_DOC_SOFT_LIMIT_BYTES = 800 * 1024;
export const PROJECTS_PAGE_SIZE = 20;
export const USAGE_MAX_ROWS = 2000;
export const USAGE_MAX_AGE_DAYS = 30;
export const QUOTA_RESET_TIMEZONE = 'America/Los_Angeles'; // [VERIFIKASI] reset kuota harian tengah malam Pacific
export const MAX_ASSIST_QUESTIONS = 5;
export const DEFAULT_DAILY_CALL_BUDGET = 0; // 0 = nonaktif (Fase 3 audit biaya)
