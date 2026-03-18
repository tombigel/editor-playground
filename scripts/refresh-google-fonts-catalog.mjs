import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';
const GOOGLE_FONTS_CAPABILITIES = ['VF', 'FAMILY_TAGS'];
const OUTPUT_PATH = path.resolve(process.cwd(), 'src/fonts/generated/googleFontsCatalog.json');
const REMOTE_SORT = 'popularity';

const apiKey = await resolveGoogleFontsApiKey();
if (!apiKey) {
  throw new Error('Missing GOOGLE_FONTS_API_KEY. Set GOOGLE_FONTS_API_KEY in your shell or .env.local before refreshing the bundled catalog.');
}

const url = new URL(GOOGLE_FONTS_API_URL);
url.searchParams.set('key', apiKey);
url.searchParams.set('sort', REMOTE_SORT);
for (const capability of GOOGLE_FONTS_CAPABILITIES) {
  url.searchParams.append('capability', capability);
}

const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Google Fonts request failed with ${response.status}.`);
}

const data = await response.json();
const catalog = {
  source: 'google-fonts',
  remoteSort: REMOTE_SORT,
  fetchedAt: new Date().toISOString(),
  families: (data.items ?? []).map((family, index) => normalizeGoogleFontFamily(family, index + 1)),
};

const nextContents = `${JSON.stringify(catalog, null, 2)}\n`;
const previousContents = await readFileIfExists(OUTPUT_PATH);

if (previousContents === nextContents) {
  console.log(`Bundled Google Fonts catalog is already current at ${path.relative(process.cwd(), OUTPUT_PATH)}.`);
  process.exit(0);
}

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, nextContents);

console.log(`Wrote ${catalog.families.length} Google font families to ${path.relative(process.cwd(), OUTPUT_PATH)}.`);
console.log(`Catalog fetched at ${catalog.fetchedAt}.`);

async function resolveGoogleFontsApiKey() {
  const env = {
    ...(await readEnvFile(path.resolve(process.cwd(), '.env'))),
    ...(await readEnvFile(path.resolve(process.cwd(), '.env.local'))),
    ...process.env,
  };

  return sanitizeString(env.GOOGLE_FONTS_API_KEY ?? env.VITE_GOOGLE_FONTS_API_KEY);
}

async function readEnvFile(filePath) {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return Object.fromEntries(
      contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separatorIndex = line.indexOf('=');
          const key = line.slice(0, separatorIndex).trim();
          const rawValue = line.slice(separatorIndex + 1).trim();
          return [key, stripWrappingQuotes(rawValue)];
        }),
    );
  } catch (error) {
    if (isMissingFileError(error)) {
      return {};
    }
    throw error;
  }
}

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

function isMissingFileError(error) {
  return Boolean(error) && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeGoogleFontFamily(family, rank) {
  const familyName = sanitizeString(family?.family) || `Unknown Font ${rank}`;
  const category = sanitizeString(family?.category) || 'sans-serif';
  const axes = normalizeAxes(family?.axes);
  const normalized = {
    family: familyName,
    category,
    subsets: dedupeAndSortStrings(family?.subsets ?? []),
    variants: dedupeAndSortVariants(family?.variants ?? []),
    axes,
    isVariable: Boolean(axes?.length),
    source: 'google-fonts',
    lastModified: sanitizeString(family?.lastModified) || undefined,
    popularityRank: rank,
    favorite: false,
    origin: 'added',
  };

  return {
    ...normalized,
    tags: dedupeAndSortStrings(family?.tags ?? []),
  };
}

function normalizeAxes(axes) {
  if (!Array.isArray(axes) || axes.length === 0) {
    return undefined;
  }

  const normalizedAxes = axes
    .filter(
      (axis) =>
        Boolean(axis) &&
        typeof axis.tag === 'string' &&
        Number.isFinite(axis.start) &&
        Number.isFinite(axis.end),
    )
    .map((axis) => ({
      tag: sanitizeString(axis.tag) || 'wght',
      min: axis.start,
      max: axis.end,
    }))
    .sort((left, right) => compareStrings(left.tag, right.tag));

  return normalizedAxes.length > 0 ? normalizedAxes : undefined;
}

function dedupeAndSortStrings(values) {
  return [...new Set(values.map(sanitizeString).filter(Boolean))].sort(compareStrings);
}

function dedupeAndSortVariants(values) {
  return [...new Set(values.map(sanitizeString).filter(Boolean))].sort(
    (left, right) => compareVariantWeight(left) - compareVariantWeight(right) || compareStrings(left, right),
  );
}

function compareVariantWeight(variant) {
  if (variant === 'regular' || variant === 'italic') {
    return 400;
  }
  const match = variant.match(/(\d{3})/);
  return match ? Number.parseInt(match[1], 10) : 400;
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compareStrings(left, right) {
  return sanitizeString(left).localeCompare(sanitizeString(right));
}
