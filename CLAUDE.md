# AI Video Prompt Studio
Personal web app (React + Vite + TS, Firebase Spark, Gemini API from browser).
Source of truth: PRD v1.3 + Bagian II (`PRD.md`). Task list: Bagian 28.

## Commands
pnpm dev | pnpm build | pnpm typecheck | pnpm lint | pnpm test | pnpm emulators
pnpm check:secrets | pnpm test:rules (butuh emulator) | pnpm test:e2e (PW_CHANNEL=msedge|chrome)

## Hard rules
- Never persist/log/export Gemini API keys. IndexedDB only, encrypted.
- All Gemini calls go through src/ai/providers/geminiProvider.ts via aiRouter.
- Zod schemas in src/schemas are the source of truth; infer types from them.
- UI text is Indonesian. Flow prompts are English. No raw HTML rendering.
- One task = one commit. Run typecheck, lint, test before each commit.
- If spec is ambiguous: choose simplest option, log in docs/DECISIONS.md.

## Conventions
- Feature folders under src/features/*. Shared UI under src/components/ui.
- Repositories (src/data/*) are the only code that talks to Firestore.
- Vault (src/vault/*) is the only code that touches IndexedDB keys.
- UI hanya boleh memakai `@/ai/aiService` dan `@/vault/vaultStore` (ditegakkan ESLint).

## Dokumentasi wajib (setiap perubahan)
- Setiap perubahan: tambah entri di `CHANGELOG.md` (Keep a Changelog + SemVer).
- Perubahan fitur: perbarui juga `README.md` (dan `PRD.md` bila requirement berubah).
- Saat versi naik: perbarui `package.json`, `APP_VERSION` di `src/config/constants.ts`, dan tabel versi README.
