import { defineConfig } from '@playwright/test';

// PW_CHANNEL=msedge atau chrome untuk memakai browser terpasang (tanpa `playwright install`).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  // Dev server memuat chunk lazy pertama kali dengan lambat.
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    channel: process.env.PW_CHANNEL || undefined,
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_DEMO_MODE: 'true' },
  },
});
