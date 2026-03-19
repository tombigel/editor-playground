import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'radix-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'src/**/*.e2e.test.ts',
      'src/**/*.e2e.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.e2e.test.{ts,tsx}',
        'src/**/tests/e2eServer.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
        'src/**/types/**',
        'src/model/defaults.ts',
        'src/app/App.tsx',
        'src/app/AppShell.tsx',
        'src/app/useAppPanels.ts',
        'src/app/useAppRuntime.ts',
        'src/app/useAppViewModel.ts',
        'src/app/useEditorEnvironment.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        statements: 60,
        branches: 55,
      },
    },
  },
});
