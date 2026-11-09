import { create } from 'zustand';
import {
  MAX_KEYS,
  PASSPHRASE_MIN_LENGTH,
  PBKDF2_ITERATIONS,
  UNLOCK_FREE_ATTEMPTS,
  UNLOCK_MAX_DELAY_SEC,
  VAULT_IDLE_LOCK_MS,
} from '@/config/constants';
import { newId } from '@/lib/ids';
import type { KeyView, LocalKey, Routing, UsageLog, VaultMeta, VaultMode } from '@/types';
import * as crypto from './crypto';
import * as repo from './keyRepository';
import * as previews from './previewRepo';
import { deleteCloudKeys, loadCloudKeys, saveCloudKeys, type CloudKeyItem } from '@/data/aiKeyRepo';

/**
 * Vault: satu-satunya pemilik API key. CryptoKey dan plaintext (mode sesi) hanya disimpan di
 * variabel modul, tidak di state zustand, agar tidak pernah ikut ter-serialisasi atau tampil di devtools.
 */
let cryptoKey: CryptoKey | null = null;
const sessionSecrets = new Map<string, string>();
let sessionKeys: LocalKey[] = [];
/** UID pengguna yang login; dibutuhkan mode 'cloud' (key tersimpan di akun). */
let currentUid: string | null = null;

/** Mode yang menyimpan key di memori tab: 'session' (tidak disimpan) dan 'cloud' (disinkronkan ke akun). */
const isMemoryMode = (m: VaultMode | undefined) => m === 'session' || m === 'cloud';

function hydrateFromCloud(items: CloudKeyItem[]) {
  sessionSecrets.clear();
  sessionKeys = items.map(({ apiKey, ...k }) => {
    sessionSecrets.set(k.id, apiKey);
    return { ...k, cipher: { iv: '', data: '' } };
  });
}

/** Tulis seluruh daftar key mode 'cloud' ke dokumen akun. */
async function syncCloud(): Promise<void> {
  if (!currentUid) throw new Error('Belum login: key tidak bisa disimpan ke akun.');
  const items: CloudKeyItem[] = sessionKeys.flatMap(({ cipher: _c, ...k }) => {
    const apiKey = sessionSecrets.get(k.id);
    return apiKey ? [{ ...k, apiKey }] : [];
  });
  await saveCloudKeys(currentUid, items);
}

export type VaultStatus = 'loading' | 'uninitialized' | 'locked' | 'unlocked';

export interface AddKeyInput {
  label: string;
  projectId: string;
  model: string;
  apiKey: string;
}

export type KeyPatch = Partial<
  Pick<LocalKey, 'label' | 'projectId' | 'model' | 'enabled' | 'priority' | 'status' | 'lastTestedAt' | 'lastUsedAt' | 'consecutiveErrors' | 'cooldownUntil' | 'lastError'>
>;

interface VaultState {
  status: VaultStatus;
  meta: VaultMeta | null;
  keys: KeyView[];
  failedAttempts: number;
  lockoutUntil: number;
  lastActivity: number;
  autoLockMs: number;
  /** Error saat memuat/menyimpan key di akun (mode 'cloud'). */
  cloudError: string | null;
  init(uid?: string | null): Promise<void>;
  /** Bersihkan semua key dari memori (dipanggil saat logout). */
  resetMemory(): void;
  setup(opts: { mode: VaultMode; passphrase?: string; iterations?: number }): Promise<{ ok: boolean; message?: string }>;
  unlock(passphrase: string): Promise<{ ok: boolean; message?: string }>;
  lock(): void;
  touch(): void;
  checkIdle(now?: number): void;
  setAutoLockMs(ms: number): Promise<void>;
  addKey(input: AddKeyInput): Promise<KeyView>;
  updateKey(id: string, patch: KeyPatch & { apiKey?: string }): Promise<void>;
  removeKey(id: string): Promise<void>;
  moveKey(id: string, dir: -1 | 1): Promise<void>;
  revealKey(id: string): Promise<string | null>;
  deleteAll(): Promise<void>;
  changePassphrase(oldPass: string, newPass: string, iterations?: number): Promise<{ ok: boolean; message?: string }>;
  switchMode(mode: VaultMode, passphrase?: string, iterations?: number): Promise<{ ok: boolean; message?: string }>;
  setRouting(routing: Routing, singleKeyId?: string): Promise<void>;
  refreshKeys(): Promise<void>;
}

