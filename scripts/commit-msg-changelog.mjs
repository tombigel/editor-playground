#!/usr/bin/env node
/**
 * commit-msg-changelog.mjs
 *
 * Registered as the simple-git-hooks post-commit hook.
 * Reads the commit message from .git/COMMIT_EDITMSG, appends the first line
 * as a bullet to the [Unreleased] section of CHANGELOG.md, and amends the
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

const changelog = readFileSync(changelogFile, 'utf8');
const unreleasedHeading = '## [Unreleased]';
const headingIndex = changelog.indexOf(unreleasedHeading);

if (headingIndex === -1) {
  console.error('CHANGELOG.md: no [Unreleased] section found, skipping.');
  process.exit(0);
}

// Find the next separator or heading after [Unreleased]
const afterHeading = headingIndex + unreleasedHeading.length;
const nextSeparator = changelog.indexOf('\n---\n', afterHeading);
const insertPos = nextSeparator !== -1 ? nextSeparator : changelog.length;

// Build the bullet line
const bullet = `- ${firstLine}`;

// Get existing content between heading and separator
const sectionContent = changelog.slice(afterHeading, insertPos).trim();
const newSection = sectionContent
  ? `${sectionContent}\n${bullet}`
  : bullet;

const updated =
  changelog.slice(0, afterHeading) +
  '\n\n' +
  newSection +
  '\n\n' +
  changelog.slice(insertPos);

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
