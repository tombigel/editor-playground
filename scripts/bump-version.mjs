#!/usr/bin/env node
/**
 * bump-version.mjs
 *
 * Usage: node scripts/bump-version.mjs [subsystem] [level]
 *   subsystem: project | document | api | editor | all
 *   level:     patch | minor | major
 *
 * Updates src/lib/version.ts and (when project/all) package.json.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import semver from 'semver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const versionFile = resolve(root, 'src/lib/version.ts');
const packageFile = resolve(root, 'package.json');

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

// Keep package.json version in sync with PROJECT_VERSION
if (targets.includes('project')) {
  const match = content.match(/export const PROJECT_VERSION = '([^']+)';/);
  if (match) {
    const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
    pkg.version = match[1];
    writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`package.json version → ${match[1]}`);
  }
}
