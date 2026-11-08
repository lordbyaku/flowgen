import type { DataBackend } from './backend';

/** Audit jumlah read/write Firestore per hari lokal (Fase 3). Disimpan di localStorage; tidak memuat data. */
const K = 'avps-fs-ops';

export interface OpsCount {
  day: string;
  reads: number;
  writes: number;
}

const today = () => new Date().toLocaleDateString('sv-SE');

export function readOps(): OpsCount {
  try {
    const raw = localStorage.getItem(K);
    const v = raw ? (JSON.parse(raw) as OpsCount) : null;
    if (v && v.day === today()) return v;
  } catch {
    /* abaikan */
  }
  return { day: today(), reads: 0, writes: 0 };
}

function bump(kind: 'reads' | 'writes', n = 1) {
  const v = readOps();
  v[kind] += n;
  try {
    localStorage.setItem(K, JSON.stringify(v));
  } catch {
    /* abaikan */
  }
}

export function withOpsCounter(b: DataBackend): DataBackend {
  return {
    kind: b.kind,
    async get(path) {
      bump('reads');
      return b.get(path);
    },
    async set(path, data) {
      bump('writes');
      return b.set(path, data);
    },
    async update(path, data) {
      bump('writes');
      return b.update(path, data);
    },
    async delete(path) {
      bump('writes');
      return b.delete(path);
    },
    async list(path, opts) {
      const r = await b.list(path, opts);
      bump('reads', Math.max(1, r.items.length));
      return r;
    },
    subscribe(path, cb) {
      return b.subscribe(path, (d, m) => {
        if (!m.hasPendingWrites) bump('reads');
        cb(d, m);
      });
    },
  };
}