const toView = ({ cipher: _c, ...rest }: LocalKey): KeyView => rest;

const emptyMeta = (mode: VaultMode, salt = '', iterations = 0, verifier = { iv: '', data: '' }): VaultMeta => ({
  version: 1,
  salt,
  iterations,
  verifier,
  mode,
  routing: 'round_robin',
  projectCooldowns: {},
});

async function loadAllKeys(mode: VaultMode | undefined): Promise<LocalKey[]> {
  return isMemoryMode(mode) ? [...sessionKeys] : repo.listKeys();
}

async function persistKey(mode: VaultMode, key: LocalKey): Promise<void> {
  if (isMemoryMode(mode)) {
    const i = sessionKeys.findIndex((k) => k.id === key.id);
    if (i >= 0) sessionKeys[i] = key;
    else sessionKeys.push(key);
    if (mode === 'cloud') await syncCloud();
  } else {
    await repo.putKey(key);
  }
}

function validatePassphrase(p: string | undefined): string | null {
  if (!p || p.length < PASSPHRASE_MIN_LENGTH) return `Passphrase minimal ${PASSPHRASE_MIN_LENGTH} karakter.`;
  return null;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'loading',
  meta: null,
  keys: [],
  failedAttempts: 0,
  lockoutUntil: 0,
  lastActivity: Date.now(),
  autoLockMs: VAULT_IDLE_LOCK_MS,
  cloudError: null,

  async init(uid) {
    if (uid !== undefined) currentUid = uid;
    let meta = await repo.getMeta();
    const autoLockMs = (await repo.getSetting<number>('autoLockMs')) ?? VAULT_IDLE_LOCK_MS;
    // Mode 'cloud', atau device baru tanpa vault lokal: cek key yang tersimpan di akun.
    if (currentUid && (meta?.mode === 'cloud' || !meta)) {
      try {
        const cloud = await loadCloudKeys(currentUid);
        if (!meta && cloud && cloud.items.length > 0) {
          meta = emptyMeta('cloud');
          await repo.putMeta(meta);
        }
        if (meta?.mode === 'cloud') {
          hydrateFromCloud(cloud?.items ?? []);
          set({ status: 'unlocked', meta, keys: sessionKeys.map(toView), autoLockMs, cloudError: null });
          return;
        }
      } catch {
        if (meta?.mode === 'cloud') {
          set({
            status: 'unlocked',
            meta,
            keys: sessionKeys.map(toView),
            autoLockMs,
            cloudError: 'Gagal memuat API key dari akun. Periksa koneksi lalu muat ulang halaman.',
          });
          return;
        }
      }
    }
    if (!meta) {
      set({ status: 'uninitialized', meta: null, keys: [], autoLockMs });
      return;
    }
    if (meta.mode === 'session') {
      // Mode sesi: key tidak pernah disimpan; setelah tab ditutup daftar key kosong.
      set({ status: 'unlocked', meta, keys: sessionKeys.map(toView), autoLockMs });
      return;
    }
    const keys = await repo.listKeys();
    set({ status: cryptoKey ? 'unlocked' : 'locked', meta, keys: keys.map(toView), autoLockMs });
  },

  async setup({ mode, passphrase, iterations = PBKDF2_ITERATIONS }) {
    if (mode === 'persistent') {
      const err = validatePassphrase(passphrase);
      if (err) return { ok: false, message: err };
      const salt = crypto.newSalt();
      const key = await crypto.deriveKey(passphrase!, salt, iterations);
      const verifier = await crypto.createVerifier(key);
      const meta = emptyMeta('persistent', salt, iterations, verifier);
      await repo.putMeta(meta);
      cryptoKey = key;
      set({ status: 'unlocked', meta, keys: [], lastActivity: Date.now(), failedAttempts: 0 });
    } else if (mode === 'cloud') {
      if (!currentUid) return { ok: false, message: 'Login terlebih dahulu untuk menyimpan key di akun.' };
      const meta = emptyMeta('cloud');
      // Jangan menimpa key yang sudah tersimpan di akun dari device lain.
      const cloud = await loadCloudKeys(currentUid).catch(() => null);
      await repo.putMeta(meta);
      hydrateFromCloud(cloud?.items ?? []);
      set({ status: 'unlocked', meta, keys: sessionKeys.map(toView), lastActivity: Date.now(), cloudError: null });
    } else {
      const meta = emptyMeta('session');
      await repo.putMeta(meta);
      sessionKeys = [];
      sessionSecrets.clear();
      set({ status: 'unlocked', meta, keys: [], lastActivity: Date.now() });
    }
    return { ok: true };
  },

  resetMemory() {
    cryptoKey = null;
    sessionKeys = [];
    sessionSecrets.clear();
    currentUid = null;
    set({ status: 'loading', meta: null, keys: [], cloudError: null });
  },

  async unlock(passphrase) {
    const { meta, lockoutUntil, failedAttempts } = get();
    if (!meta) return { ok: false, message: 'Vault belum disiapkan.' };
    if (isMemoryMode(meta.mode)) return { ok: true };
    const now = Date.now();
    if (lockoutUntil > now) {
      return { ok: false, message: `Terlalu banyak percobaan. Tunggu ${Math.ceil((lockoutUntil - now) / 1000)} detik.` };
    }
    const key = await crypto.deriveKey(passphrase, meta.salt, meta.iterations);
    if (!(await crypto.checkVerifier(key, meta.verifier))) {
      const failures = failedAttempts + 1;
      const delay = crypto.unlockDelaySec(failures, UNLOCK_FREE_ATTEMPTS, UNLOCK_MAX_DELAY_SEC);
      set({ failedAttempts: failures, lockoutUntil: delay ? now + delay * 1000 : 0 });
      return { ok: false, message: 'Passphrase salah.' };
    }
    cryptoKey = key;
    const keys = await repo.listKeys();
    set({ status: 'unlocked', failedAttempts: 0, lockoutUntil: 0, lastActivity: now, keys: keys.map(toView) });
    return { ok: true };
  },

  lock() {
    if (isMemoryMode(get().meta?.mode)) return;
    cryptoKey = null;
    set({ status: get().meta ? 'locked' : 'uninitialized' });
  },

  touch() {
    set({ lastActivity: Date.now() });
  },

  checkIdle(now = Date.now()) {
    const { status, lastActivity, autoLockMs, meta } = get();
    if (status === 'unlocked' && meta?.mode === 'persistent' && now - lastActivity > autoLockMs) get().lock();
  },

  async setAutoLockMs(ms) {
    await repo.setSetting('autoLockMs', ms);
    set({ autoLockMs: ms });
  },

  async addKey(input) {
    const { meta, status } = get();
    if (!meta || status !== 'unlocked') throw new Error('Vault terkunci.');
    const existing = await loadAllKeys(meta.mode);
    if (existing.length >= MAX_KEYS) throw new Error(`Maksimal ${MAX_KEYS} key.`);
    const id = `key_${newId()}`;
    const apiKey = input.apiKey.trim();
    const cipher =
      meta.mode === 'persistent' ? await crypto.encryptText(cryptoKey!, apiKey, id) : { iv: '', data: '' };
    if (isMemoryMode(meta.mode)) sessionSecrets.set(id, apiKey);
    const rec: LocalKey = {
      id,
      label: input.label.trim(),
      projectId: input.projectId.trim(),
      model: input.model.trim(),
      enabled: true,
      status: 'not_tested',
      priority: existing.length ? Math.max(...existing.map((k) => k.priority)) + 1 : 0,
      cipher,
      last4: apiKey.slice(-4),
      consecutiveErrors: 0,
      createdAt: Date.now(),
    };
    await persistKey(meta.mode, rec);
    await get().refreshKeys();
    return toView(rec);
  },

  async updateKey(id, patch) {
    const { meta } = get();
    if (!meta) return;
    const all = await loadAllKeys(meta.mode);
    const cur = all.find((k) => k.id === id);
    if (!cur) return;
    const { apiKey, ...rest } = patch;
    const next: LocalKey = { ...cur, ...rest };
    if (rest.enabled === false) next.status = 'disabled';
    if (rest.enabled === true && cur.status === 'disabled') next.status = 'not_tested';
    if (apiKey !== undefined && apiKey.trim()) {
      if (get().status !== 'unlocked') throw new Error('Vault terkunci.');
      const trimmed = apiKey.trim();
      if (meta.mode === 'persistent') next.cipher = await crypto.encryptText(cryptoKey!, trimmed, id);
      else sessionSecrets.set(id, trimmed); // session & cloud
      next.last4 = trimmed.slice(-4);
      next.status = 'not_tested';
      next.consecutiveErrors = 0;
    }
    await persistKey(meta.mode, next);
    await get().refreshKeys();
  },

  async removeKey(id) {
    const { meta } = get();
    if (!meta) return;
    if (isMemoryMode(meta.mode)) {
      sessionKeys = sessionKeys.filter((k) => k.id !== id);
      sessionSecrets.delete(id);
      if (meta.mode === 'cloud') await syncCloud();
    } else await repo.deleteKey(id);
    if (meta.singleKeyId === id || meta.rrCursor === id) {
      const m = { ...meta, singleKeyId: meta.singleKeyId === id ? undefined : meta.singleKeyId, rrCursor: undefined };
      await repo.putMeta(m);
      set({ meta: m });
    }
    await get().refreshKeys();
  },

  async moveKey(id, dir) {
    const { meta } = get();
    if (!meta) return;
    const all = await loadAllKeys(meta.mode);
    const i = all.findIndex((k) => k.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    for (let p = 0; p < all.length; p++) await persistKey(meta.mode, { ...all[p], priority: p });
    await get().refreshKeys();
  },

  async revealKey(id) {
    const { meta, status } = get();
    if (!meta || status !== 'unlocked') return null;
    return withPlainKeyInternal(id, async (k) => k);
  },

  async deleteAll() {
    if (get().meta?.mode === 'cloud' && currentUid) await deleteCloudKeys(currentUid);
    await repo.deleteAllKeysAndMeta();
    cryptoKey = null;
    sessionKeys = [];
    sessionSecrets.clear();
    set({ status: 'uninitialized', meta: null, keys: [], failedAttempts: 0, lockoutUntil: 0 });
  },

  async changePassphrase(oldPass, newPass, iterations = PBKDF2_ITERATIONS) {
    const { meta } = get();
    if (!meta || meta.mode !== 'persistent') return { ok: false, message: 'Hanya untuk mode persisten.' };
    const err = validatePassphrase(newPass);
    if (err) return { ok: false, message: err };
    const oldKey = await crypto.deriveKey(oldPass, meta.salt, meta.iterations);
    if (!(await crypto.checkVerifier(oldKey, meta.verifier))) return { ok: false, message: 'Passphrase lama salah.' };
    const salt = crypto.newSalt();
    const newKey = await crypto.deriveKey(newPass, salt, iterations);
    const keys = await repo.listKeys();
    const reenc: LocalKey[] = [];
    for (const k of keys) {
      const plain = await crypto.decryptText(oldKey, k.cipher, k.id);
      reenc.push({ ...k, cipher: await crypto.encryptText(newKey, plain, k.id) });
    }
    const nextMeta: VaultMeta = { ...meta, salt, iterations, verifier: await crypto.createVerifier(newKey) };
    await repo.replaceAllKeys(reenc, nextMeta);
    cryptoKey = newKey;
    set({ meta: nextMeta, status: 'unlocked', lastActivity: Date.now() });
    return { ok: true };
  },

  async switchMode(mode, passphrase, iterations = PBKDF2_ITERATIONS) {
    const { meta, status } = get();
    if (!meta) return { ok: false, message: 'Vault belum disiapkan.' };
    if (meta.mode === mode) return { ok: true };
    if (status !== 'unlocked') return { ok: false, message: 'Buka vault terlebih dahulu.' };
    if (mode === 'cloud' && !currentUid) return { ok: false, message: 'Login terlebih dahulu untuk menyimpan key di akun.' };
    if (mode === 'persistent') {
      const err = validatePassphrase(passphrase);
      if (err) return { ok: false, message: err };
    }
    const from = meta.mode;
    const keys = await loadAllKeys(from);
    const plains = new Map<string, string>();
    for (const k of keys) {
      const p = await withPlainKeyInternal(k.id, async (x) => x);
      if (p) plains.set(k.id, p);
    }

    if (mode === 'persistent') {
      const salt = crypto.newSalt();
      const key = await crypto.deriveKey(passphrase!, salt, iterations);
      const enc: LocalKey[] = [];
      for (const k of keys) {
        const p = plains.get(k.id);
        if (p) enc.push({ ...k, cipher: await crypto.encryptText(key, p, k.id) });
      }
      const nextMeta: VaultMeta = { ...meta, mode: 'persistent', salt, iterations, verifier: await crypto.createVerifier(key) };
      await repo.replaceAllKeys(enc, nextMeta);
      sessionKeys = [];
      sessionSecrets.clear();
      cryptoKey = key;
      set({ meta: nextMeta, status: 'unlocked' });
    } else {
      // session atau cloud: key pindah ke memori (cloud juga disimpan ke akun)
      sessionKeys = keys.filter((k) => plains.has(k.id)).map((k) => ({ ...k, cipher: { iv: '', data: '' } }));
      sessionSecrets.clear();
      plains.forEach((v, id) => sessionSecrets.set(id, v));
      const nextMeta: VaultMeta = { ...meta, mode, salt: '', iterations: 0, verifier: { iv: '', data: '' } };
      if (mode === 'cloud') await syncCloud();
      await repo.replaceAllKeys([], nextMeta);
      cryptoKey = null;
      set({ meta: nextMeta, status: 'unlocked' });
    }
    // Keluar dari mode cloud: hapus salinan di akun.
    if (from === 'cloud' && currentUid) await deleteCloudKeys(currentUid).catch(() => undefined);
    await get().refreshKeys();
    return { ok: true };
  },

  async setRouting(routing, singleKeyId) {
    const { meta } = get();
    if (!meta) return;
    const next = { ...meta, routing, singleKeyId: routing === 'single' ? singleKeyId : meta.singleKeyId };
    await repo.putMeta(next);
    set({ meta: next });
  },

  async refreshKeys() {
    const { meta } = get();
    const keys = await loadAllKeys(meta?.mode);
    set({ keys: keys.map(toView) });
  },
}));

