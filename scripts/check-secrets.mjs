#!/usr/bin/env node
// Gagal (exit 1) jika ada string berpola API key Gemini (AIza + 35 karakter, atau format baru AQ.…) di direktori yang dipindai.
// Default: src dan dist. Argumen opsional: daftar direktori lain (dipakai tes fixture).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const PATTERN = /AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z_-]{20,}/g;
const SKIP_DIRS = new Set(['node_modules', '.git']);
const TEXT_EXT = /\.(m?[jt]sx?|json|html|css|md|txt|map|env|ya?ml)$/i;

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'dist'];

// Firebase web API key (juga berformat AIza…) memang publik dan wajib ada di bundle.
// Hanya nilai PERSIS dari VITE_FIREBASE_API_KEY yang dikecualikan; key Gemini tetap terdeteksi.
function readFirebaseWebKey() {
  if (process.env.VITE_FIREBASE_API_KEY) return process.env.VITE_FIREBASE_API_KEY.trim();
  for (const f of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    if (!existsSync(f)) continue;
    const m = /^\s*VITE_FIREBASE_API_KEY\s*=\s*["']?([^"'\s]+)/m.exec(readFileSync(f, 'utf8'));
    if (m) return m[1].trim();
  }
  return null;
}
const ALLOWED = new Set([readFirebaseWebKey()].filter(Boolean));

const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (TEXT_EXT.test(name) && st.size < 20 * 1024 * 1024) {
      const lines = readFileSync(p, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const m of line.matchAll(PATTERN)) {
          if (!ALLOWED.has(m[0])) {
            hits.push(`${relative(process.cwd(), p)}:${i + 1}`);
            break;
          }
        }
      });
    }
  }
}

for (const d of dirs) if (existsSync(d)) walk(d);

if (hits.length) {
  console.error(`check:secrets GAGAL — ditemukan ${hits.length} string berpola API key:`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log(
  `check:secrets OK — tidak ada pola API key di: ${dirs.filter((d) => existsSync(d)).join(', ')}` +
    (ALLOWED.size ? ' (Firebase web API key dikecualikan karena publik)' : ''),
);
