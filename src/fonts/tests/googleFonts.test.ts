import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGoogleFontCatalog, normalizeGoogleFontFamily, queryGoogleFontFamilies, sortGoogleFontFamilies } from '../googleFonts';
import type { GoogleFontFamily, GoogleFontsApiFamily } from '../types';

describe('fonts/googleFonts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests Google capabilities as repeated query params instead of a comma-joined value', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kind: 'webfonts#webfontList', items: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchGoogleFontCatalog({ apiKey: 'test-key', sort: 'popularity' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.getAll('capability')).toEqual(['VF', 'FAMILY_TAGS']);
    expect(requestUrl.searchParams.get('capability')).toBe('VF');
  });

  it('normalizes Google API families into document-safe font entries', () => {
    const family: GoogleFontsApiFamily = {
      family: 'Assistant',
      category: 'sans-serif',
      subsets: ['latin', 'hebrew', 'latin'],
      variants: ['700', 'regular', '300', '700'],
      axes: [{ tag: 'wght', start: 200, end: 800 }],
      lastModified: '2025-01-01',
      tags: ['modern', 'hebrew'],
    };

    expect(normalizeGoogleFontFamily(family, 7, 'popularity')).toEqual({
      family: 'Assistant',
      category: 'sans-serif',
      subsets: ['hebrew', 'latin'],
      variants: ['300', 'regular', '700'],
      axes: [{ tag: 'wght', min: 200, max: 800 }],
      isVariable: true,
      source: 'google-fonts',
      lastModified: '2025-01-01',
      popularityRank: 7,
      favorite: false,
      origin: 'added',
      tags: ['hebrew', 'modern'],
    });
  });

  it('sanitizes malformed Google API metadata before query and sort operations', () => {
    const normalized = normalizeGoogleFontFamily(
      {
        family: '  Assistant  ',
        category: 12 as unknown as string,
        subsets: ['latin', 42 as unknown as string, 'hebrew'],
        variants: ['700', null as unknown as string, 'regular'],
        axes: [
          { tag: 'wght', start: 200, end: 800 },
          { tag: 9 as unknown as string, start: Number.NaN, end: 900 },
        ],
        tags: ['modern', false as unknown as string],
      },
      2,
      'popularity',
    );

    expect(normalized).toMatchObject({
      family: 'Assistant',
      category: 'sans-serif',
      subsets: ['hebrew', 'latin'],
      variants: ['regular', '700'],
      axes: [{ tag: 'wght', min: 200, max: 800 }],
      isVariable: true,
      tags: ['modern'],
    });

    const malformedFamilies = [
      normalized,
      {
        family: 'Alef',
        category: 'sans-serif',
        subsets: ['hebrew'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
        tags: ['hebrew'],
      },
      {
        family: 'Beta',
        category: 99 as unknown as string,
        subsets: ['latin', 10 as unknown as string],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
        tags: [null as unknown as string, 'beta'],
      },
    ] satisfies GoogleFontFamily[];

    expect(() =>
      queryGoogleFontFamilies(malformedFamilies, {
        search: 'hebrew',
        sort: 'language',
      }).map((family) => family.family),
    ).not.toThrow();

    expect(
      queryGoogleFontFamilies(malformedFamilies, {
        search: 'hebrew',
        sort: 'language',
      }).map((family) => family.family),
    ).toEqual(['Alef', 'Assistant']);
  });

  it('filters and sorts queried families by search, language, category, favorites, and usage', () => {
    const families: GoogleFontFamily[] = [
      {
        family: 'Assistant',
        category: 'sans-serif',
        subsets: ['hebrew', 'latin'],
        variants: ['regular', '700'],
        isVariable: true,
        axes: [{ tag: 'wght', min: 200, max: 800 }],
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 'Lora',
        category: 'serif',
        subsets: ['latin'],
        variants: ['regular', '700'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 'Noto Sans Hebrew',
        category: 'sans-serif',
        subsets: ['hebrew'],
        variants: ['regular', '500', '700'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
    ];

    expect(
      queryGoogleFontFamilies(families, {
        search: 'hebrew',
        subsets: ['hebrew'],
        category: 'sans-serif',
        favoriteFamilies: ['Assistant'],
        favoritesOnly: true,
      }).map((family) => family.family),
    ).toEqual(['Assistant']);

    expect(
      queryGoogleFontFamilies(families, {
        usedFamilies: ['Noto Sans Hebrew', 'Assistant'],
        usageCounts: { Assistant: 1, 'Noto Sans Hebrew': 3 },
        sort: 'used',
      }).map((family) => family.family),
    ).toEqual(['Noto Sans Hebrew', 'Assistant', 'Lora']);
  });

  it('sorts by language and then falls back to family name', () => {
    const families: GoogleFontFamily[] = [
      {
        family: 'Zeta Sans',
        category: 'sans-serif',
        subsets: ['latin'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 'Alef',
        category: 'sans-serif',
        subsets: ['hebrew'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 'Alpha Serif',
        category: 'serif',
        subsets: ['latin'],
        variants: ['regular', '700', '900'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
    ];

    expect(sortGoogleFontFamilies(families, { sort: 'language' }).map((family) => family.family)).toEqual([
      'Alef',
      'Alpha Serif',
      'Zeta Sans',
    ]);
  });
});
