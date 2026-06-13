#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const auditedSourceFiles = [
  'src/api/documentApi.ts',
  'src/api/editorApi.ts',
  'src/api/pageApi.ts',
  'src/api/fontApi.ts',
  'src/api/siteApi.ts',
  'src/api/editorViewApi.ts',
  'src/api/dragDropApi.ts',
  'src/api/showcaseTourApi.ts',
  'src/api/animationApi.ts',
  'src/api/textConversion.ts',
  'src/api/textMerge.ts',
  'src/api/textMarkdown.ts',
  'src/model/defaultFactories.ts',
  'src/model/types/index.ts',
  'src/model/types/site.ts',
  'src/animations/types/index.ts',
];

const ignoredExports = new Set([
  'InteractConfig',
]);

const apiDocs = readdirSync(path.join(rootDir, 'docs'))
  .filter((fileName) => /^API(?:_|\.md)/.test(fileName))
  .map((fileName) => readFileSync(path.join(rootDir, 'docs', fileName), 'utf8'))
  .join('\n');

const missing = [];

for (const sourceFile of auditedSourceFiles) {
  const source = readFileSync(path.join(rootDir, sourceFile), 'utf8');
  for (const exportName of collectExportNames(source)) {
    if (ignoredExports.has(exportName)) {
      continue;
    }
    if (!apiDocs.includes(exportName)) {
      missing.push({ sourceFile, exportName });
    }
  }
}

if (missing.length > 0) {
  console.error('API docs are missing exported names:');
  for (const { sourceFile, exportName } of missing) {
    console.error(`- ${sourceFile}: ${exportName}`);
  }
  process.exit(1);
}

function collectExportNames(source) {
  const names = new Set();

  for (const match of source.matchAll(/^export\s+(?:async\s+)?(?:function|const|type|interface|class|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1]);
  }

  for (const match of source.matchAll(/^export\s+(?:type\s+)?\{([\s\S]*?)\}\s*(?:from\s*['"][^'"]+['"])?;/gm)) {
    for (const rawPart of match[1].split(',')) {
      const cleaned = rawPart
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/g, '')
        .trim()
        .replace(/^type\s+/, '');
      if (!cleaned) {
        continue;
      }
      const aliasMatch = cleaned.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
      const directMatch = cleaned.match(/^([A-Za-z_$][\w$]*)$/);
      const exportName = aliasMatch?.[1] ?? directMatch?.[1];
      if (exportName) {
        names.add(exportName);
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}
