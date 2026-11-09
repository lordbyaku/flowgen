// @vitest-environment node
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import * as crypto from '@/vault/crypto';
import { _resetDbForTests, getDb } from '@/vault/db';
import { _resetVaultMemoryForTests, useVaultStore, vaultKeyAccess } from '@/vault/vaultStore';

const FAKE_KEY = 'AIza' + 'Sy' + 'TESTTESTTESTTESTTESTTESTTESTTEST9';
const ITER = 1000; // iterasi rendah untuk tes; produksi memakai PBKDF2_ITERATIONS

async function dumpDb(): Promise<string> {
  const db = await getDb();
  const out: Record<string, unknown[]> = {};
  for (const store of ['meta', 'keys', 'usage', 'previews', 'settings'] as const) out[store] = await db.getAll(store);
  return JSON.stringify(out);
}

beforeEach(async () => {
  await _resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
  _resetVaultMemoryForTests();
  useVaultStore.setState({ status: 'loading', meta: null, keys: [], failedAttempts: 0, lockoutUntil: 0 });
});

describe('crypto (21.3)', () => {
  it('round trip enkripsi/dekripsi', async () => {
    const k = await crypto.deriveKey('passphrase-panjang', crypto.newSalt(), ITER);
    const c = await crypto.encryptText(k, FAKE_KEY, 'rec1');
    expect(await crypto.decryptText(k, c, 'rec1')).toBe(FAKE_KEY);
  });
  it('passphrase salah gagal', async () => {
    const salt = crypto.newSalt();
    const k1 = await crypto.deriveKey('passphrase-benar', salt, ITER);
    const k2 = await crypto.deriveKey('passphrase-salah', salt, ITER);
    const v = await crypto.createVerifier(k1);
    expect(await crypto.checkVerifier(k1, v)).toBe(true);
    expect(await crypto.checkVerifier(k2, v)).toBe(false);
  });
  it('IV tidak pernah berulang', async () => {
    const k = await crypto.deriveKey('passphrase-panjang', crypto.newSalt(), ITER);
    const ivs = new Set<string>();
    for (let i = 0; i < 50; i++) ivs.add((await crypto.encryptText(k, 'x', 'r')).iv);
    expect(ivs.size).toBe(50);
  });
  it('ciphertext tidak bisa didekripsi dengan additionalData record lain', async () => {
    const k = await crypto.deriveKey('passphrase-panjang', crypto.newSalt(), ITER);
    const c = await crypto.encryptText(k, FAKE_KEY, 'rec1');
    await expect(crypto.decryptText(k, c, 'rec2')).rejects.toBeTruthy();
  });
  it('jeda unlock bertahap maks 60 detik', () => {
    expect(crypto.unlockDelaySec(4)).toBe(0);
    expect(crypto.unlockDelaySec(5)).toBe(2);
    expect(crypto.unlockDelaySec(6)).toBe(4);
    expect(crypto.unlockDelaySec(20)).toBe(60);
  });
  it('kekuatan passphrase', () => {
    expect(crypto.passphraseStrength('pendek').score).toBeLessThanOrEqual(1);
    expect(crypto.passphraseStrength('Sangat-Panjang-123!').score).toBe(4);
  });
});

