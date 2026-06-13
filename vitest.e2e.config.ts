import { defineConfig } from 'vitest/config';
import baseConfig from './vite.config';

export default defineConfig({
  ...baseConfig,
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    include: ['src/**/*.e2e.test.ts', 'src/**/*.e2e.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      enabled: false,
    },
  },
});