/** Dekripsi key hanya untuk durasi `fn`; plaintext tidak disimpan di mana pun. */
async function withPlainKeyInternal<T>(id: string, fn: (apiKey: string) => Promise<T>): Promise<T | null> {
  const { meta } = useVaultStore.getState();
  if (!meta) return null;
  if (isMemoryMode(meta.mode)) {
    const k = sessionSecrets.get(id);
    return k ? fn(k) : null;
  }
  if (!cryptoKey) return null;
  const rec = await repo.getKey(id);
  if (!rec) return null;
  let plain: string | null = await crypto.decryptText(cryptoKey, rec.cipher, rec.id);
  try {
    return await fn(plain);
  } finally {
    plain = null;
  }
}

/** Akses key untuk AI router (bukan untuk UI). */
export interface KeyAccess {
  isUnlocked(): boolean;
  listKeys(): Promise<LocalKey[]>;
  getMeta(): Promise<VaultMeta | null>;
  saveMeta(meta: VaultMeta): Promise<void>;
  patchKey(id: string, patch: KeyPatch): Promise<void>;
  withPlainKey<T>(id: string, fn: (apiKey: string) => Promise<T>): Promise<T>;
  touch(): void;
}

export const vaultKeyAccess: KeyAccess = {
  isUnlocked: () => useVaultStore.getState().status === 'unlocked',
  listKeys: () => loadAllKeys(useVaultStore.getState().meta?.mode),
  getMeta: async () => useVaultStore.getState().meta,
  async saveMeta(meta) {
    await repo.putMeta(meta);
    useVaultStore.setState({ meta });
  },
  async patchKey(id, patch) {
    const { meta } = useVaultStore.getState();
    if (!meta) return;
    const all = await loadAllKeys(meta.mode);
    const cur = all.find((k) => k.id === id);
    if (!cur) return;
    await persistKey(meta.mode, { ...cur, ...patch });
    await useVaultStore.getState().refreshKeys();
  },
  async withPlainKey(id, fn) {
    const r = await withPlainKeyInternal(id, fn);
    if (r === null) throw new Error('vault_locked');
    return r;
  },
  touch: () => useVaultStore.getState().touch(),
};

/** Usage log lokal (tanpa key). */
export const usageStore = {
  add: (log: UsageLog) => repo.addUsage(log),
  list: (limit?: number) => repo.listUsage(limit),
  since: (ts: number) => repo.listUsageSince(ts),
  trim: (nowMs: number) => repo.trimUsage(nowMs),
  clear: () => repo.clearUsage(),
};

/** Pratinjau gambar referensi lokal. */
export const previewStore = {
  save: previews.savePreview,
  getUrl: previews.getPreviewUrl,
  remove: previews.deletePreview,
  forAI: previews.getPreviewForAI,
};

/** Preferensi lokal non-rahasia (IndexedDB settings). */
export const localSettings = {
  get: repo.getSetting,
  set: repo.setSetting,
};

export { passphraseStrength } from './crypto';

/** Hanya untuk tes. */
export function _resetVaultMemoryForTests() {
  currentUid = null;
  cryptoKey = null;
  sessionKeys = [];
  sessionSecrets.clear();
}
