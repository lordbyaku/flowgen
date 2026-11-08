// Kripto vault: PBKDF2 (SHA-256) -> AES-GCM 256, kunci non-extractable. Bagian 21.2.

const enc = new TextEncoder();
const dec = new TextDecoder();
export const VERIFIER_PLAINTEXT = 'avps-ok';

export interface CipherBlob {
  iv: string;
  data: string;
}

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function newSalt(): string {
  return toBase64(randomBytes(16));
}

export async function deriveKey(passphrase: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(saltB64), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(key: CryptoKey, plaintext: string, aad: string): Promise<CipherBlob> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(aad) },
    key,
    enc.encode(plaintext),
  );
  return { iv: toBase64(iv), data: toBase64(data) };
}

export async function decryptText(key: CryptoKey, blob: CipherBlob, aad: string): Promise<string> {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(blob.iv), additionalData: enc.encode(aad) },
    key,
    fromBase64(blob.data),
  );
  return dec.decode(data);
}

export function createVerifier(key: CryptoKey): Promise<CipherBlob> {
  return encryptText(key, VERIFIER_PLAINTEXT, 'verifier');
}

export async function checkVerifier(key: CryptoKey, verifier: CipherBlob): Promise<boolean> {
  try {
    return (await decryptText(key, verifier, 'verifier')) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

/** Skor kekuatan passphrase 0–4 dengan label Indonesia. */
export function passphraseStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (p.length >= 10) score++;
  if (p.length >= 16) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  if (p.length < 10) score = Math.min(score, 1);
  const labels = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return { score: s, label: labels[s] };
}

/** Jeda bertahap setelah 5 gagal berturut-turut: 2, 4, 8, ... maks 60 detik. */
export function unlockDelaySec(failures: number, freeAttempts = 5, maxSec = 60): number {
  if (failures < freeAttempts) return 0;
  return Math.min(maxSec, 2 ** (failures - freeAttempts + 1));
}
