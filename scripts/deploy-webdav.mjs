import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

loadOptionalEnvFiles();

const buildDir = path.resolve(process.env.WEBDAV_BUILD_DIR ?? 'dist');
const rawBaseUrl = process.env.WEBDAV_URL;
const username = process.env.WEBDAV_USER;
const password = process.env.WEBDAV_PASS;

if (!rawBaseUrl || !username || !password) {
  console.error(
    'Missing WebDAV deploy configuration. Set WEBDAV_URL, WEBDAV_USER, and WEBDAV_PASS.',
  );
  process.exit(1);
}

const baseUrl = normalizeCollectionUrl(rawBaseUrl);
const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

async function main() {
  await assertLocalBuildDirectory(buildDir);

  console.log(`Deploying ${buildDir} to ${baseUrl}`);

  await ensureRemoteDirectory(baseUrl);
  await deleteRemoteContents(baseUrl);
  await uploadDirectory(buildDir, '');

  console.log('Deploy complete.');
}

async function uploadDirectory(localDir, remoteRelativePath) {
  const entries = await readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldSkipDeployEntry(entry.name)) {
      continue;
    }

    const localEntryPath = path.join(localDir, entry.name);
    const remoteEntryPath = remoteRelativePath
      ? `${remoteRelativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      await ensureRemoteDirectory(buildResourceUrl(remoteEntryPath, true));
      await uploadDirectory(localEntryPath, remoteEntryPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileBody = await readFile(localEntryPath);
    const fileUrl = buildResourceUrl(remoteEntryPath, false);

    await webdavRequest(fileUrl, {
      method: 'PUT',
      body: fileBody,
      expectedStatuses: [200, 201, 204],
    });

    console.log(`Uploaded ${remoteEntryPath}`);
  }
}

function shouldSkipDeployEntry(name) {
  return name === '.DS_Store';
}

async function deleteRemoteContents(collectionUrl) {
  const response = await webdavRequest(collectionUrl, {
    method: 'PROPFIND',
    headers: {
      Depth: 'infinity',
      'Content-Type': 'application/xml',
    },
    body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><propname/></propfind>',
    expectedStatuses: [207],
  });

  const xml = await response.text();
  const resourceUrls = parseDavResponseUrls(xml)
    .map((href) => normalizeResourceUrl(href, collectionUrl))
    .filter(Boolean)
    .filter((resourceUrl) => resourceUrl !== collectionUrl)
    .sort((left, right) => right.length - left.length);

  for (const resourceUrl of resourceUrls) {
    await webdavRequest(resourceUrl, {
      method: 'DELETE',
      expectedStatuses: [200, 204, 404],
    });
  }
}

async function ensureRemoteDirectory(collectionUrl) {
  const url = new URL(collectionUrl);
  const segments = url.pathname.split('/').filter(Boolean);
  let currentPath = '/';

  for (const segment of segments) {
    currentPath = `${currentPath}${encodeURIComponent(decodeURIComponent(segment))}/`;
    const currentUrl = `${url.origin}${currentPath}`;
    await webdavRequest(currentUrl, {
      method: 'MKCOL',
      expectedStatuses: [201, 301, 405],
    });
  }
}

async function webdavRequest(
  requestUrl,
  { method, headers = {}, body, expectedStatuses },
) {
  const response = await fetch(requestUrl, {
    method,
    headers: {
      Authorization: authHeader,
      ...headers,
    },
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
  const matches = xml.matchAll(/<[^>]*:?href[^>]*>(.*?)<\/[^>]*:?href>/gsi);
  return Array.from(matches, ([, href]) => decodeXmlEntities(href.trim()));
}

function normalizeCollectionUrl(input) {
  const url = new URL(input);
  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}

function normalizeResourceUrl(href, fallbackBaseUrl) {
  if (!href) {
    return null;
  }

  const resourceUrl = new URL(href, fallbackBaseUrl);
  const normalizedPath = resourceUrl.pathname.endsWith('/')
    ? resourceUrl.pathname
    : resourceUrl.pathname;

  resourceUrl.pathname = normalizedPath;
  return resourceUrl.toString();
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
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
