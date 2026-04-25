import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

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

const plugins: Plugin[] = [react(), tailwindcss(), prismGlobalsPlugin()];
if (process.env.ANALYZE === '1') {
  plugins.push(
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }) as Plugin,
  );
}

export default defineConfig({
  plugins,
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
    target: 'es2022',
    sourcemap: 'hidden',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('/src/components/ui/')) {
            return 'ui-shared';
          }

          if (!id.includes('node_modules')) return;

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('/node_modules/@radix-ui/')) {
            return 'radix-vendor';
          }

          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons-vendor';
          }

          if (id.includes('/node_modules/prismjs/')) {
            return 'prism-vendor';
          }

          if (
            id.includes('/node_modules/slate/') ||
            id.includes('/node_modules/slate-react/') ||
            id.includes('/node_modules/slate-history/') ||
            id.includes('/node_modules/is-plain-object/') ||
            id.includes('/node_modules/immer/')
          ) {
            return 'slate-vendor';
          }

          if (
            id.includes('/node_modules/react-markdown/') ||
            id.includes('/node_modules/remark-') ||
            id.includes('/node_modules/micromark') ||
            id.includes('/node_modules/mdast-') ||
            id.includes('/node_modules/unified/') ||
            id.includes('/node_modules/unist-')
          ) {
            return 'markdown-vendor';
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
