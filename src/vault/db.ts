import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { LocalKey, UsageLog, VaultMeta } from '@/types';

export interface PreviewRecord {
  id: string;
  blob: Blob;
  mime: string;
  name: string;
  size: number;
  createdAt: number;
}

interface VaultDB extends DBSchema {
  meta: { key: string; value: VaultMeta & { k: string } };
  keys: { key: string; value: LocalKey; indexes: { by_priority: number } };
  usage: { key: number; value: UsageLog; indexes: { by_ts: number } };
  previews: { key: string; value: PreviewRecord };
  settings: { key: string; value: { k: string; value: unknown } };
}

export const DB_NAME = 'avps-vault';
let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<VaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('meta', { keyPath: 'k' });
        const keys = db.createObjectStore('keys', { keyPath: 'id' });
        keys.createIndex('by_priority', 'priority');
        const usage = db.createObjectStore('usage', { keyPath: 'id', autoIncrement: true });
        usage.createIndex('by_ts', 'ts');
        db.createObjectStore('previews', { keyPath: 'id' });
        db.createObjectStore('settings', { keyPath: 'k' });
      },
    });
  }
  return dbPromise;
}

/** Hanya untuk tes: tutup dan lupakan koneksi. */
export async function _resetDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}
