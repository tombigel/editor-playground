import type {
  DocumentFontFamily,
  DocumentModel,
  DocumentNode,
  FontLibrary,
  TypographyStyle,
} from '../model/types';
import { createDefaultFontLibrary, getDefaultDocumentFontFamily } from './defaults';
import { getCachedGoogleFontsCatalog } from './googleFontsCatalog';
import { clampFontWeight } from './weights';

export function getDocumentFontLibrary(document: DocumentModel): FontLibrary {
  return document.fontLibrary;
}

export function listDocumentFonts(document: DocumentModel) {
  return [...document.fontLibrary.usedFamilies];
}

export function getDocumentFontFamily(document: DocumentModel, familyName: string) {
  return document.fontLibrary.usedFamilies.find((family) => family.family === familyName);
}

export function addDocumentFontFamily(document: DocumentModel, family: DocumentFontFamily): DocumentModel {
  const next = cloneDocumentWithFontLibrary(document);
  const existing = next.fontLibrary.usedFamilies.find((entry) => entry.family === family.family);
  if (existing) {
    Object.assign(existing, {
      ...existing,
      ...family,
      favorite: existing.favorite || family.favorite,
      origin: existing.origin,
    });
    syncFontLibraryFlags(next.fontLibrary);
    return next;
  }

  next.fontLibrary.usedFamilies.push({
    ...family,
    favorite: next.fontLibrary.favorites.includes(family.family) || family.favorite,
  });
  syncFontLibraryFlags(next.fontLibrary);
  return next;
}

export function removeDocumentFontFamily(document: DocumentModel, familyName: string): DocumentModel {
  if (isFontFamilyUsed(document, familyName)) {
    return document;
  }
  const next = cloneDocumentWithFontLibrary(document);
  next.fontLibrary.usedFamilies = next.fontLibrary.usedFamilies.filter((family) => family.family !== familyName);
  next.fontLibrary.defaults = next.fontLibrary.defaults.filter((family) => family !== familyName);
  next.fontLibrary.favorites = next.fontLibrary.favorites.filter((family) => family !== familyName);
  syncFontLibraryFlags(next.fontLibrary);
  return next;
}

export function purgeUnusedDocumentFonts(document: DocumentModel): DocumentModel {
  const next = cloneDocumentWithFontLibrary(document);
  next.fontLibrary.usedFamilies = next.fontLibrary.usedFamilies.filter((family) => {
    const isDefault = next.fontLibrary.defaults.includes(family.family);
    const isFavorite = next.fontLibrary.favorites.includes(family.family) || family.favorite;
    return isDefault || isFavorite || isFontFamilyUsed(document, family.family);
  });
  syncFontLibraryFlags(next.fontLibrary);
  return next;
}

export function toggleDocumentFontFavorite(document: DocumentModel, familyName: string): DocumentModel {
  const next = cloneDocumentWithFontLibrary(document);
  const family = next.fontLibrary.usedFamilies.find((entry) => entry.family === familyName);
  if (!family) {
    return document;
  }
  family.favorite = !family.favorite;
  syncFontLibraryFlags(next.fontLibrary);
  return next;
}

export function getFontUsage(document: DocumentModel, familyName: string) {
  return getTypographyNodes(document).filter((node) => node.style?.fontFamily === familyName).length;
}

export function isFontFamilyUsed(document: DocumentModel, familyName: string) {
  return getFontUsage(document, familyName) > 0;
}

export function getDocumentFontUsageMap(document: DocumentModel) {
  return Object.fromEntries(
    document.fontLibrary.usedFamilies.map((family) => [family.family, getFontUsage(document, family.family)]),
  ) as Record<string, number>;
}

export function listDocumentFontsForPicker(document: DocumentModel) {
  const usageMap = getDocumentFontUsageMap(document);
  return [...document.fontLibrary.usedFamilies].sort((left, right) => {
    const usageDelta = (usageMap[right.family] ?? 0) - (usageMap[left.family] ?? 0);
    if (usageDelta !== 0) {
      return usageDelta;
    }
    const subsetDelta = compareStrings(left.subsets[0], right.subsets[0]);
    if (subsetDelta !== 0) {
      return subsetDelta;
    }
    return compareStrings(left.family, right.family);
  });
}

export function ensureDocumentFontFamily(document: DocumentModel, family: DocumentFontFamily): DocumentModel {
  return getDocumentFontFamily(document, family.family) ? document : addDocumentFontFamily(document, family);
}

export function ensureDocumentFontFamilyByName(document: DocumentModel, familyName: string): DocumentModel {
  if (!familyName.trim() || getDocumentFontFamily(document, familyName)) {
    return document;
  }
  const fallback = resolveKnownDocumentFontFamily(familyName);
  return addDocumentFontFamily(
    document,
    fallback
      ? { ...fallback }
      : {
          family: familyName,
          category: 'sans-serif',
          subsets: [],
          variants: ['regular'],
          isVariable: false,
          source: 'google-fonts',
          favorite: false,
          origin: 'added',
        },
  );
}

