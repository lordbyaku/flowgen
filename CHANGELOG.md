# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [Semantic Versioning](https://semver.org/lang/id/).

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
