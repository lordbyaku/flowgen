import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '@/config/firebase';
import type { DataBackend, DocData, ListOptions } from './backend';
import { assertNoSecrets, fromStored, stripUndefined } from './converters';

const TIME_FIELDS = ['createdAt', 'updatedAt'];

function toStored(data: DocData): DocData {
  assertNoSecrets(data);
  const out: DocData = stripUndefined({ ...data });
  for (const f of TIME_FIELDS) if (typeof out[f] === 'number') out[f] = Timestamp.fromMillis(out[f] as number);
  return out;
}

export function createFirestoreBackend(): DataBackend {
  return {
    kind: 'firestore',
    async get(path) {
      const snap = await getDoc(doc(getDb(), path));
      return snap.exists() ? (fromStored(snap.data()) as DocData) : null;
    },
    async set(path, data) {
      await setDoc(doc(getDb(), path), toStored(data));
    },
    async update(path, data) {
      await setDoc(doc(getDb(), path), toStored(data), { merge: true });
    },
    async delete(path) {
      await deleteDoc(doc(getDb(), path));
    },
    async list(collectionPath, opts: ListOptions = {}) {
      const cons: QueryConstraint[] = [];
      if (opts.status) cons.push(where('status', '==', opts.status));
      if (opts.orderByUpdated) cons.push(orderBy('updatedAt', 'desc'));
      if (opts.cursor) cons.push(startAfter(opts.cursor as QueryDocumentSnapshot));
      if (opts.limit) cons.push(qLimit(opts.limit));
      const snap = await getDocs(query(collection(getDb(), collectionPath), ...cons));
      const items = snap.docs.map((d) => ({ id: d.id, data: fromStored(d.data()) as DocData }));
      const last = snap.docs[snap.docs.length - 1];
      return { items, cursor: opts.limit && snap.docs.length === opts.limit ? last : null };
    },
    subscribe(path, cb) {
      return onSnapshot(
        doc(getDb(), path),
        { includeMetadataChanges: false },
        (snap) =>
          cb(snap.exists() ? (fromStored(snap.data()) as DocData) : null, {
            hasPendingWrites: snap.metadata.hasPendingWrites,
            fromCache: snap.metadata.fromCache,
          }),
        (err) => console.error('Listener Firestore gagal', err.code),
      );
    },
  };
}
