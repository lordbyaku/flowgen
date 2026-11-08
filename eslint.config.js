import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const VAULT_INTERNALS = ['@/vault/db', '@/vault/crypto', '@/vault/keyRepository', '@/vault/previewRepo'];
const AI_INTERNALS = ['@/ai/providers/*', '@/ai/router/*', '@/ai/director/*', '@/ai/json/*'];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Dilarang: teks hasil AI harus dirender sebagai teks.',
        },
        {
          selector: "MemberExpression[object.name=/^(localStorage|sessionStorage)$/] Literal[value=/key/i]",
          message: 'Jangan simpan key di localStorage/sessionStorage.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'fetch hanya boleh di src/ai/providers/geminiProvider.ts.' },
      ],
    },
  },
  {
    // Satu-satunya tempat fetch ke Gemini
    files: ['src/ai/providers/geminiProvider.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    // UI tidak boleh mengimpor provider/router/vault internal secara langsung
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/App.tsx', 'src/routes.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: AI_INTERNALS, message: 'UI hanya boleh memanggil aiService.' },
            { group: VAULT_INTERNALS, message: 'UI hanya boleh memakai vaultStore.' },
            { group: ['firebase/*'], message: 'Hanya src/data dan src/config/firebase.ts yang boleh memakai Firebase.' },
          ],
        },
      ],
    },
  },
  {
    // Exporter tidak boleh menyentuh vault sama sekali
    files: ['src/domain/exporters/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/vault/*', '**/vault/*'], message: 'Exporter tidak boleh mengimpor vault.' }] },
      ],
    },
  },
);
