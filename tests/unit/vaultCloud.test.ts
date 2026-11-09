// @vitest-environment node
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Simulasi Firestore: satu dokumen key per uid.
const cloud = new Map<string, { items: Record<string, unknown>[]; updatedAt: number }>();
vi.mock('@/data/aiKeyRepo', () => ({
  loadCloudKeys: vi.fn(async (uid: string) => structuredClone(cloud.get(uid) ?? null)),
  saveCloudKeys: vi.fn(async (uid: string, items: Record<string, unknown>[]) => {
    cloud.set(uid, structuredClone({ items, updatedAt: Date.now() }));
  }),
  deleteCloudKeys: vi.fn(async (uid: string) => {
    cloud.delete(uid);
  }),
}));

const { _resetDbForTests, getDb } = await import('@/vault/db');
const { _resetVaultMemoryForTests, useVaultStore, vaultKeyAccess } = await import('@/vault/vaultStore');

const NEW_KEY = 'AQ.' + 'CloudSyncFake'.repeat(4);
const ITER = 1000;

/** Simulasi membuka aplikasi di device/browser baru (IndexedDB kosong, memori kosong). */
async function freshDevice() {
  await _resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
  _resetVaultMemoryForTests();
  useVaultStore.setState({ status: 'loading', meta: null, keys: [], cloudError: null });
}

beforeEach(async () => {
  cloud.clear();
  await freshDevice();
});

describe('Vault mode "Tersimpan di akun" (cloud)', () => {
  it('key tersimpan di akun dan otomatis muncul di device lain setelah login', async () => {
    await useVaultStore.getState().init('user-A');
    expect(useVaultStore.getState().status).toBe('uninitialized');
    expect((await useVaultStore.getState().setup({ mode: 'cloud' })).ok).toBe(true);
    const k = await useVaultStore.getState().addKey({ label: 'Utama', projectId: 'P', model: 'gemini-2.5-flash', apiKey: NEW_KEY });
    expect(cloud.get('user-A')!.items[0].apiKey).toBe(NEW_KEY);

    // Device B: tidak ada vault lokal, cukup login.
    await freshDevice();
    await useVaultStore.getState().init('user-A');
    const st = useVaultStore.getState();
    expect(st.status).toBe('unlocked');
    expect(st.meta?.mode).toBe('cloud');
    expect(st.keys.map((x) => x.label)).toEqual(['Utama']);
    expect(await vaultKeyAccess.withPlainKey(k.id, async (p) => p)).toBe(NEW_KEY);
  });

  it('plaintext tidak masuk IndexedDB lokal maupun state zustand', async () => {
    await useVaultStore.getState().init('user-A');
    await useVaultStore.getState().setup({ mode: 'cloud' });
    await useVaultStore.getState().addKey({ label: 'Utama', projectId: 'P', model: 'm', apiKey: NEW_KEY });
    const db = await getDb();
    expect(await db.getAll('keys')).toHaveLength(0);
    expect(JSON.stringify(await db.getAll('meta'))).not.toContain(NEW_KEY);
    expect(JSON.stringify(useVaultStore.getState())).not.toContain(NEW_KEY);
  });

  it('akun lain tidak mendapat key; setup cloud tidak menimpa key yang sudah ada di akun', async () => {
    await useVaultStore.getState().init('user-A');
    await useVaultStore.getState().setup({ mode: 'cloud' });
    await useVaultStore.getState().addKey({ label: 'A', projectId: 'P', model: 'm', apiKey: NEW_KEY });

    await freshDevice();
    await useVaultStore.getState().init('user-B');
    expect(useVaultStore.getState().status).toBe('uninitialized');

    // Device lain milik user-A memilih setup cloud manual: key lama tetap ada.
    await freshDevice();
    await useVaultStore.getState().init(null);
    useVaultStore.getState().resetMemory();
    await useVaultStore.getState().init('user-A');
    expect(useVaultStore.getState().keys).toHaveLength(1);
  });

  it('status router (cooldown, lastUsed) ikut tersinkron; hapus key tersinkron', async () => {
    await useVaultStore.getState().init('user-A');
    await useVaultStore.getState().setup({ mode: 'cloud' });
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'P', model: 'm', apiKey: NEW_KEY });
    await vaultKeyAccess.patchKey(k.id, { status: 'rate_limited', cooldownUntil: 123 });
    expect(cloud.get('user-A')!.items[0].status).toBe('rate_limited');
    await useVaultStore.getState().removeKey(k.id);
    expect(cloud.get('user-A')!.items).toHaveLength(0);
  });

  it('pindah persisten -> cloud -> persisten memindahkan key dan membersihkan salinan akun', async () => {
    await useVaultStore.getState().init('user-A');
    await useVaultStore.getState().setup({ mode: 'persistent', passphrase: 'passphrase-uji-123', iterations: ITER });
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'P', model: 'm', apiKey: NEW_KEY });
    expect((await useVaultStore.getState().switchMode('cloud')).ok).toBe(true);
    expect(cloud.get('user-A')!.items[0].apiKey).toBe(NEW_KEY);
    expect(await (await getDb()).getAll('keys')).toHaveLength(0);
    expect((await useVaultStore.getState().switchMode('persistent', 'passphrase-baru-99', ITER)).ok).toBe(true);
    expect(cloud.has('user-A')).toBe(false);
    expect(await useVaultStore.getState().revealKey(k.id)).toBe(NEW_KEY);
  });

  it('mode cloud butuh login; logout membersihkan key dari memori', async () => {
    await useVaultStore.getState().init(null);
    expect((await useVaultStore.getState().setup({ mode: 'cloud' })).ok).toBe(false);
    await useVaultStore.getState().init('user-A');
    await useVaultStore.getState().setup({ mode: 'cloud' });
    const k = await useVaultStore.getState().addKey({ label: 'A', projectId: 'P', model: 'm', apiKey: NEW_KEY });
    useVaultStore.getState().resetMemory();
    expect(useVaultStore.getState().keys).toHaveLength(0);
    await expect(vaultKeyAccess.withPlainKey(k.id, async (p) => p)).rejects.toThrow();
  });

  it('Hapus Semua Key di mode cloud menghapus dokumen akun', async () => {
    await useVaultStore.getState().init('user-A');
    await useVaultStore.getState().setup({ mode: 'cloud' });
    await useVaultStore.getState().addKey({ label: 'A', projectId: 'P', model: 'm', apiKey: NEW_KEY });
    await useVaultStore.getState().deleteAll();
    expect(cloud.has('user-A')).toBe(false);
    expect(useVaultStore.getState().status).toBe('uninitialized');
  });
});
