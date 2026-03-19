import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/**/*.d.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
      // Warn at 500 lines (consider splitting); see CLAUDE.md for 800-line hard limit.
      'max-lines': [
        'warn',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // Hard limit: error at 800 lines (overrides the 500-line warning for src files).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': [
        'error',
        { max: 800, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // Test files and e2e tests are exempt from max-lines.
  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'src/**/tests/**/*.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
    ],
    rules: {
      'max-lines': 'off',
    },
  },
  // Known large files from Phase 1 splits — scheduled for further splitting.
  {
    files: [
      'src/editor/editorMutations.ts',
      'src/panels/InspectorControls.tsx',
    ],
    rules: {
      'max-lines': [
        'warn',
        { max: 2000, skipBlankLines: true, skipComments: true },
      ],
    },
  },
);
