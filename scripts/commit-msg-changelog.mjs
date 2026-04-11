#!/usr/bin/env node
/**
 * commit-msg-changelog.mjs
 *
 * Registered as the simple-git-hooks post-commit hook.
 * Reads the commit message from .git/COMMIT_EDITMSG, categorizes it by
 * conventional commit prefix, appends it as a bullet under the correct
 * heading in the [Unreleased] section of CHANGELOG.md, and amends the
 * commit to include the change.
 *
 * Uses CHANGELOG_HOOK_AMEND env var to prevent infinite recursion when
 * the amend re-triggers hooks.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

if (process.env.CHANGELOG_HOOK_AMEND) {
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const changelogFile = resolve(root, 'CHANGELOG.md');
const commitMsgFile = resolve(root, '.git', 'COMMIT_EDITMSG');

// Prefix → changelog heading mapping
const CATEGORY_MAP = {
  feat: '### Added',
  fix: '### Fixed',
  refactor: '### Changed',
  style: '### Changed',
  perf: '### Changed',
  docs: '### Changed',
  test: '### Changed',
  build: '### Changed',
  ci: '### Changed',
  chore: '### Changed',
};
const DEFAULT_CATEGORY = '### Changed';

let rawMsg;
try {
  rawMsg = readFileSync(commitMsgFile, 'utf8').trim();
} catch {
  process.exit(0);
}

const firstLine = rawMsg.split('\n')[0].trim();
if (!firstLine) {
  process.exit(0);
}

// Parse conventional commit: type(scope)!: description
const conventionalMatch = firstLine.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/);
const category = conventionalMatch
  ? (CATEGORY_MAP[conventionalMatch[1]] ?? DEFAULT_CATEGORY)
  : DEFAULT_CATEGORY;
const description = conventionalMatch ? conventionalMatch[2] : firstLine;

const changelog = readFileSync(changelogFile, 'utf8');
const unreleasedHeading = '## [Unreleased]';
const headingIndex = changelog.indexOf(unreleasedHeading);

if (headingIndex === -1) {
  console.error('CHANGELOG.md: no [Unreleased] section found, skipping.');
  process.exit(0);
}

const afterHeading = headingIndex + unreleasedHeading.length;
const nextSeparator = changelog.indexOf('\n---\n', afterHeading);
const sectionEnd = nextSeparator !== -1 ? nextSeparator : changelog.length;

// Parse existing section content into category buckets
const sectionContent = changelog.slice(afterHeading, sectionEnd);
const buckets = new Map();
let currentBucket = null;

for (const line of sectionContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('### ')) {
    currentBucket = trimmed;
    if (!buckets.has(currentBucket)) {
      buckets.set(currentBucket, []);
    }
  } else if (trimmed.startsWith('- ') && currentBucket) {
    buckets.get(currentBucket).push(trimmed);
  }
}

// Add the new bullet to its category
if (!buckets.has(category)) {
  buckets.set(category, []);
}
buckets.get(category).push(`- ${description}`);

// Rebuild section with deterministic heading order
const headingOrder = ['### Added', '### Changed', '### Fixed'];
const sortedHeadings = [...buckets.keys()].sort(
  (a, b) => (headingOrder.indexOf(a) === -1 ? 99 : headingOrder.indexOf(a)) -
            (headingOrder.indexOf(b) === -1 ? 99 : headingOrder.indexOf(b)),
);

const lines = [];
for (const heading of sortedHeadings) {
  const bullets = buckets.get(heading);
  if (bullets.length > 0) {
    lines.push(heading);
    lines.push(...bullets);
    lines.push('');
  }
}

const updated =
  changelog.slice(0, afterHeading) +
  '\n\n' +
  lines.join('\n') +
  changelog.slice(sectionEnd);

writeFileSync(changelogFile, updated, 'utf8');

try {
  execSync('git add CHANGELOG.md', { cwd: root, stdio: 'inherit' });
  execSync('git commit --amend --no-edit', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CHANGELOG_HOOK_AMEND: '1' },
  });
} catch (err) {
  console.error('post-commit changelog amend failed:', err.message);
}
