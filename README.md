# AI Video Prompt Studio

Aplikasi web pribadi yang mengubah brief produk menjadi paket produksi video promosi: konsep, naskah, storyboard, Character Bible, Visual Bible, prompt Google Flow per scene (Inggris, siap salin), dan panduan editing CapCut (Indonesia). Aplikasi **tidak** membuat, merender, atau memublikasikan video.

Spesifikasi lengkap: [`PRD.md`](PRD.md) (v1.3). Keputusan implementasi: [`docs/DECISIONS.md`](docs/DECISIONS.md). Item yang perlu diverifikasi: [`docs/VERIFY.md`](docs/VERIFY.md).

| Versi | Tanggal | Catatan |
|---|---|---|
| 1.2.0 | 2026-11-09 | API key tersimpan di akun (sinkron antar device, tanpa passphrase) |
| 1.1.1 | 2026-11-09 | Dukungan format API key Gemini baru `AQ.…`; token debug App Check tidak lagi ikut ke bundle produksi |
| 1.1.0 | 2026-11-08 | Gambar referensi multimodal, prompt frame mode gambar, perbaikan otomatis linter, estimasi biaya, uji skema JSON, cadangan saat tab ditutup, Firebase lazy |
| 1.0.0 | 2026-11-08 | Rilis awal: Fase 1, 2, dan 3 |

## Alur kerja

1. Isi Brief (wizard 8 langkah + Review, autosave, skor kelengkapan, preset, template).
2. Buat & pilih konsep (Panggilan AI 1).
3. Buat naskah, storyboard, Character Bible, Visual Bible (Panggilan AI 2), lalu review.
4. Buat prompt Flow per scene + panduan CapCut (Panggilan AI 3, batch 6 scene). Salin ke Google Flow.
5. Tandai status scene di Production Tracker.
6. Susun klip di CapCut mengikuti panduan; ekspor paket ke Markdown/TXT/Clipboard.

## Tech stack

React 18 + Vite 6 + TypeScript · Tailwind CSS + komponen gaya shadcn/ui (Radix) + Lucide · Zustand · Zod (+ zod-to-json-schema) · Firebase (Auth, Firestore, App Check, Hosting — paket Spark) · Gemini Developer API REST dari browser · IndexedDB (`idb`) + Web Crypto · dnd-kit · Vitest + Testing Library + Playwright.

## Menjalankan

Prasyarat: Node 20+, pnpm 9. (Firebase CLI & Java 11+ hanya untuk emulator/deploy.)

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

Tanpa `.env.local`, aplikasi otomatis berjalan dalam **Mode Demo Lokal**: login demo, data project disimpan di IndexedDB browser ini (tidak sinkron). Cocok untuk mencoba semua fitur. Fitur AI tetap butuh API key Gemini asli (dari Google AI Studio) yang dimasukkan lewat menu **AI Provider**.

### Dengan Firebase

1. Buat project Firebase (Spark): aktifkan Authentication (Email/Password, Google opsional), Firestore (mode produksi), Hosting; daftarkan App Check (reCAPTCHA v3).
2. Salin `.env.example` → `.env.local`, isi `VITE_FIREBASE_*` dan `VITE_APPCHECK_SITE_KEY`. Ubah `.firebaserc`.
3. Emulator lokal: `pnpm emulators` lalu jalankan dev dengan `VITE_USE_EMULATORS=true`.

API key Gemini dari Google AI Studio berformat `AQ.…` (baru) atau `AIza…` (lama); keduanya diterima.

### Penyimpanan API key (mode vault)

| Mode | Lokasi | Pindah device | Passphrase |
|---|---|---|---|
| **Tersimpan di akun** (default) | Firestore `users/{uid}/private/aiKeys`, hanya bisa dibaca akun Anda | Otomatis muncul setelah login | Tidak |
| Terenkripsi di browser | IndexedDB browser ini (AES-GCM) | Tambah ulang per device | Ya, tiap sesi |
| Hanya sesi | Memori tab | Hilang saat tab ditutup | Tidak |

Mode akun menyimpan key sebagai teks biasa yang dilindungi Security Rules: siapa pun yang berhasil masuk ke akun ini atau punya akses ke Firebase Console project ini bisa membacanya. Pakai password akun yang kuat dan batasi key di Google Cloud Console. Mode bisa diganti di Settings.

**API key Gemini tidak boleh ada di `.env` atau source code** — hanya dimasukkan lewat UI dan disimpan terenkripsi di browser.

## Script

