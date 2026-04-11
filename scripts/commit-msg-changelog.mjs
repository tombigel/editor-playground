#!/usr/bin/env node
/**
 * commit-msg-changelog.mjs
 *
 * Registered as the simple-git-hooks commit-msg hook.
 * Reads the first line of the commit message and appends it as a bullet
 * to the [Unreleased] section of CHANGELOG.md, then stages the file.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const changelogFile = resolve(root, 'CHANGELOG.md');

const msgFile = process.argv[2];
if (!msgFile) {
  process.exit(0);
}

const rawMsg = readFileSync(msgFile, 'utf8').trim();
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
execSync('git add CHANGELOG.md', { cwd: root, stdio: 'inherit' });
