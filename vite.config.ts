import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// PrismJS language component files reference `Prism` as a bare global, but
// when Rollup bundles them into an ESM chunk they have no in-scope `Prism`
// variable. This plugin injects `import Prism from 'prismjs'` at the top of
// each component file so Rollup can resolve the reference correctly.
function prismGlobalsPlugin(): Plugin {
  return {
    name: 'inject-prism-global',
    transform(code, id) {
      if (
        id.includes('node_modules/prismjs/components/') &&
        !id.endsWith('prism-core.js') &&
        !code.startsWith("import Prism")
      ) {
        return { code: `import Prism from 'prismjs';\n${code}`, map: null };
      }
    },
  };
}

const devHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export default defineConfig({
  plugins: [react(), tailwindcss(), prismGlobalsPlugin()],
  server: {
    headers: devHeaders,
  },
  preview: {
    headers: devHeaders,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        experimentalMinChunkSize: 10_000,
        manualChunks: (id) => {
          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons-vendor';
          }
          if (
            id.includes('@radix-ui/react-dialog') ||
            id.includes('@radix-ui/react-select') ||
            id.includes('@radix-ui/react-slider') ||
            id.includes('@radix-ui/react-slot') ||
            id.includes('@radix-ui/react-switch')
          ) {
            return 'radix-vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.claude/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'src/**/*.e2e.test.ts',
      'src/**/*.e2e.test.tsx',
      '.claude/worktrees/**',
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
        'src/stage/stageRenderers/RichTextEditOverlay.tsx',
        'src/design-system/**/*.{ts,tsx}',
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
