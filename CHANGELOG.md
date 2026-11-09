# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [Semantic Versioning](https://semver.org/lang/id/).

## [1.1.1] - 2026-11-09

### Diubah
- Format API key Gemini baru `AQ.…` dikenali (validasi format, sensor pesan error/log, dan `check:secrets`); format lama `AIza…` tetap didukung. Placeholder dan pesan peringatan diperbarui.
- `check:secrets` mengecualikan hanya nilai `VITE_FIREBASE_API_KEY` (key web Firebase memang publik dan berformat `AIza…`), sehingga pemindaian `dist` bisa dipakai pada build Firebase.
- `.env` ditambahkan ke `.gitignore`; `.firebaserc` diarahkan ke project Firebase `myflowgen`.

### Diperbaiki
- Seluruh objek `import.meta.env` sebelumnya tertanam di bundle produksi (termasuk `VITE_APPCHECK_DEBUG_TOKEN` bila diisi). Sekarang variabel diakses langsung sehingga hanya nilai yang dipakai ikut di-build dan token debug hanya ada di mode dev.

## [1.1.0] - 2026-11-08

### Ditambahkan
- **Gambar referensi multimodal**: gambar produk/karakter yang diunggah sebagai file ikut dikirim ke Gemini pada Panggilan 2 (maks 6, diperkecil ke 1024 px, berlabel per produk/karakter) agar Visual Bible dan Character Master Description sesuai gambar. Opsi "Kirim gambar referensi lokal ke AI" di Langkah 8 (default aktif).
- **Mode Flow berbasis gambar**: pada mode "Gambar ke video" dan "Frame awal-akhir", Panggilan 3 dan regenerasi juga membuat prompt gambar frame awal (dan frame akhir), sementara prompt Flow difokuskan pada gerakan. Frame tampil di kartu prompt dengan tombol salin dan ikut diekspor ke Markdown/TXT.
- **Perbaikan otomatis Prompt Linter** (tanpa AI) untuk L02, L03, L04, L07, L10: tombol "Perbaiki" per peringatan dan "Perbaiki semua"; hasil disimpan sebagai versi baru.
- **Estimasi biaya** sebelum generate (jumlah panggilan, token input, maks token output, jumlah gambar) di halaman Konsep, Naskah, dan Prompt.
- **Uji skema JSON** per key di AI Provider: satu panggilan kecil dengan `responseSchema` untuk membuktikan format JSON + konfigurasi thinking diterima model.
- **Cadangan perubahan saat tab ditutup**: perubahan yang belum tersimpan ditulis ke localStorage secara sinkron lalu dipulihkan dan disimpan saat project dibuka lagi.
- Konfirmasi browser sebelum reload/menutup tab saat vault mode sesi memiliki key.
- Skrip `pnpm test:rules:emu` (menjalankan emulator + tes rules dalam satu perintah).

### Diubah
- `thinkingConfig` per keluarga model (2.5 Flash: 0, 2.5 Pro: 128, Gemini 3: level low); bila model menolak, request diulang sekali tanpa konfigurasi tersebut.
- `MAX_OUTPUT_TOKENS` dinaikkan (konsep 8192, naskah/prompt 16384, regen 4096, asisten 2048).
- SDK Firebase dimuat secara lazy: Mode Demo tidak lagi mengunduh ±595 KB Firebase.
- CSP: `https://accounts.google.com` ditambahkan ke `frame-src` untuk Google Sign-in.
- Lokasi "Kustom" di Langkah 7 memakai state UI, bukan nilai spasi palsu di data.

## [1.0.0] - 2026-11-08

### Ditambahkan
- Scaffold Vite + React + TS, Tailwind, komponen gaya shadcn, ESLint (pembatas impor UI/vault/provider, larangan `fetch` di luar provider, larangan `dangerouslySetInnerHTML`), Prettier, Vitest, `CLAUDE.md`, `docs/`.
- `constants.ts`, `enums.ts`, skrip `check:secrets`.
- Firebase Auth (email/password, Google), rute terlindungi, App Check, cache Firestore persisten multi-tab, konfigurasi emulator; Mode Demo Lokal tanpa Firebase.
- `firestore.rules`, indeks, header keamanan Hosting (CSP), tes rules.
- Skema Zod lengkap dan peta W/P/O.
- Lapisan data: converter Timestamp, repositori brand/project/dokumen/scene/template/library, autosave debounce per dokumen, indikator simpan, banner konflik, pemangkasan versi > 800 KB.
- Layout, navigasi sidebar/bottom bar, top bar (vault, key aktif, status simpan), Dashboard.
- Brand Profile, Brief wizard 8 langkah + Review, preset, panel kelengkapan.
- Vault terenkripsi (PBKDF2 + AES-GCM), mode sesi, auto-lock, lockout bertahap, ganti passphrase/mode.
- Provider Manager, `geminiProvider`, AI Router (cooldown per project, retry terbatas, usage lokal), alur tes key & pilih model.
- `extractJson`, `toGeminiSchema`, perbaikan JSON satu kali.
- Pipeline 3 panggilan, layar Konsep, Naskah, Storyboard + Bible, Prompt (salin/edit/versi/approve/regenerate).
- Prompt Linter L01–L13, Production Tracker, Panduan CapCut, Export Center (Markdown/TXT/Clipboard).
- Fase 2: AI Brief Assistant, varian Cinematic/Premium, perbandingan & pemulihan versi, Brief Template, duplikat project, CapCut mendalam, statistik usage, drag-and-drop scene, preset tambahan, toggle linter per project, E2E Playwright.
- Fase 3: Prompt Library, import/export project JSON, perbandingan versi berdampingan, peringatan anggaran harian & audit read/write.

### Diperbaiki
- Regenerasi scene tidak lagi bisa menimpa riwayat versi bila output AI memuat field `versions`.
