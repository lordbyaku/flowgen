# Item Verifikasi (Bagian 30)

Semua item diimplementasikan lewat konstanta atau satu file adapter. Status: **belum diverifikasi manual** kecuali disebut lain.

| Item | Lokasi di kode | Nilai awal | Cara verifikasi | Status |
|---|---|---|---|---|
| Batas durasi klip Google Flow | `MAX_SCENE_SEC` (`src/config/constants.ts`) | 8 | Buat satu klip, lihat durasi maks di Flow | Belum |
| Dialog/audio di prompt Flow | `MAX_DIALOGUE_WORDS`, `promptFormatRules` (`src/ai/director/sceneContext.ts`) | ±18 kata | Uji prompt dengan & tanpa dialog | Belum |
| Konsistensi karakter Flow | `output.flowMode` | Teks ke video | Cek fitur Flow terbaru | Belum |
| Format `responseSchema` Gemini | `src/ai/json/toGeminiSchema.ts` | Subset OpenAPI, tipe huruf besar, `propertyOrdering` | Satu panggilan nyata dengan skema Konsep | Belum (tes unit dengan fetch palsu lulus) |
| Model default | `DEFAULT_MODEL_HINT` | `gemini-2.5-flash` (fallback; utamakan `models.list`) | Lihat daftar model di AI Studio | Belum |
| Token "thinking" | `THINKING_BUDGET`, `thinkingConfigFor()` di `geminiProvider.ts`, `MAX_OUTPUT_TOKENS` | 2.5 Flash 0 · 2.5 Pro 128 · Gemini 3 `thinkingLevel: low`; output 8192–16384 | Tombol **Uji skema JSON**, lalu satu alur Konsep → Prompt; perhatikan error `truncated` | Belum |
| Reset kuota harian | `QUOTA_RESET_TIMEZONE`, `cooldownManager.ts` | Tengah malam Pacific | Dokumentasi rate limit | Belum |
| Bentuk `RetryInfo` 429 | `geminiProvider.ts` (`parseRetryDelay`), deteksi `PerDay` | `retryDelay: "37s"` | Tangkap respons 429 nyata | Belum |
| Cache persisten Firestore multi-tab | `src/config/firebase.ts` | `persistentLocalCache` + `persistentMultipleTabManager` (SDK 11) | Buka 2 tab, edit offline | Belum |
| Domain CSP Google Sign-in & App Check | `firebase.json` | Daftar 19.6 + `content-firebaseappcheck` | Uji login & App Check di Hosting | Belum |
| Pembatasan referrer key Gemini | Konsol Google | Aktif bila didukung | Batasi key, uji dari domain Hosting | Belum |
| Ketentuan data free tier | Banner di Provider Manager | Peringatan privasi | Baca ketentuan terbaru | Belum |
| Format gambar multimodal | `geminiProvider.ts` (`inlineData`) | JPEG ≤1024 px, maks 6 | Panggilan 2 dengan gambar produk; cek Visual Bible menyebut detail gambar | Belum |
| Perkiraan token gambar | `TOKENS_PER_IMAGE` | 258 | Bandingkan `usageMetadata.promptTokenCount` | Belum |
| Alur frame awal/akhir di Flow | `frameModeRules()` di `sceneContext.ts` | Prompt gambar diam + prompt gerak | Buat gambar dari prompt frame, unggah ke Flow, nilai konsistensi | Belum |
| Format API key Gemini | `GEMINI_KEY_PATTERNS` di `src/ai/sanitize.ts`, `scripts/check-secrets.mjs` | `AIza…` (35) dan `AQ.…` (≥20) | Bandingkan dengan key baru di AI Studio; bila format berubah lagi, ubah pola di dua tempat itu | Format `AQ.` dikonfirmasi pemilik (2026-11-09) |
| Cara Flow menyebut karakter/tempat yang sudah dibuat (model Omni, Text to Video) | "Nama di Flow" di halaman Karakter & Tempat; `flowAssetRules()` di `sceneContext.ts` | Nama polos (mis. `Bu Sari`) | Buat satu karakter di Flow, tempel prompt scene, cek apakah karakter terpakai; bila Flow butuh awalan (mis. `@`), tulis di Nama di Flow lalu buat ulang prompt scene | Belum |
| Panjang prompt scene ideal untuk Omni | `flowAssetRules()` | 40–90 kata | Bandingkan hasil prompt pendek vs panjang | Belum |
