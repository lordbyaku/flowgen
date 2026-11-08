import { defineConfig } from 'vitest/config';

// Tes Security Rules butuh Firestore emulator (Java). Jalankan: pnpm emulators lalu pnpm test:rules
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
  },
});
