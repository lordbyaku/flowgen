# Keputusan Implementasi

Dicatat sesuai aturan 18.1 (spesifikasi ambigu → pilih opsi paling sederhana yang memenuhi akseptasi).

| # | Topik | Keputusan | Alasan |
|---|---|---|---|
| D01 | Mode Demo Lokal | Bila `VITE_DEMO_MODE=true` **atau** konfigurasi Firebase kosong, aplikasi memakai backend IndexedDB lokal (`avps-demo`) dan login demo. | Agar aplikasi dapat dicoba/di-review tanpa project Firebase. Abstraksi `DataBackend` membuat repo tetap satu-satunya pintu data; Firestore tetap backend produksi. |
| D02 | Brand Profile | Field: nama, industri, tagline, deskripsi, warna (≤6), deskripsi logo, tone of voice, target pasar, website, sosial, do/don't. | PRD merujuk "Bagian 4.3 Bagian I" yang tidak ada di dokumen. |
| D03 | Komponen UI | Komponen gaya shadcn ditulis tangan di `src/components/ui`; Radix hanya untuk Dialog, Tabs, Tooltip, Slot. Select/checkbox memakai elemen native. | Lebih sedikit dependensi, aksesibel secara default. |
| D04 | Wizard Brief | Field terikat langsung ke `projectStore` (autosave) dengan validasi inline per field; react-hook-form + Zod dipakai untuk form Login, Brand, Prompt Library. | Brief sangat besar dan diautosave per perubahan; RHF menambah lapisan sinkronisasi tanpa manfaat. |
| D05 | `briefStore` | Tidak dibuat; langkah wizard disimpan di URL `?step=` dan `project.step`. | Hindari state ganda. |
| D06 | Enum W opsional di skema | `objective`, `realism`, `style`, `tone` opsional di Zod; kewajiban ditegakkan skor kelengkapan (blockers). | Draft yang belum lengkap tetap valid tersimpan. |
| D07 | Mode vault sesi | Metadata key juga hanya di memori (bukan hanya plaintext). Meta vault (routing, cooldown) tetap di IndexedDB. | "Tanpa cipher di IndexedDB" paling sederhana dipenuhi dengan tidak menyimpan record key sama sekali. |
| D08 | UI → vault | UI boleh impor `@/vault/vaultStore` (fasad), tidak boleh `db`/`crypto`/`keyRepository`/`previewRepo`. Pratinjau gambar & usage diekspos lewat fasad. | Aturan "UI tidak boleh impor vault langsung" butuh satu pintu untuk dialog unlock. |
| D09 | Versi scene | `versions[]` menyimpan snapshot state (terbaru di depan, maks 5) setiap kali prompt dibuat/diedit/diregenerasi; Pulihkan memakai snapshot lengkap. | Memenuhi P2-03 (pulihkan tanpa mengubah scene lain). |
| D10 | Panggilan 3 | Scene yang sudah di-approve **dan** sudah punya prompt dilewati saat "Buat ulang". Batch gagal di tengah: batch sukses tetap disimpan dan pengguna diberi peringatan. | "Regenerasi tidak mengubah scene yang di-approve" + "output sukses selalu dipertahankan". |
| D11 | Tes Generate | Bila model "thinking" menghabiskan 8 token (MAX_TOKENS), key tetap dianggap berfungsi. | Batas 8 token dari spesifikasi bisa memotong output model 2.5. |
| D12 | Konflik multi-tab | `updatedAt` ditetapkan klien sebelum menulis agar snapshot milik sendiri tidak memicu banner konflik. | Backend lokal memancarkan snapshot sinkron. |
| D13 | Dependensi tambahan | `@radix-ui/*` (bagian shadcn), `@dnd-kit/*` (P2-07, disebut di PRD), `@playwright/test` (P2-08), `@testing-library/user-event`, `@types/node`. | Semua tersirat di PRD. |
| D14 | Vitest config | `vitest.config.ts` terpisah dari `vite.config.ts`. | Vitest 2 membawa tipe Vite 5; menyatukan config membuat `tsc -b` gagal. |
| D15 | E2E browser | `PW_CHANNEL=msedge|chrome` untuk memakai browser terpasang. | Tanpa perlu `playwright install`. |
| D16 | Character Bible tersimpan | Diambil dari dokumen `bibles` project terbaru (≤20) saat pengguna membuka dialog. | Tidak ada koleksi global Character Bible di skema Firestore 13/25.2. |
| D17 | Audit Firestore (P3-04) | Penghitung read/write per hari lokal di `localStorage` (hanya angka). | Tanpa backend; cukup sebagai indikator kuota Spark. |
| D18 | CSP | Tambah `https://content-firebaseappcheck.googleapis.com` ke `connect-src`. | Endpoint token App Check reCAPTCHA v3. |
| D19 | Gambar ke AI | Hanya gambar **lokal** yang dikirim (URL tidak bisa diambil: `fetch` hanya boleh di provider dan dibatasi CSP/CORS). Hanya Panggilan 2 yang menerima gambar; panggilan perbaikan JSON tidak mengirim ulang gambar. | Bible adalah sumber konsistensi; menghemat token di panggilan lain. |
| D20 | Prompt frame | Disimpan di `scene.framePrompts` (opsional) dan hanya untuk mode berbasis gambar; tidak di-lint. | Linter dirancang untuk prompt video. |
| D21 | Auto-fix linter | Hanya aturan yang aman secara deterministik (L02, L03, L04, L07, L10). L01/L08/L09/L11 butuh keputusan pengguna karena mengubah durasi atau naskah. | Tidak mengubah isi kreatif tanpa persetujuan. |
| D22 | Thinking | Konfigurasi per keluarga model + satu kali ulang tanpa `thinkingConfig` bila model menolak (400 berisi "thinking"). | Nama/parameter model berubah; tidak boleh memblokir pipeline. |
| D23 | Cadangan saat tab ditutup | Hanya field/dokumen yang dirty ditulis ke `localStorage` (`avps-pending-{pid}`); dibersihkan setelah tersimpan. Tidak pernah memuat key. | `beforeunload` tidak bisa menunggu penyimpanan async. |
| D24 | Lazy Firebase | `config/env.ts` tanpa SDK; `firestoreBackend` dan `firebaseAuth` diimpor dinamis. `manualChunks` untuk Firebase dihapus karena menarik `idb` (dipakai vault) ke chunk Firebase sehingga dimuat di awal. | Mode Demo lebih ringan. |
| D25 | CSP Google Sign-in | `https://accounts.google.com` ditambahkan ke `frame-src`. | Popup Google Sign-in. |
| D26 | Format key Gemini | Pola `AIza` + 35 karakter (lama) dan `AQ.` + ≥20 karakter base64url (baru, 2026). Validasi format hanya peringatan; sensor memakai pola longgar. `check:secrets` mengecualikan nilai persis `VITE_FIREBASE_API_KEY`. | Google mengganti format key; key web Firebase berformat `AIza` dan bersifat publik. |
| D27 | Key tersimpan di akun (v1.2) | **Keputusan pemilik**: mode vault `cloud` menyimpan key plaintext di `users/{uid}/private/aiKeys`, dilindungi rules pemilik-saja, tanpa passphrase. Opsi terenkripsi-dengan-passphrase ditawarkan dan ditolak demi kepraktisan. Mode lama tetap tersedia. Key di memori tab (seperti mode sesi) dan setiap perubahan ditulis ulang ke dokumen akun. Ekspor tetap tidak pernah memuat key. | Pemilik sering berganti device. Risiko yang diterima: kompromi akun/Console = key terbaca. Mitigasi: rules pemilik-saja, App Check, pembatasan key di Google Cloud. |
