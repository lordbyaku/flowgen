export type DocData = Record<string, unknown>;

export interface ListOptions {
  /** Urutkan updatedAt menurun. */
  orderByUpdated?: boolean;
  status?: string;
  limit?: number;
  cursor?: unknown;
}

export interface ListResult {
  items: { id: string; data: DocData }[];
  cursor: unknown | null;
}

export interface SnapshotMeta {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

/** Abstraksi penyimpanan dokumen. Implementasi: Firestore atau Mode Demo Lokal (IndexedDB). */
export interface DataBackend {
  readonly kind: 'firestore' | 'local';
  get(path: string): Promise<DocData | null>;
  set(path: string, data: DocData): Promise<void>;
  update(path: string, data: DocData): Promise<void>;
  delete(path: string): Promise<void>;
  list(collectionPath: string, opts?: ListOptions): Promise<ListResult>;
  subscribe(path: string, cb: (data: DocData | null, meta: SnapshotMeta) => void): () => void;
}
