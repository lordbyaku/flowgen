// Tes Firestore Security Rules (25.1). Butuh emulator: `pnpm emulators` (Java 11+) lalu `pnpm test:rules`.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'avps-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env?.cleanup();
});

describe('firestore.rules', () => {
  it('pemilik boleh baca/tulis datanya', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/projects/p1'), { name: 'X', updatedAt: 1 }));
    await assertSucceeds(getDoc(doc(db, 'users/alice/projects/p1')));
    await assertSucceeds(setDoc(doc(db, 'users/alice/projects/p1/docs/scenes'), { items: [] }));
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/projects/p1')));
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { displayName: 'A' }));
  });

  it('pengguna lain ditolak', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice/projects/p1'), { name: 'X' });
    });
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/projects/p1')));
    await assertFails(setDoc(doc(bob, 'users/alice/projects/p2'), { name: 'Y' }));
    await assertFails(getDoc(doc(bob, 'users/alice')));
  });

  it('anonim ditolak', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice/projects/p1')));
    await assertFails(setDoc(doc(anon, 'users/alice/projects/p1'), { name: 'X' }));
  });

  it('dokumen dengan field apiKey/cipher/key ditolak', async () => {
    const db = env.authenticatedContext('alice').firestore();
    for (const field of ['apiKey', 'api_key', 'encryptedKey', 'cipher', 'geminiKey', 'key']) {
      await assertFails(setDoc(doc(db, 'users/alice/projects/p1'), { name: 'X', [field]: 'secret' }));
    }
  });

  it('dokumen key akun (private/aiKeys): hanya pemilik yang bisa baca/tulis', async () => {
    const owner = env.authenticatedContext('alice').firestore();
    const items = [{ id: 'k1', label: 'A', apiKey: 'AQ.fake-test-value' }];
    await assertSucceeds(setDoc(doc(owner, 'users/alice/private/aiKeys'), { items, updatedAt: 1 }));
    await assertSucceeds(getDoc(doc(owner, 'users/alice/private/aiKeys')));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/private/aiKeys')));
    await assertFails(setDoc(doc(bob, 'users/alice/private/aiKeys'), { items: [], updatedAt: 1 }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice/private/aiKeys')));
  });

  it('dokumen dengan 60+ field ditolak', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const big = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`f${i}`, i]));
    await assertFails(setDoc(doc(db, 'users/alice/projects/p1'), big));
  });
});
