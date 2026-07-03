import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Redundant belt-and-suspenders structural check on top of
 * `scripts/check-architecture.mjs`'s permanent `pnpm run build` gate (added
 * in Task 6, `collectViolations('ai', ['src/app'])`). Both must agree: this
 * plan's core safety guarantee is that `src/ai/` (orchestration) can never
 * import the dispatcher (`src/app`) and never calls `applyAiCommands`/
 * `applyAiDocumentCommands` directly — it only ever produces `DraftBatch`
 * data for a human to approve elsewhere.
 *
 * This test reads the raw source text of Task 7's two new files and asserts
 * neither forbidden pattern appears, independent of the script-level check.
 */

const AI_DIR = path.resolve(__dirname, '..');

const FILES_UNDER_TEST = ['toolRouter.ts', 'conversationStore.tsx'];

const APP_IMPORT_PATTERNS = [/from\s+['"]\.\.\/app/, /from\s+['"]\.\.\/\.\.\/app/, /from\s+['"]src\/app/];

const APPLY_REFERENCE_PATTERNS = [/\bapplyAiCommands\b/, /\bapplyAiDocumentCommands\b/];

/**
 * Strips `/* ... *\/` block comments and `// ...` line comments so the
 * applyAiCommands/applyAiDocumentCommands check only looks at live code.
 * These two names are *expected* to appear in doc comments explaining the
 * boundary (e.g. "this function never calls applyAiCommands") — that prose
 * is exactly what documents the guarantee. What must never appear is an
 * actual import or call-site reference in code.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('ai architecture boundary (toolRouter.ts / conversationStore.tsx)', () => {
  for (const fileName of FILES_UNDER_TEST) {
    const filePath = path.join(AI_DIR, fileName);
    const source = readFileSync(filePath, 'utf8');
    const codeOnly = stripComments(source);

    it(`${fileName} has no import from src/app`, () => {
      for (const pattern of APP_IMPORT_PATTERNS) {
        expect(pattern.test(source), `${fileName} must not match ${pattern}`).toBe(false);
      }
    });

    it(`${fileName} never references applyAiCommands or applyAiDocumentCommands in code (doc-comment mentions explaining the boundary are fine)`, () => {
      for (const pattern of APPLY_REFERENCE_PATTERNS) {
        expect(pattern.test(codeOnly), `${fileName} must not match ${pattern} outside of comments`).toBe(false);
      }
    });
  }
});
