#!/usr/bin/env node
/**
 * bump-version.mjs
 *
 * Usage: node scripts/bump-version.mjs [subsystem] [level]
 *   subsystem: project | document | api | editor | all
 *   level:     patch | minor | major
 *
 * Updates src/lib/version.ts and (when project/all) package.json/pnpm-lock.yaml.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import semver from 'semver';
import { getPnpmLockSyncCommand, syncPackageJsonVersion } from './bump-version-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const versionFile = resolve(root, 'src/lib/version.ts');
const packageFile = resolve(root, 'package.json');
const pnpmLockFile = resolve(root, 'pnpm-lock.yaml');

const SUBSYSTEM_MAP = {
  project: 'PROJECT_VERSION',
  document: 'DOCUMENT_MODEL_VERSION',
  api: 'API_VERSION',
  editor: 'EDITOR_VERSION',
};

const [, , subsystemArg, levelArg] = process.argv;

const validSubsystems = [...Object.keys(SUBSYSTEM_MAP), 'all'];
const validLevels = ['patch', 'minor', 'major'];

if (!validSubsystems.includes(subsystemArg) || !validLevels.includes(levelArg)) {
  console.error(
    `Usage: node scripts/bump-version.mjs [${validSubsystems.join('|')}] [${validLevels.join('|')}]`,
  );
  process.exit(1);
}

const targets =
  subsystemArg === 'all' ? Object.keys(SUBSYSTEM_MAP) : [subsystemArg];

let content = readFileSync(versionFile, 'utf8');

for (const target of targets) {
  const constName = SUBSYSTEM_MAP[target];
  const match = content.match(new RegExp(`export const ${constName} = '([^']+)';`));
  if (!match) {
    console.error(`Could not find ${constName} in ${versionFile}`);
    process.exit(1);
  }
  const current = match[1];
  const next = semver.inc(current, levelArg);
  if (!next) {
    console.error(`Invalid semver: ${current}`);
    process.exit(1);
  }
  content = content.replace(
    `export const ${constName} = '${current}';`,
    `export const ${constName} = '${next}';`,
  );
  console.log(`${constName}: ${current} → ${next}`);
}

writeFileSync(versionFile, content, 'utf8');

// --- Convert [Unreleased] to versioned entry on minor/major bumps ---
if (levelArg !== 'patch') {
  const changelogFile = resolve(root, 'CHANGELOG.md');
  const changelog = readFileSync(changelogFile, 'utf8');

  const pv = content.match(/PROJECT_VERSION = '([^']+)'/)[1];
  const dv = content.match(/DOCUMENT_MODEL_VERSION = '([^']+)'/)[1];
  const av = content.match(/API_VERSION = '([^']+)'/)[1];
  const ev = content.match(/EDITOR_VERSION = '([^']+)'/)[1];

  const unreleasedHeading = '## [Unreleased]';
  const today = new Date().toISOString().slice(0, 10);
  const versionedHeading = `## [${pv}] — ${today}`;
  const versionLine = `\nDocument: ${dv} · API: ${av} · Editor: ${ev}`;

  if (changelog.includes(unreleasedHeading)) {
    const updated = changelog.replace(
      unreleasedHeading,
      `${unreleasedHeading}\n\n---\n\n${versionedHeading}${versionLine}`,
    );
    writeFileSync(changelogFile, updated, 'utf8');
    console.log(`CHANGELOG.md: [Unreleased] → ${versionedHeading}`);
  }
}

// Keep package.json version in sync with PROJECT_VERSION
if (targets.includes('project')) {
  const match = content.match(/export const PROJECT_VERSION = '([^']+)';/);
  if (match) {
    const projectVersion = match[1];

    writeFileSync(
      packageFile,
      syncPackageJsonVersion(readFileSync(packageFile, 'utf8'), projectVersion),
      'utf8',
    );
    console.log(`package.json version → ${projectVersion}`);

    if (existsSync(pnpmLockFile)) {
      execSync(getPnpmLockSyncCommand(), { cwd: root, stdio: 'inherit' });
      console.log(`pnpm-lock.yaml refreshed via pnpm for ${projectVersion}`);
    }
  }
}
