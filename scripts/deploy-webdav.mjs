import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

loadOptionalEnvFiles();

const buildDir = path.resolve(process.env.WEBDAV_BUILD_DIR ?? 'dist');
const origin = process.env.WEBDAV_URL;
// BASE_PATH is optional. When unset, WEBDAV_URL is treated as the full target
// directory (the existing editor-playground convention, e.g. .../editor/).
const basePath = process.env.BASE_PATH;
const username = process.env.WEBDAV_USER;
const password = process.env.WEBDAV_PASS;
// WEBDAV_FORCE=1 re-uploads every file, ignoring the remote manifest.
const force = process.env.WEBDAV_FORCE === '1';

if (!origin || !username || !password) {
  console.error(
    'Missing WebDAV deploy configuration. Set WEBDAV_URL, WEBDAV_USER, and WEBDAV_PASS.',
  );
  process.exit(1);
}

// Target collection = WEBDAV_URL (host/origin) + optional BASE_PATH.
const rawBaseUrl = basePath ? new URL(basePath, origin).toString() : origin;
const baseUrl = normalizeCollectionUrl(rawBaseUrl);
const basePathname = decodeURIComponent(new URL(baseUrl).pathname); // e.g. /editor/
const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

// A small manifest of path -> content hash, stored at the remote root. It lets
// each deploy upload only files that actually changed and delete only files
// that were removed locally instead of wiping and re-uploading everything.
const MANIFEST = '.deploy-manifest.json';

async function main() {
  await assertLocalBuildDirectory(buildDir);
  console.log(`Syncing ${buildDir} -> ${baseUrl}`);

  await ensureRemoteDirectory(baseUrl);

  const local = await buildLocalManifest(buildDir); // Map<rel, { abs, hash }>
  const remoteFiles = await listRemoteFiles(); // Set<rel>
  const remoteManifest = force ? {} : await fetchRemoteManifest(); // { rel: hash }

  // Upload new or changed files; skip ones whose hash already matches.
  const toUpload = [];
  let unchanged = 0;
  for (const [rel, info] of local) {
    const known = remoteManifest[rel];
    if (!force && known === info.hash && remoteFiles.has(rel)) {
      unchanged++;
    } else {
      toUpload.push(rel);
    }
  }

  // Delete files that exist remotely but are no longer part of the build.
  const localPaths = new Set(local.keys());
  const toDelete = [...remoteFiles].filter((rel) => rel !== MANIFEST && !localPaths.has(rel));

  const ensuredDirs = new Set();
  for (const rel of toUpload) {
    await ensureParentDirs(rel, ensuredDirs);
    await webdavRequest(buildResourceUrl(rel, false), {
      method: 'PUT',
      body: await readFile(local.get(rel).abs),
      expectedStatuses: [200, 201, 204],
    });
    console.log(`  + ${rel}`);
  }

  for (const rel of toDelete) {
    await webdavRequest(buildResourceUrl(rel, false), {
      method: 'DELETE',
      expectedStatuses: [200, 204, 404],
    });
    console.log(`  - ${rel}`);
  }

  // Record the new state so the next deploy can diff against it.
  const manifestBody = JSON.stringify(
    Object.fromEntries([...local].map(([rel, info]) => [rel, info.hash])),
  );
  await webdavRequest(buildResourceUrl(MANIFEST, false), {
    method: 'PUT',
    body: manifestBody,
    headers: { 'Content-Type': 'application/json' },
    expectedStatuses: [200, 201, 204],
  });

  console.log(
    `Done. Uploaded ${toUpload.length}, deleted ${toDelete.length}, unchanged ${unchanged}.`,
  );
}

// --- local side -----------------------------------------------------------

async function buildLocalManifest(dir, prefix = '', out = new Map()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (shouldSkipDeployEntry(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await buildLocalManifest(abs, rel, out);
    } else if (entry.isFile()) {
      const hash = createHash('sha1').update(await readFile(abs)).digest('hex');
      out.set(rel, { abs, hash });
    }
  }
  return out;
}

function shouldSkipDeployEntry(name) {
  return name === '.DS_Store';
}

// --- remote side ----------------------------------------------------------

async function listRemoteFiles() {
  const response = await webdavRequest(baseUrl, {
    method: 'PROPFIND',
    headers: { Depth: 'infinity', 'Content-Type': 'application/xml' },
    body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><propname/></propfind>',
    expectedStatuses: [207, 404],
  });
  const files = new Set();
  if (response.status === 404) return files;

  for (const href of parseDavResponseUrls(await response.text())) {
    const rel = relativeToBase(href);
    if (rel && !rel.endsWith('/')) files.add(rel); // skip the collection entries
  }
  return files;
}

async function fetchRemoteManifest() {
  const response = await webdavRequest(buildResourceUrl(MANIFEST, false), {
    method: 'GET',
    expectedStatuses: [200, 404],
  });
  if (response.status === 404) return {};
  try {
    return JSON.parse(await response.text());
  } catch {
    return {}; // corrupt/missing manifest -> treat as a full upload
  }
}

function relativeToBase(href) {
  const pathname = decodeURIComponent(new URL(href, baseUrl).pathname);
  if (!pathname.startsWith(basePathname)) return null;
  const rel = pathname.slice(basePathname.length);
  return rel === '' ? null : rel;
}

// MKCOL each ancestor directory of `rel` once per run.
async function ensureParentDirs(rel, ensured) {
  const parts = rel.split('/').slice(0, -1);
  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    if (ensured.has(acc)) continue;
    await webdavRequest(buildResourceUrl(acc, true), {
      method: 'MKCOL',
      expectedStatuses: [201, 301, 405],
    });
    ensured.add(acc);
  }
}

async function ensureRemoteDirectory(collectionUrl) {
  const url = new URL(collectionUrl);
  const segments = url.pathname.split('/').filter(Boolean);
  let currentPath = '/';
  for (const segment of segments) {
    currentPath = `${currentPath}${encodeURIComponent(decodeURIComponent(segment))}/`;
    await webdavRequest(`${url.origin}${currentPath}`, {
      method: 'MKCOL',
      expectedStatuses: [201, 301, 405],
    });
  }
}

// --- shared helpers -------------------------------------------------------

async function webdavRequest(requestUrl, { method, headers = {}, body, expectedStatuses }) {
  const response = await fetch(requestUrl, {
    method,
    headers: { Authorization: authHeader, ...headers },
    body,
  });
  if (!expectedStatuses.includes(response.status)) {
    const responseBody = await response.text();
    throw new Error(
      `${method} ${requestUrl} failed with ${response.status} ${response.statusText}\n${responseBody}`,
    );
  }
  return response;
}

async function assertLocalBuildDirectory(localDir) {
  const buildStats = await stat(localDir).catch(() => null);
  if (!buildStats?.isDirectory()) {
    throw new Error(`Build directory not found: ${localDir}`);
  }
}

function buildResourceUrl(relativePath, isDirectory) {
  const encodedPath = relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return new URL(`${encodedPath}${isDirectory ? '/' : ''}`, baseUrl).toString();
}

function parseDavResponseUrls(xml) {
  const matches = xml.matchAll(/<[^>]*:?href[^>]*>(.*?)<\/[^>]*:?href>/gis);
  return Array.from(matches, ([, href]) => decodeXmlEntities(href.trim()));
}

function normalizeCollectionUrl(input) {
  const url = new URL(input);
  if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
  return url.toString();
}

function decodeXmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function loadOptionalEnvFiles() {
  for (const envFile of ['.env', '.env.local']) {
    try {
      process.loadEnvFile(envFile);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
