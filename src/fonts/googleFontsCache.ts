import type { GoogleFontsCatalog } from './types';
import { isGoogleFontsCatalog } from './googleFontsValidation';

export const GOOGLE_FONTS_CATALOG_CACHE_KEY = 'sticky-playground.google-fonts.catalog';
export const GOOGLE_FONTS_CATALOG_CACHE_VERSION = 1;
export const GOOGLE_FONTS_CATALOG_REFRESH_AFTER_MS = 1000 * 60 * 60 * 24;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type CachedGoogleFontsCatalogRecord = {
  version: number;
  catalog: GoogleFontsCatalog;
};

export function readCachedGoogleFontsCatalog(storage: StorageLike | null | undefined) {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(GOOGLE_FONTS_CATALOG_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedGoogleFontsCatalogRecord;
    if (parsed?.version !== GOOGLE_FONTS_CATALOG_CACHE_VERSION) {
      return null;
    }

    return isGoogleFontsCatalog(parsed.catalog) ? parsed.catalog : null;
  } catch {
    return null;
  }
}

export function writeCachedGoogleFontsCatalog(storage: StorageLike | null | undefined, catalog: GoogleFontsCatalog) {
  if (!storage || !isGoogleFontsCatalog(catalog)) {
    return;
  }

  try {
    storage.setItem(
      GOOGLE_FONTS_CATALOG_CACHE_KEY,
      JSON.stringify({
        version: GOOGLE_FONTS_CATALOG_CACHE_VERSION,
        catalog,
      } satisfies CachedGoogleFontsCatalogRecord),
    );
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

export function shouldRefreshGoogleFontsCatalog(
  catalog: Pick<GoogleFontsCatalog, 'fetchedAt'> | null | undefined,
  refreshAfterMs = GOOGLE_FONTS_CATALOG_REFRESH_AFTER_MS,
) {
  if (!catalog) {
    return true;
  }

  const fetchedAtMs = Date.parse(catalog.fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) {
    return true;
  }

  return Date.now() - fetchedAtMs >= refreshAfterMs;
}