export function normalizeDocumentFontState(document: DocumentModel): DocumentModel {
  const next: DocumentModel = {
    ...document,
    nodes: structuredClone(document.nodes),
    fontLibrary: normalizeFontLibrary(document.fontLibrary),
  };

  for (const node of Object.values(next.nodes)) {
    if (node.type !== 'leaf' || (node.role !== 'text' && node.role !== 'link' && node.role !== 'button')) {
      continue;
    }
    normalizeTypographyStyle(node.style);
    const familyName = node.style?.fontFamily?.trim();
    if (familyName) {
      next.fontLibrary = ensureDocumentFontFamilyByName(next, familyName).fontLibrary;
    }
  }

  syncFontLibraryFlags(next.fontLibrary);
  return next;
}

function normalizeFontLibrary(fontLibrary: FontLibrary | undefined): FontLibrary {
  if (!fontLibrary) {
    return createDefaultFontLibrary();
  }

  const defaults = uniqueStrings(fontLibrary.defaults ?? []);
  const favorites = uniqueStrings(fontLibrary.favorites ?? []);
  if (defaults.length === 0 && favorites.length === 0 && (fontLibrary.usedFamilies?.length ?? 0) === 0) {
    return createDefaultFontLibrary();
  }

  const seededDefaultFamilies = defaults.flatMap((familyName) => {
    const fallback = getDefaultDocumentFontFamily(familyName);
    return fallback ? [structuredClone(fallback)] : [];
  });

  const usedFamilies = uniqueFamilies([...seededDefaultFamilies, ...(fontLibrary.usedFamilies ?? [])])
    .map((family) => {
      const familyName = sanitizeString(family.family);
      return {
        ...family,
        family: familyName,
        category: sanitizeString(family.category) || 'sans-serif',
        subsets: uniqueStrings(family.subsets ?? []),
        variants: uniqueStrings(family.variants ?? []),
        favorite: Boolean(family.favorite || favorites.includes(familyName)),
      };
    })
    .filter((family) => family.family.length > 0)
    .map((family) => resolveDocumentFontFamilyMetadata(family));

  return { defaults, favorites, usedFamilies };
}

function normalizeTypographyStyle(style: TypographyStyle | undefined) {
  if (!style) {
    return;
  }

  const mutableStyle = style as TypographyStyle & { fontWeight?: number | 'normal' | 'bold' | string };

  if (mutableStyle.fontFamily) {
    const trimmedFamily = mutableStyle.fontFamily.trim();
    mutableStyle.fontFamily = trimmedFamily || undefined;
  }

  if (typeof mutableStyle.fontWeight === 'string') {
    const legacy = mutableStyle.fontWeight === 'bold' ? 700 : 400;
    mutableStyle.fontWeight = legacy;
  } else if (typeof mutableStyle.fontWeight === 'number' && Number.isFinite(mutableStyle.fontWeight)) {
    mutableStyle.fontWeight = clampFontWeight(mutableStyle.fontWeight);
  } else if (mutableStyle.fontWeight !== undefined) {
    mutableStyle.fontWeight = undefined;
  }
}

function syncFontLibraryFlags(fontLibrary: FontLibrary) {
  fontLibrary.usedFamilies = uniqueFamilies(fontLibrary.usedFamilies).map((family) => ({
    ...family,
    favorite: fontLibrary.favorites.includes(family.family) || family.favorite,
  }));
  fontLibrary.favorites = uniqueStrings(
    fontLibrary.usedFamilies.filter((family) => family.favorite).map((family) => family.family),
  );
  fontLibrary.defaults = uniqueStrings(fontLibrary.defaults).filter((family) =>
    fontLibrary.usedFamilies.some((entry) => entry.family === family),
  );
}

function getTypographyNodes(document: DocumentModel) {
  return Object.values(document.nodes).filter(
    (node): node is Extract<DocumentNode, { type: 'leaf'; role: 'text' | 'link' | 'button' }> =>
      node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button'),
  );
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.map(sanitizeString).filter(Boolean))];
}

function uniqueFamilies(families: DocumentFontFamily[]) {
  const seen = new Set<string>();
  return families.filter((family) => {
    const familyName = sanitizeString(family?.family);
    if (!familyName || seen.has(familyName)) {
      return false;
    }
    seen.add(familyName);
    return true;
  });
}

function resolveDocumentFontFamilyMetadata(family: DocumentFontFamily): DocumentFontFamily {
  const resolved = resolveKnownDocumentFontFamily(family.family);
  if (!resolved) {
    return family;
  }

  return {
    ...family,
    ...structuredClone(resolved),
    favorite: family.favorite,
    origin: family.origin === 'default' || resolved.origin === 'default' ? 'default' : family.origin,
  };
}

function resolveKnownDocumentFontFamily(familyName: string) {
  const defaultFamily = getDefaultDocumentFontFamily(familyName);
  if (defaultFamily) {
    return structuredClone(defaultFamily);
  }

  const bundledFamily = getCachedGoogleFontsCatalog()?.families.find((family) => family.family === familyName);
  return bundledFamily ? structuredClone(bundledFamily) : undefined;
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function compareStrings(left: string | undefined, right: string | undefined) {
  return sanitizeString(left).localeCompare(sanitizeString(right));
}

function cloneDocumentWithFontLibrary(document: DocumentModel): DocumentModel {
  return {
    ...document,
    nodes: structuredClone(document.nodes),
    fontLibrary: structuredClone(document.fontLibrary),
  };
}
