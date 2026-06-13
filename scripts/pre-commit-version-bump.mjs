#!/usr/bin/env node
/**
 * pre-commit-version-bump.mjs
 *
 * Registered as the simple-git-hooks pre-commit hook.
 * Bumps all four subsystem versions at patch level and stages the changes
 * so the bump is included in the same commit being made.
 */

import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { isChangelogOnly } from './commit-msg-changelog-lib.mjs';

// Skip during post-commit changelog amend to avoid double-bumping
if (process.env.CHANGELOG_HOOK_AMEND) {
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

try {
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);

  if (isChangelogOnly(stagedFiles)) {
    process.exit(0);
  }

  execSync('node scripts/bump-version.mjs all patch', { cwd: root, stdio: 'inherit' });
  execSync('git add src/lib/version.ts package.json pnpm-lock.yaml CHANGELOG.md', {
    cwd: root,
    stdio: 'inherit',
  });
} catch (err) {
  console.error('pre-commit version bump failed:', err.message);
  process.exit(1);
}
