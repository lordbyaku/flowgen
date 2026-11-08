# Item Verifikasi (Bagian 30)

Semua item diimplementasikan lewat konstanta atau satu file adapter. Status: **belum diverifikasi manual** kecuali disebut lain.

| Item | Lokasi di kode | Nilai awal | Cara verifikasi | Status |
|---|---|---|---|---|
| Batas durasi klip Google Flow | `MAX_SCENE_SEC` (`src/config/constants.ts`) | 8 | Buat satu klip, lihat durasi maks di Flow | Belum |
| Dialog/audio di prompt Flow | `MAX_DIALOGUE_WORDS`, `promptFormatRules` (`src/ai/director/sceneContext.ts`) | ±18 kata | Uji prompt dengan & tanpa dialog | Belum |
| Konsistensi karakter Flow | `output.flowMode` | Teks ke video | Cek fitur Flow terbaru | Belum |
| Format `responseSchema` Gemini | `src/ai/json/toGeminiSchema.ts` | Subset OpenAPI, tipe huruf besar, `propertyOrdering` | Satu panggilan nyata dengan skema Konsep | Belum (tes unit dengan fetch palsu lulus) |
| Model default | `DEFAULT_MODEL_HINT` | `gemini-2.5-flash` (fallback; utamakan `models.list`) | Lihat daftar model di AI Studio | Belum |
| Token "thinking" model 2.5 | `MAX_OUTPUT_TOKENS` | 4096/8192 | Bila sering `truncated`, naikkan nilai atau tambah `thinkingConfig` di `geminiProvider.ts` | Belum |
| Reset kuota harian | `QUOTA_RESET_TIMEZONE`, `cooldownManager.ts` | Tengah malam Pacific | Dokumentasi rate limit | Belum |
| Bentuk `RetryInfo` 429 | `geminiProvider.ts` (`parseRetryDelay`), deteksi `PerDay` | `retryDelay: "37s"` | Tangkap respons 429 nyata | Belum |
| Cache persisten Firestore multi-tab | `src/config/firebase.ts` | `persistentLocalCache` + `persistentMultipleTabManager` (SDK 11) | Buka 2 tab, edit offline | Belum |
| Domain CSP Google Sign-in & App Check | `firebase.json` | Daftar 19.6 + `content-firebaseappcheck` | Uji login & App Check di Hosting | Belum |
| Pembatasan referrer key Gemini | Konsol Google | Aktif bila didukung | Batasi key, uji dari domain Hosting | Belum |
| Ketentuan data free tier | Banner di Provider Manager | Peringatan privasi | Baca ketentuan terbaru | Belum |
