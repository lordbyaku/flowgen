import { USAGE_MAX_AGE_DAYS, USAGE_MAX_ROWS } from '@/config/constants';
import type { LocalKey, UsageLog, VaultMeta } from '@/types';
import { getDb } from './db';

const META_K = 'vault';

export async function getMeta(): Promise<VaultMeta | null> {
  const db = await getDb();
  const rec = await db.get('meta', META_K);
  if (!rec) return null;
  const { k: _k, ...meta } = rec;
  return meta;
}

export async function putMeta(meta: VaultMeta): Promise<void> {
  const db = await getDb();
  await db.put('meta', { ...meta, k: META_K });
}

export async function listKeys(): Promise<LocalKey[]> {
  const db = await getDb();
  const all = await db.getAll('keys');
  return all.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
}

export async function getKey(id: string): Promise<LocalKey | undefined> {
  return (await getDb()).get('keys', id);
}

export async function putKey(key: LocalKey): Promise<void> {
  await (await getDb()).put('keys', key);
}

export async function deleteKey(id: string): Promise<void> {
  await (await getDb()).delete('keys', id);
}

/** Simpan ulang semua key dan meta dalam satu transaksi (ganti passphrase). */
export async function replaceAllKeys(keys: LocalKey[], meta: VaultMeta): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['keys', 'meta'], 'readwrite');
  await tx.objectStore('keys').clear();
  for (const k of keys) await tx.objectStore('keys').put(k);
  await tx.objectStore('meta').put({ ...meta, k: META_K });
  await tx.done;
}

/** Delete All Keys: hapus store keys dan meta. */
export async function deleteAllKeysAndMeta(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['keys', 'meta'], 'readwrite');
  await tx.objectStore('keys').clear();
  await tx.objectStore('meta').clear();
  await tx.done;
}

export async function addUsage(log: UsageLog): Promise<void> {
  const db = await getDb();
  const { id: _id, ...rest } = log;
  await db.add('usage', rest as UsageLog);
}

export async function listUsage(limit = 50): Promise<UsageLog[]> {
  const db = await getDb();
  const out: UsageLog[] = [];
  let cursor = await db.transaction('usage').store.index('by_ts').openCursor(null, 'prev');
  while (cursor && out.length < limit) {
    out.push(cursor.value);
    cursor = await cursor.continue();
  }
  return out;
}

export async function listUsageSince(sinceTs: number): Promise<UsageLog[]> {
  const db = await getDb();
  return db.getAllFromIndex('usage', 'by_ts', IDBKeyRange.lowerBound(sinceTs));
}

/** Pangkas log lebih tua dari 30 hari atau lebih dari 2000 baris. */
export async function trimUsage(nowMs: number): Promise<void> {
  const db = await getDb();
  const cutoff = nowMs - USAGE_MAX_AGE_DAYS * 86400_000;
  const tx = db.transaction('usage', 'readwrite');
  const idx = tx.store.index('by_ts');
  let cursor = await idx.openCursor(IDBKeyRange.upperBound(cutoff, true));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  const count = await tx.store.count();
  if (count > USAGE_MAX_ROWS) {
    let excess = count - USAGE_MAX_ROWS;
    let c = await idx.openCursor();
    while (c && excess > 0) {
      await c.delete();
      excess--;
      c = await c.continue();
    }
  }
  await tx.done;
}

export async function clearUsage(): Promise<void> {
  await (await getDb()).clear('usage');
}

export async function getSetting<T>(k: string): Promise<T | undefined> {
  const rec = await (await getDb()).get('settings', k);
  return rec?.value as T | undefined;
}

export async function setSetting(k: string, value: unknown): Promise<void> {
  await (await getDb()).put('settings', { k, value });
}
