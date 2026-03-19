import { defineConfig } from 'vite';
import baseConfig from './vite.config';

export default defineConfig({
  ...baseConfig,
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    include: ['e2e/**/*.e2e.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    coverage: {
      enabled: false,
    },
  },
});
