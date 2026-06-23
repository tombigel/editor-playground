import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function syncPublicAssets() {
  const docsDir = path.join(rootDir, 'docs');
  const docsAssetSourceDir = path.join(docsDir, 'assets');
  const staticAssetSourceDir = path.join(rootDir, 'src', 'assets', 'static');
  const publicDir = path.join(rootDir, 'public');
  const rootAssetDir = publicDir;
  const helpDocAssetDir = path.join(publicDir, 'assets', 'help-docs');
  const helpDocDocsAssetDir = path.join(helpDocAssetDir, 'assets');
  const manifestPath = path.join(rootDir, 'src', 'panels', 'generated', 'helpDocsManifest.json');
  const rootAssetExtensions = new Set(['.png', '.svg']);

  const docFiles = (await readdir(docsDir))
    .filter((fileName) => fileName.toLowerCase().endsWith('.md'))
    .sort((left, right) => left.localeCompare(right));
  const rootAssetFiles = (await readdir(staticAssetSourceDir))
    .filter((fileName) => rootAssetExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));

  await mkdir(rootAssetDir, { recursive: true });
  await mkdir(helpDocAssetDir, { recursive: true });
  await rm(helpDocDocsAssetDir, { recursive: true, force: true });

  const manifest = [];
  const desiredHelpDocFileNames = new Set(docFiles);
  const desiredRootAssetFileNames = new Set(rootAssetFiles);

  for (const fileName of rootAssetFiles) {
    await copyFile(path.join(staticAssetSourceDir, fileName), path.join(rootAssetDir, fileName));
  }

  for (const fileName of docFiles) {
    const sourcePath = path.join(docsDir, fileName);
    const outputPath = path.join(helpDocAssetDir, fileName);
    const raw = await readFile(sourcePath, 'utf8');

    await copyFile(sourcePath, outputPath);

    manifest.push({
      path: `docs/${fileName}`,
      fileName,
      fullTitle: extractHelpDocTitle(raw, fileName),
      assetUrl: `/assets/help-docs/${fileName}`,
    });
  }

  // Copy root CHANGELOG.md into help-docs alongside the docs/ files
  const changelogSource = path.join(rootDir, 'CHANGELOG.md');
  const changelogRaw = await readFile(changelogSource, 'utf8');
  await copyFile(changelogSource, path.join(helpDocAssetDir, 'CHANGELOG.md'));
  desiredHelpDocFileNames.add('CHANGELOG.md');
  manifest.push({
    path: 'CHANGELOG.md',
    fileName: 'CHANGELOG.md',
    fullTitle: extractHelpDocTitle(changelogRaw, 'CHANGELOG.md'),
    assetUrl: '/assets/help-docs/CHANGELOG.md',
  });

  const docsAssetDirExists = await statPath(docsAssetSourceDir);
  if (docsAssetDirExists) {
    await cp(docsAssetSourceDir, helpDocDocsAssetDir, { recursive: true });
  }

  const existingRootAssetEntries = await readdir(rootAssetDir, { withFileTypes: true }).catch(() => []);

  for (const entry of existingRootAssetEntries) {
    if (!entry.isFile() || desiredRootAssetFileNames.has(entry.name)) {
      continue;
    }

    await rm(path.join(rootAssetDir, entry.name), { force: true });
  }

  const existingHelpDocAssetEntries = await readdir(helpDocAssetDir, { withFileTypes: true }).catch(() => []);

  for (const entry of existingHelpDocAssetEntries) {
    if (!entry.isFile() || desiredHelpDocFileNames.has(entry.name)) {
      continue;
    }

    await rm(path.join(helpDocAssetDir, entry.name), { force: true });
  }

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function extractHelpDocTitle(raw, fileName) {
  const headingMatch = raw.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1]
      .trim()
      .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1');
  }

  return fileName
    .replace(/\.md$/i, '')
    .replace(/[_-]+/g, ' ');
}

async function statPath(targetPath) {
  try {
    await readdir(targetPath);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncPublicAssets();
}
