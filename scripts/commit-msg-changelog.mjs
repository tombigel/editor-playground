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
import { isReleaseBookkeepingOnly, updateUnreleasedChangelog } from './commit-msg-changelog-lib.mjs';

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

let committedFiles = [];
try {
  committedFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD', {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
} catch {
  process.exit(0);
}

if (isReleaseBookkeepingOnly(committedFiles)) {
  process.exit(0);
}

const changelog = readFileSync(changelogFile, 'utf8');
const result = updateUnreleasedChangelog(changelog, rawMsg);

if (result.missingUnreleasedHeading) {
  console.error('CHANGELOG.md: no [Unreleased] section found, skipping.');
  process.exit(0);
}

if (!result.changed) {
  process.exit(0);
}

writeFileSync(changelogFile, result.updatedChangelog, 'utf8');

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
