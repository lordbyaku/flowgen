import { openDB, type IDBPDatabase } from 'idb';
import type { DataBackend, DocData, ListOptions, SnapshotMeta } from './backend';
import { assertNoSecrets, stripUndefined } from './converters';

/**
 * Backend Mode Demo Lokal: dokumen disimpan di IndexedDB `avps-demo` dengan path sebagai kunci.
 * Hanya untuk mencoba aplikasi tanpa Firebase; tidak sinkron antar perangkat.
 */
interface Row {
  path: string;
  parent: string;
  data: DocData;
}

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) {
    dbp = openDB('avps-demo', 1, {
      upgrade(d) {
        const s = d.createObjectStore('docs', { keyPath: 'path' });
        s.createIndex('by_parent', 'parent');
      },
    });
  }
  return dbp;
}

const parentOf = (path: string) => path.split('/').slice(0, -1).join('/');
const idOf = (path: string) => path.split('/').pop() ?? '';

type Listener = (data: DocData | null, meta: SnapshotMeta) => void;
const listeners = new Map<string, Set<Listener>>();
const META: SnapshotMeta = { hasPendingWrites: false, fromCache: false };

function emit(path: string, data: DocData | null) {
  listeners.get(path)?.forEach((l) => l(data, META));
}

const clone = <T>(v: T): T => structuredClone(v);

export function createLocalBackend(): DataBackend {
  return {
    kind: 'local',
    async get(path) {
      const row = (await (await db()).get('docs', path)) as Row | undefined;
      return row ? clone(row.data) : null;
    },
    async set(path, data) {
      assertNoSecrets(data);
      const clean = stripUndefined(clone(data));
      await (await db()).put('docs', { path, parent: parentOf(path), data: clean } satisfies Row);
      emit(path, clone(clean));
    },
    async update(path, data) {
      assertNoSecrets(data);
      const d = await db();
      const cur = ((await d.get('docs', path)) as Row | undefined)?.data ?? {};
      const merged = stripUndefined({ ...cur, ...clone(data) });
      await d.put('docs', { path, parent: parentOf(path), data: merged } satisfies Row);
      emit(path, clone(merged));
    },
    async delete(path) {
      await (await db()).delete('docs', path);
      emit(path, null);
    },
    async list(collectionPath, opts: ListOptions = {}) {
      const rows = ((await (await db()).getAllFromIndex('docs', 'by_parent', collectionPath)) as Row[]).filter(
        (r) => !opts.status || r.data.status === opts.status,
      );
      if (opts.orderByUpdated) rows.sort((a, b) => Number(b.data.updatedAt ?? 0) - Number(a.data.updatedAt ?? 0));
      const start = typeof opts.cursor === 'number' ? opts.cursor : 0;
      const end = opts.limit ? start + opts.limit : rows.length;
      const page = rows.slice(start, end);
      return {
        items: page.map((r) => ({ id: idOf(r.path), data: clone(r.data) })),
        cursor: end < rows.length ? end : null,
      };
    },
    subscribe(path, cb) {
      const set = listeners.get(path) ?? new Set();
      set.add(cb);
      listeners.set(path, set);
      void this.get(path).then((d) => cb(d, META));
      return () => set.delete(cb);
    },
  };
}
