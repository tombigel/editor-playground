import { describe, expect, it } from 'vitest';
import {
  GOOGLE_FONTS_CATALOG_CACHE_KEY,
  GOOGLE_FONTS_CATALOG_CACHE_VERSION,
  readCachedGoogleFontsCatalog,
  shouldRefreshGoogleFontsCatalog,
  writeCachedGoogleFontsCatalog,
} from '../googleFontsCache';
import type { GoogleFontsCatalog } from '../types';

describe('fonts/googleFontsCache', () => {
  it('round-trips a cached catalog through storage', () => {
    const storage = createMemoryStorage();
    const catalog: GoogleFontsCatalog = {
      source: 'google-fonts',
      fetchedAt: '2026-03-18T08:00:00.000Z',
      remoteSort: 'popularity',
      families: [
        {
          family: 'Assistant',
          category: 'sans-serif',
          subsets: ['hebrew', 'latin'],
          variants: ['regular', '700'],
          isVariable: false,
          source: 'google-fonts',
          favorite: false,
          origin: 'added',
        },
      ],
    };

    writeCachedGoogleFontsCatalog(storage, catalog);

    expect(storage.getItem(GOOGLE_FONTS_CATALOG_CACHE_KEY)).toBe(
      JSON.stringify({
        version: GOOGLE_FONTS_CATALOG_CACHE_VERSION,
        catalog,
      }),
    );
    expect(readCachedGoogleFontsCatalog(storage)).toEqual(catalog);
  });

  it('ignores malformed cache records', () => {
    const storage = createMemoryStorage();
    storage.setItem(GOOGLE_FONTS_CATALOG_CACHE_KEY, JSON.stringify({ version: GOOGLE_FONTS_CATALOG_CACHE_VERSION, catalog: {} }));

    expect(readCachedGoogleFontsCatalog(storage)).toBeNull();
  });

  it('marks missing, invalid, and stale catalogs for refresh', () => {
    expect(shouldRefreshGoogleFontsCatalog(null)).toBe(true);
    expect(shouldRefreshGoogleFontsCatalog({ fetchedAt: 'invalid' })).toBe(true);
    expect(shouldRefreshGoogleFontsCatalog({ fetchedAt: new Date(Date.now() - 2000).toISOString() }, 1000)).toBe(true);
    expect(shouldRefreshGoogleFontsCatalog({ fetchedAt: new Date(Date.now() - 500).toISOString() }, 1000)).toBe(false);
  });
});

function createMemoryStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}
