# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan
- **Baris "Audio:" di setiap prompt scene**: ambience dan SFX dari storyboard (`sfxAmbient`), diakhiri "No background music." karena musik dan VO ditambahkan di CapCut. Bila dialog karakter mati, prompt juga menulis "No dialogue, no narration." agar Omni tidak mengarang ucapan.
- **"One continuous shot, no jump cuts."** di setiap prompt scene (sebelum aspect ratio), mengikuti panduan prompt Gemini Omni, agar satu klip tidak terpotong menjadi beberapa shot.
- **Opsi "Sertakan baris Avoid saat menyalin"** (Langkah 8, default Ya): bila Tidak, baris `Avoid:` tidak ikut di semua salinan prompt (scene, Salin Semua, frame, varian hook, Mode Produksi, Production Tracker) dan ekspor TXT/Markdown. Daftar negatif tetap tersimpan.

### Diubah
- **Batas durasi scene naik dari 8 ke 10 detik** mengikuti Gemini Omni 1.2 Flash, model default Google Flow sejak 5 November 2026 (klip 3–15 detik; paket gratis maks 10 detik). Berlaku untuk storyboard, linter L01, jumlah scene minimum, dan instruksi AI.
- **Batas kata dialog karakter kini mengikuti durasi scene** (durasi × 0,85 × kecepatan bicara; mis. 19 kata untuk 10 detik, 7 kata untuk 4 detik), menggantikan batas tetap 18 kata. Dipakai di linter L11, petunjuk Langkah 8, dan instruksi AI (naskah, prompt scene, regenerasi, perbaikan, varian hook).

## [1.4.0] - 2026-11-23

### Ditambahkan
- **Tahap "Posting"** (`/projects/:id/publish`): paket posting per platform brief (judul, 2–3 caption, maks 15 hashtag, 3 teks cover, komentar pin, dan tips posting) dari satu panggilan AI baru `publish_pack`. Ada tombol salin caption+hashtag, salin semua, dan bagian baru "Paket posting" di ekspor Markdown/JSON.
- **Tahap "Varian Hook"** (`/projects/:id/hooks`): 3 scene pembuka alternatif dengan gaya hook berbeda (panggilan AI baru `hook_variants`), lengkap dengan VO, teks overlay, prompt Flow, frame (mode gambar), alasan, dan status produksi. Durasi sama dengan scene 1 dan menyambung ke scene 2. "Buat ulang" mempertahankan varian yang sudah diproduksi. Ikut ke ekspor Markdown/JSON.
- **Perbaiki prompt dari hasil Flow**: tombol "Hasil Flow gagal?" di kartu Prompt dan Production Tracker. Pilih masalahnya (wajah/pakaian berubah, produk salah, teks/logo rusak, orang tambahan, gerak aneh, kamera, tempat, lainnya) dan tulis catatan, lalu panggilan AI baru `prompt_fix` menulis ulang prompt varian itu saja (+ frame dan negatif) tanpa mengubah naskah atau durasi. Versi lama masuk riwayat ("Perbaikan hasil Flow"), dan ringkasan perubahan tampil di kartu.
- **Mode Produksi untuk HP** (`/projects/:id/shoot`, tombol di Prompt dan Production Tracker): satu item per layar (aset Flow → scene → varian hook) dengan tombol salin besar (frame gambar dulu, lalu prompt video), "Sudah dibuat di Flow" yang menandai status lalu lanjut otomatis ke item berikutnya yang belum selesai, "Hasil gagal, perbaiki prompt", dan navigasi Sebelumnya/Lanjut di bawah layar. Posisi item tersimpan di URL.
- **Konten turunan** (kartu baru di Ringkasan project, tanpa panggilan AI, selalu menjadi project baru): **Seri** 2–5 bagian dengan angle berbeda (Bible dan aset Flow disalin, jadi karakter/tempat yang sudah dibuat dipakai lagi), **Versi pendek** dari scene terpilih (prompt dan status produksi disalin agar klip yang sudah dirender bisa dipakai ulang; timeline CapCut dan teks overlay dihitung ulang; peringatan bila hook/CTA tidak ikut), dan **Rasio lain** (storyboard disalin, prompt scene dikosongkan, prompt aset memakai rasio baru). Project turunan diberi lencana "Turunan" dan tautan ke sumbernya.
- **Catatan performa** (bagian baru di tahap Posting): catat hasil tiap video per platform dan versi (hook utama atau varian hook), berisi views, like, komentar, share, simpan, rata-rata durasi tonton, retensi 3 detik, URL, dan catatan (maks 30 per project). Ada engagement rate dan penanda "versi terbaik". Dashboard menampilkan ringkasan per gaya hook, angle, dan platform. Bila ada ≥2 hasil, ringkasannya dikirim sebagai data ke pembuatan konsep dan varian hook (bisa dimatikan di halaman Konsep).

