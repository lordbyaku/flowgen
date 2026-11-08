#!/usr/bin/env node
// Gagal (exit 1) jika ada string berpola API key Gemini (AIza + 35 karakter) di direktori yang dipindai.
// Default: src dan dist. Argumen opsional: daftar direktori lain (dipakai tes fixture).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const PATTERN = /AIza[0-9A-Za-z_-]{35}/g;
const SKIP_DIRS = new Set(['node_modules', '.git']);
const TEXT_EXT = /\.(m?[jt]sx?|json|html|css|md|txt|map|env|ya?ml)$/i;

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'dist'];
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (TEXT_EXT.test(name) && st.size < 20 * 1024 * 1024) {
      const text = readFileSync(p, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (PATTERN.test(line)) hits.push(`${relative(process.cwd(), p)}:${i + 1}`);
        PATTERN.lastIndex = 0;
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
console.log(`check:secrets OK — tidak ada pola API key di: ${dirs.filter((d) => existsSync(d)).join(', ')}`);
