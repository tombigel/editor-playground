#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const IMPORT_PATTERN = /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;
const SOURCE_FILE_PATTERN = /\.[cm]?[jt]sx?$/;
const IGNORED_FILE_PATTERN = /(?:^|\/)tests\/|\.test\.[cm]?[jt]sx?$|\.e2e\.test\.[cm]?[jt]sx?$/;

function listSourceFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name) && !IGNORED_FILE_PATTERN.test(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeToPosix(targetPath) {
  return targetPath.split(path.sep).join('/');
}

function resolveImportPath(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const basePath = path.resolve(path.dirname(filePath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.mjs'),
  ];

  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore unresolved candidates.
    }
  }

  return basePath;
}

function getImportViolations(filePath, forbiddenRoots) {
  const source = readFileSync(filePath, 'utf8');
  const violations = [];

  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) {
      continue;
    }

    const resolved = resolveImportPath(filePath, specifier);
    if (!resolved) {
      continue;
    }

    const normalized = normalizeToPosix(path.relative(rootDir, resolved));
    if (!normalized.startsWith('src/')) {
      continue;
    }

    if (forbiddenRoots.some((forbiddenRoot) => normalized === forbiddenRoot || normalized.startsWith(`${forbiddenRoot}/`))) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push({
        filePath,
        line,
        sourceLine: source.split('\n')[line - 1] ?? '',
      });
    }
  }

  return violations;
}

function collectViolations(scopeRoot, forbiddenRoots) {
  const files = listSourceFiles(path.join(srcDir, scopeRoot));
  return files.flatMap((filePath) => getImportViolations(filePath, forbiddenRoots));
}

const violations = [
  ...collectViolations('app', ['src/model', 'src/stage']),
  ...collectViolations('panels', ['src/model', 'src/stage']),
  ...collectViolations('model', ['src/editor', 'src/app', 'src/panels', 'src/stage', 'src/api']),
  ...collectViolations('sticky', ['src/editor', 'src/app', 'src/panels', 'src/stage', 'src/api']),
  ...collectViolations('site', ['src/editor', 'src/api', 'src/app', 'src/panels', 'src/stage']),
];

if (violations.length > 0) {
  for (const violation of violations) {
    const relativePath = normalizeToPosix(path.relative(rootDir, violation.filePath));
    console.error(`${relativePath}:${violation.line}:${violation.sourceLine}`);
  }
  process.exit(1);
}