### Diubah
- Tombol "Lanjutkan produksi" di Ringkasan project kini membuka Mode Produksi.
- Duplikat project tidak ikut menyalin catatan performa.
- Tes E2E smoke kini juga mencakup varian hook, Mode Produksi di ukuran HP, paket posting, catatan performa, dan bagian ekspor baru. Tanggal posting tampil tanpa jam.

## [1.3.1] - 2026-11-23

### Diperbaiki
- Tombol **Keluar** kini tersedia di layar HP: ikon keluar di header (sebelumnya hanya ada di sidebar yang tersembunyi di layar kecil).

## [1.3.0] - 2026-11-12

### Ditambahkan
- **Halaman "Karakter & Tempat"** (tahap baru antara Storyboard dan Prompt): prompt gambar referensi per karakter (seluruh badan + close-up wajah), per tempat (tanpa orang, maks 5 lokasi unik dari brief dan storyboard), dan produk. Disusun otomatis dari Character/Visual Bible tanpa panggilan AI; bisa diedit, dikembalikan ke otomatis, disalin, dan ditandai "sudah dibuat di Flow". Gambar referensi dari brief bisa diunduh untuk diunggah ke Flow.
- **"Nama di Flow"** per karakter/tempat/produk, dipakai persis di prompt scene.
- **Mode "Karakter & tempat dibuat di Flow (sebut nama)"** (Langkah 8, default untuk project baru): prompt scene (Panggilan 3 dan regenerasi) menyebut nama aset Flow + aksi, kamera, cahaya (40–90 kata), tanpa mengulang deskripsi wajah/tubuh. Mode lama "Deskripsi lengkap di setiap prompt" tetap tersedia.
- Urutan kerja karakter → tempat → produk → scene di halaman Prompt (banner progres aset), Salin/ekspor TXT, dan ekspor Markdown (bagian baru "Prompt aset Flow").
- Linter L02/L03 dan perbaikan otomatisnya memeriksa nama aset Flow saat mode aset aktif.

### Diubah
- Tombol di Storyboard kini mengarah ke "Karakter & Tempat" sebelum Prompt.

## [1.2.0] - 2026-11-09

### Ditambahkan
- **Mode vault "Tersimpan di akun (sinkron)"** (keputusan pemilik): API key disimpan di dokumen Firestore pribadi `users/{uid}/private/aiKeys` dan otomatis muncul di semua device setelah login, tanpa passphrase. Menjadi pilihan default saat menyiapkan vault. Status key (cooldown, terakhir dipakai, error) ikut tersinkron.
- Device baru tanpa vault lokal otomatis memuat key dari akun saat login.
- Ganti mode vault di Settings kini bisa ke tiga mode; pindah ke "Tersimpan di akun" menyalin key yang ada, pindah keluar menghapus salinan di akun.
- Peringatan keamanan khusus mode akun di dialog setup dan halaman AI Provider; Hapus Semua Key di mode akun menghapus key dari semua device.
- Tes vault mode akun dan tes Security Rules untuk dokumen key akun.

### Diubah
- Logout membersihkan semua key dari memori tab.
- Requirement PRD "API key tidak boleh ada di Firestore" diubah untuk mode akun (lihat `PRD.md` bagian Perubahan v1.2).

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