describe('vaultStore', () => {
  it('setup persisten, tambah key, dump IndexedDB tanpa plaintext', async () => {
    const s = useVaultStore.getState();
    expect((await s.setup({ mode: 'persistent', passphrase: 'pendek' })).ok).toBe(false);
    expect((await s.setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER })).ok).toBe(true);
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'p1', model: 'm', apiKey: FAKE_KEY });
    expect(k.last4).toBe(FAKE_KEY.slice(-4));
    expect('cipher' in k).toBe(false);
    const dump = await dumpDb();
    expect(dump).not.toContain(FAKE_KEY);
    expect(dump).not.toMatch(/AIza[0-9A-Za-z_-]{35}/);
    // state zustand juga tidak memuat plaintext
    expect(JSON.stringify(useVaultStore.getState())).not.toContain(FAKE_KEY);
    expect(await vaultKeyAccess.withPlainKey(k.id, async (p) => p)).toBe(FAKE_KEY);
  });

  it('setelah lock, key tidak bisa didekripsi; unlock dengan passphrase salah gagal', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'p1', model: 'm', apiKey: FAKE_KEY });
    useVaultStore.getState().lock();
    expect(useVaultStore.getState().status).toBe('locked');
    expect(await useVaultStore.getState().revealKey(k.id)).toBeNull();
    await expect(vaultKeyAccess.withPlainKey(k.id, async (p) => p)).rejects.toThrow('vault_locked');
    expect(JSON.stringify(useVaultStore.getState())).not.toContain(FAKE_KEY);
    expect((await useVaultStore.getState().unlock('passphrase-salah!!')).ok).toBe(false);
    expect((await useVaultStore.getState().unlock('passphrase-uji-123')).ok).toBe(true);
    expect(await useVaultStore.getState().revealKey(k.id)).toBe(FAKE_KEY);
  });

  it('memuat ulang (init) dari IndexedDB tetap terkunci sampai unlock', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    await useVaultStore.getState().addKey({ label: 'A', projectId: 'p1', model: 'm', apiKey: FAKE_KEY });
    _resetVaultMemoryForTests(); // simulasi refresh halaman
    await useVaultStore.getState().init();
    expect(useVaultStore.getState().status).toBe('locked');
    expect(useVaultStore.getState().keys).toHaveLength(1);
  });

  it('lockout setelah 5 kali gagal', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    useVaultStore.getState().lock();
    for (let i = 0; i < 5; i++) await useVaultStore.getState().unlock('salah-salah-salah');
    expect(useVaultStore.getState().lockoutUntil).toBeGreaterThan(Date.now());
    const r = await useVaultStore.getState().unlock('passphrase-uji-123');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Tunggu/);
  });

  it('maksimal 5 key ditegakkan', async () => {
    await useVaultStore.getState().setup({ mode: 'session' });
    for (let i = 0; i < 5; i++) await useVaultStore.getState().addKey({ label: `K${i}`, projectId: 'p', model: 'm', apiKey: `${FAKE_KEY}${i}` });
    await expect(useVaultStore.getState().addKey({ label: 'K6', projectId: 'p', model: 'm', apiKey: FAKE_KEY })).rejects.toThrow(/Maksimal 5/);
  });

  it('key format baru AQ.… terenkripsi dan tidak muncul di dump', async () => {
    const NEW = 'AQ.' + 'VaultNewFormat'.repeat(4);
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    const k = await useVaultStore.getState().addKey({ label: 'Baru', projectId: 'p1', model: 'm', apiKey: NEW });
    expect(k.last4).toBe(NEW.slice(-4));
    expect(await dumpDb()).not.toContain(NEW);
    expect(await vaultKeyAccess.withPlainKey(k.id, async (p) => p)).toBe(NEW);
  });

  it('mode sesi: key tidak pernah ditulis ke IndexedDB', async () => {
    await useVaultStore.getState().setup({ mode: 'session' });
    await useVaultStore.getState().addKey({ label: 'S', projectId: 'p', model: 'm', apiKey: FAKE_KEY });
    const db = await getDb();
    expect(await db.getAll('keys')).toHaveLength(0);
    expect(await dumpDb()).not.toContain(FAKE_KEY);
  });

  it('ganti passphrase mengenkripsi ulang semua key', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-lama-1', iterations: ITER });
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'p1', model: 'm', apiKey: FAKE_KEY });
    expect((await useVaultStore.getState().changePassphrase('salah-salah-1', 'passphrase-baru-1', ITER)).ok).toBe(false);
    expect((await useVaultStore.getState().changePassphrase('passphrase-lama-1', 'passphrase-baru-1', ITER)).ok).toBe(true);
    useVaultStore.getState().lock();
    expect((await useVaultStore.getState().unlock('passphrase-lama-1')).ok).toBe(false);
    expect((await useVaultStore.getState().unlock('passphrase-baru-1')).ok).toBe(true);
    expect(await useVaultStore.getState().revealKey(k.id)).toBe(FAKE_KEY);
  });

  it('ganti mode persisten -> sesi -> persisten mempertahankan key', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'p1', model: 'm', apiKey: FAKE_KEY });
    expect((await useVaultStore.getState().switchMode('session')).ok).toBe(true);
    expect(await (await getDb()).getAll('keys')).toHaveLength(0);
    expect(await useVaultStore.getState().revealKey(k.id)).toBe(FAKE_KEY);
    expect((await useVaultStore.getState().switchMode('persistent', 'passphrase-baru-99', ITER)).ok).toBe(true);
    expect(await (await getDb()).getAll('keys')).toHaveLength(1);
    expect(await dumpDb()).not.toContain(FAKE_KEY);
  });

  it('Delete All Keys menghapus keys dan meta', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    await useVaultStore.getState().addKey({ label: 'A', projectId: 'p1', model: 'm', apiKey: FAKE_KEY });
    await useVaultStore.getState().deleteAll();
    const db = await getDb();
    expect(await db.getAll('keys')).toHaveLength(0);
    expect(await db.getAll('meta')).toHaveLength(0);
    expect(useVaultStore.getState().status).toBe('uninitialized');
  });

  it('auto-lock setelah idle', async () => {
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    useVaultStore.getState().checkIdle(Date.now() + 31 * 60_000);
    expect(useVaultStore.getState().status).toBe('locked');
  });
});