| Script | Fungsi |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm preview` | Dev server, build produksi, pratinjau |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | Pemeriksaan wajib sebelum commit |
| `pnpm check:secrets` | Gagal bila ada pola key Gemini (`AQ.…` atau `AIza…`) di `src`/`dist`; key web Firebase dari `.env` dikecualikan |
| `pnpm test:rules` | Tes Firestore Security Rules (butuh `pnpm emulators` berjalan) |
| `pnpm test:rules:emu` | Menyalakan emulator Firestore lalu menjalankan tes rules (butuh Java 11+) |
| `pnpm test:e2e` | E2E Playwright, Gemini dipalsukan. `PW_CHANNEL=msedge` atau `chrome` untuk browser terpasang |
| `pnpm emulators` | Firebase emulator auth, firestore, hosting |

## Fitur

**Fase 1 (MVP)**
- Auth email/password + Google, rute terlindungi; Mode Demo Lokal.
- Brand Profile (CRUD + duplikat).
- Brief wizard 8 langkah + Review: semua field Bagian 5 dengan penanda W/P/O, tooltip, contoh, validasi inline, chip, gambar referensi (URL/file lokal ≤3 MB, tidak diunggah); skor kelengkapan berbobot; field W kosong memblokir generate; preset Warung/Kuliner, Fashion, Jasa Lokal, SaaS UMKM (Warungku-POS), Edukasi/Tips.
- Vault API key: passphrase (PBKDF2 600k + AES-GCM, AAD = ID record), mode sesi, auto-lock, jeda setelah 5 gagal, ganti passphrase, tampil 10 detik, Hapus Semua Key (ketik HAPUS).
- AI Provider Manager: maks 5 key, project label wajib, model dari `models.list`, tes koneksi & Tes Generate, aktif/nonaktif, prioritas, routing Round Robin/Prioritas/Satu Key, cooldown per Google Cloud project, banner keamanan, panel usage lokal.
- AI Router: antrean satu request, retry terbatas (500/503/network), cooldown bertahap 60→900 s (RetryInfo sebagai batas bawah), kuota harian sampai tengah malam Pacific, tidak ada pindah key otomatis saat 429, error disanitasi.
- Pipeline 3 panggilan terstruktur (JSON mode + `responseSchema` + Zod + satu kali perbaikan).
- Konsep (pilih, edit, regenerate, approve, asumsi AI), Naskah (penghitung kata/estimasi durasi), Storyboard (edit semua field, tambah/hapus/duplikat/urutkan, regenerate per scene, approve, indikator total durasi + saran perbaikan), editor Character & Visual Bible.
- Prompt Google Flow per scene: salin (+ baris Avoid), Salin Semua, edit manual, versi, approve.
- Prompt Linter L01–L13 dengan lencana yang dapat diklik (peringatan, bukan pemblokir).
- Production Tracker (papan 6 status, catatan, progres).
- Export Center: Markdown, TXT (semua prompt, per scene, VO), Clipboard — tanpa key.

**Fase 2**
- AI Brief Assistant (maks 5 pertanyaan, jawaban ditulis balik ke brief).
- Varian Cinematic & Premium Commercial.
- Riwayat versi dengan perbandingan berdampingan & pulihkan; riwayat konsep (maks 3).
- Brief Template & duplikat project.
- Panduan CapCut mendalam: timeline visual per detik, daftar teks overlay dengan salin, checklist ekspor.
- Statistik usage: request & token per key, 7 hari terakhir, riwayat error.
- Drag-and-drop urutan scene (dnd-kit, bisa dengan keyboard).
- Preset tambahan (Kecantikan, Properti, Promo Musiman) & aturan linter aktif/nonaktif per project.
- Uji E2E Playwright dengan Gemini dipalsukan.

**Peningkatan v1.1**
- Gambar referensi lokal dikirim ke Gemini (multimodal) saat membuat Character & Visual Bible.
- Mode Flow "Gambar ke video"/"Frame awal-akhir": prompt gambar frame awal/akhir per scene + prompt gerak.
- Perbaikan otomatis Prompt Linter (L02, L03, L04, L07, L10).
- Estimasi panggilan & token sebelum generate; tombol "Uji skema JSON" per key.
- Budget "thinking" minimal per model agar output JSON tidak terpotong.
- Cadangan perubahan saat tab ditutup; konfirmasi reload di vault mode sesi; Firebase dimuat lazy.

**Fase 3**
- Prompt Library (koleksi `promptTemplates`) + sisip ke prompt scene.
- Import/Export project JSON dengan validasi Zod & `schemaVersion`.
- Perbandingan versi scene berdampingan dengan penanda perbedaan.
- Audit biaya: peringatan anggaran panggilan AI harian & penghitung read/write Firestore.

## Struktur

```
src/
  ai/         aiService (satu-satunya pintu UI), providers/geminiProvider (satu-satunya fetch), router/, director/, json/
  vault/      IndexedDB + kripto + vaultStore (satu-satunya pemilik key)
  data/       repositori (Firestore / Mode Demo Lokal) — satu-satunya akses data
  domain/     logika murni: kelengkapan, durasi, anggaran kata, linter, exporters, versi
  schemas/    skema Zod (sumber tipe)
  features/   layar per fitur
  components/ ui/, layout/, common/
tests/ unit/ rules/ e2e/
```

## Status pengujian

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (unit + komponen), `pnpm build`, `pnpm check:secrets` (src & dist): **lulus**.
- `pnpm test:e2e` dengan Edge: **lulus** (alur brief → konsep → naskah → storyboard → prompt → export, Gemini dipalsukan).
- `pnpm test:rules`: ditulis, **belum dijalankan** (butuh Java 11+ dan Firebase CLI). Setelah Java terpasang cukup `pnpm test:rules:emu`.
- **Belum diuji dengan Gemini asli.** Langkah pertama yang disarankan: AI Provider → tambah key → **Uji skema JSON**, lalu jalankan satu alur Konsep.
- Deploy Firebase Hosting & uji asap manual Bagian 29.2: **belum** (butuh project Firebase milik pemilik).

## Deploy

```bash
firebase login && firebase use <project-id>
pnpm build && pnpm check:secrets
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Pantau App Check dalam mode metrik dulu, aktifkan enforcement Firestore setelah traffic sah terkonfirmasi.

## Keamanan

Key dipakai langsung dari browser (tanpa backend tepercaya) — keputusan sadar untuk pemakaian pribadi. Enkripsi browser tidak melindungi dari script berbahaya di origin yang sama; CSP ketat di `firebase.json` membatasi tujuan koneksi. Jangan pakai sebagai aplikasi publik dengan key bersama. Batasi key di Google AI Studio/Cloud Console bila didukung.
