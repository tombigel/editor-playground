import type { DocumentFontFamily, FontAxis } from '../model/types';
import type {
  GoogleFontFamily,
  GoogleFontsApiFamily,
  GoogleFontsApiResponse,
  GoogleFontsCatalog,
  GoogleFontsFetchOptions,
  GoogleFontsQuery,
  GoogleFontsRemoteSort,
} from './types';

const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';
const GOOGLE_FONTS_CAPABILITIES: GoogleFontsApiCapability[] = ['VF', 'FAMILY_TAGS'];

type GoogleFontsApiCapability = 'VF' | 'FAMILY_TAGS';

export async function fetchGoogleFontCatalog(options: GoogleFontsFetchOptions = {}): Promise<GoogleFontsCatalog> {
  const apiKey = options.apiKey ?? import.meta.env.VITE_GOOGLE_FONTS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GOOGLE_FONTS_API_KEY.');
  }

  const remoteSort = options.sort ?? 'popularity';
  const url = new URL(GOOGLE_FONTS_API_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('sort', remoteSort);
  for (const capability of GOOGLE_FONTS_CAPABILITIES) {
    url.searchParams.append('capability', capability);
  }

  const response = await fetch(url.toString(), { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Google Fonts request failed with ${response.status}.`);
  }
  const data = (await response.json()) as GoogleFontsApiResponse;

  return {
    source: 'google-fonts',
    remoteSort,
    fetchedAt: new Date().toISOString(),
    families: (data.items ?? []).map((family, index) => normalizeGoogleFontFamily(family, index + 1, remoteSort)),
  };
}

export function normalizeGoogleFontFamily(
  family: GoogleFontsApiFamily,
  rank?: number,
  remoteSort: GoogleFontsRemoteSort = 'popularity',
): GoogleFontFamily {
  const familyName = sanitizeString(family.family) || `Unknown Font${rank ? ` ${rank}` : ''}`;
  const category = sanitizeString(family.category) || 'sans-serif';
  const axes = normalizeAxes(family.axes);
  const normalized: DocumentFontFamily = {
    family: familyName,
    category,
    subsets: dedupeAndSortStrings(family.subsets ?? []),
    variants: dedupeAndSortVariants(family.variants ?? []),
    axes,
    isVariable: Boolean(axes?.length),
    source: 'google-fonts',
    lastModified: sanitizeString(family.lastModified),
    popularityRank: remoteSort === 'popularity' ? rank : undefined,
    favorite: false,
    origin: 'added',
  };

  return {
    ...normalized,
    tags: dedupeAndSortStrings(family.tags ?? []),
  };
}

export function getGoogleFontFamily(catalog: GoogleFontsCatalog, familyName: string) {
  return catalog.families.find((family) => family.family === familyName);
}

export function searchGoogleFontFamilies(catalog: GoogleFontsCatalog, query: GoogleFontsQuery) {
  return queryGoogleFontFamilies(catalog.families, query);
}

export function filterGoogleFontFamilies(families: GoogleFontFamily[], query: GoogleFontsQuery) {
  const usedSet = new Set(query.usedFamilies ?? []);
  const favoriteSet = new Set(query.favoriteFamilies ?? []);
  const searchTerm = sanitizeString(query.search).toLowerCase();
  const requestedSubsets = new Set((query.subsets ?? []).map((subset) => sanitizeString(subset).toLowerCase()).filter(Boolean));
  const requestedCategory = sanitizeString(query.category).toLowerCase();

  return families.filter((family) => {
    const familyName = sanitizeString(family.family);
    const category = sanitizeString(family.category);
    const subsets = dedupeAndSortStrings(family.subsets ?? []);
    const tags = dedupeAndSortStrings(family.tags ?? []);

    if (searchTerm) {
      const haystack = [familyName, category, ...subsets, ...tags].join(' ').toLowerCase();
      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }
    if (requestedSubsets.size > 0 && !subsets.some((subset) => requestedSubsets.has(subset.toLowerCase()))) {
      return false;
    }
    if (requestedCategory && category.toLowerCase() !== requestedCategory) {
      return false;
    }
    if (query.variableOnly && !family.isVariable) {
      return false;
    }
    if (query.usedOnly && !usedSet.has(familyName)) {
      return false;
    }
    if (query.favoritesOnly && !favoriteSet.has(familyName)) {
      return false;
    }
    return true;
  });
}

export function sortGoogleFontFamilies(families: GoogleFontFamily[], query: GoogleFontsQuery = {}) {
  const sort = query.sort ?? 'alpha';
  const usageCounts = query.usageCounts ?? {};
  const usedSet = new Set(query.usedFamilies ?? []);

  return [...families].sort((left, right) => {
    if (sort === 'used') {
      const usageDelta = (usageCounts[right.family] ?? 0) - (usageCounts[left.family] ?? 0);
      if (usageDelta !== 0) {
        return usageDelta;
      }
      const usedDelta = Number(usedSet.has(right.family)) - Number(usedSet.has(left.family));
      if (usedDelta !== 0) {
        return usedDelta;
      }
    }

    if (sort === 'language') {
      const languageDelta = compareSubsetKey(left.subsets, right.subsets);
      if (languageDelta !== 0) {
        return languageDelta;
      }
    }

    if (sort === 'popularity' || sort === 'trending') {
      const rankDelta = (left.popularityRank ?? Number.MAX_SAFE_INTEGER) - (right.popularityRank ?? Number.MAX_SAFE_INTEGER);
      if (rankDelta !== 0) {
        return rankDelta;
      }
    }

    if (sort === 'date') {
      const rightDate = Date.parse(right.lastModified ?? '');
      const leftDate = Date.parse(left.lastModified ?? '');
      if (Number.isFinite(rightDate) || Number.isFinite(leftDate)) {
        const dateDelta = (Number.isFinite(rightDate) ? rightDate : 0) - (Number.isFinite(leftDate) ? leftDate : 0);
        if (dateDelta !== 0) {
          return dateDelta;
        }
      }
    }

    if (sort === 'style') {
      const styleDelta = right.variants.length - left.variants.length;
      if (styleDelta !== 0) {
        return styleDelta;
      }
    }

    return compareStrings(left.family, right.family);
  });
}

export function queryGoogleFontFamilies(families: GoogleFontFamily[], query: GoogleFontsQuery = {}) {
  const filtered = filterGoogleFontFamilies(families, query);
  const sorted = sortGoogleFontFamilies(filtered, query);
  return query.limit ? sorted.slice(0, query.limit) : sorted;
}

function normalizeAxes(axes: GoogleFontsApiFamily['axes']): FontAxis[] | undefined {
  if (!axes || axes.length === 0) {
    return undefined;
  }

  return axes
    .filter(
      (axis): axis is NonNullable<GoogleFontsApiFamily['axes']>[number] =>
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
}

function dedupeAndSortStrings(values: unknown[]) {
  return [...new Set(values.map(sanitizeString).filter(Boolean))].sort(compareStrings);
}

function dedupeAndSortVariants(values: unknown[]) {
  return [...new Set(values.map(sanitizeString).filter(Boolean))].sort(
    (left, right) => compareVariantWeight(left) - compareVariantWeight(right) || compareStrings(left, right),
  );
}

function compareVariantWeight(variant: string) {
  if (variant === 'regular' || variant === 'italic') {
    return 400;
  }
  const match = variant.match(/(\d{3})/);
  return match ? Number.parseInt(match[1], 10) : 400;
}

function compareSubsetKey(left: string[], right: string[]) {
  return compareStrings(left[0], right[0]);
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function compareStrings(left: string | undefined, right: string | undefined) {
  return sanitizeString(left).localeCompare(sanitizeString(right));
}
