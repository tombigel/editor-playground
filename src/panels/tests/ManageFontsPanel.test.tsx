import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getBundledGoogleFontsCatalog } from '../../fonts/googleFontsCatalog';
import { createInitialDocument } from '../../model/defaults';
import {
  buildLanguageFilterOptions,
  DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER,
  formatGoogleFontsCatalogTimestamp,
  ManageFontsPanel,
  normalizeCatalogPageSize,
  normalizeManageFontsLanguageFilter,
  resolveLanguageFilterSubsets,
} from '../fontManagement/ManageFontsPanel';

describe('panels/ManageFontsPanel', () => {
  it('groups language filters into human-readable buckets with other for uncategorized subsets', () => {
    const options = buildLanguageFilterOptions([
      { subsets: ['latin', 'latin-ext'] },
      { subsets: ['hebrew', 'latin'] },
      { subsets: ['cyrillic-ext'] },
      { subsets: ['khmer'] },
    ]);

    expect(options).toEqual([
      { id: 'western', label: 'Western' },
      { id: 'all', label: 'All languages' },
      { id: 'hebrew', label: 'Hebrew' },
      { id: 'cyrillic', label: 'Cyrillic' },
      { id: 'other', label: 'Other' },
    ]);
  });

  it('normalizes old raw subset values into the grouped language filters', () => {
    expect(DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER).toBe('western');
    expect(normalizeManageFontsLanguageFilter('latin-ext')).toBe('western');
    expect(normalizeManageFontsLanguageFilter('greek')).toBe('greek');
    expect(normalizeManageFontsLanguageFilter('khmer')).toBe('other');
    expect(normalizeManageFontsLanguageFilter('')).toBe('western');
  });

  it('resolves grouped language filters back to the matching Google subset list', () => {
    const families = [{ subsets: ['latin', 'hebrew', 'khmer'] }, { subsets: ['latin-ext'] }];

    expect(resolveLanguageFilterSubsets('western', families)).toEqual(['latin', 'latin-ext']);
    expect(resolveLanguageFilterSubsets('hebrew', families)).toEqual(['hebrew']);
    expect(resolveLanguageFilterSubsets('other', families)).toEqual(['khmer']);
    expect(resolveLanguageFilterSubsets('all', families)).toBeUndefined();
  });

  it('defaults the catalog page size to 10 and clamps unsupported values', () => {
    expect(normalizeCatalogPageSize(10)).toBe(10);
    expect(normalizeCatalogPageSize(20)).toBe(20);
    expect(normalizeCatalogPageSize(50)).toBe(50);
    expect(normalizeCatalogPageSize(15)).toBe(10);
    expect(normalizeCatalogPageSize(Number.NaN)).toBe(10);
  });

  it('formats bundled catalog timestamps in a stable UTC format', () => {
    expect(formatGoogleFontsCatalogTimestamp('2026-03-18T08:05:00.000Z')).toBe('2026-03-18 08:05 UTC');
    expect(formatGoogleFontsCatalogTimestamp('invalid')).toBe('unknown');
  });

  it('renders the bundled catalog timestamp in the browse panel', async () => {
    const document = createInitialDocument();
    const catalog = await getBundledGoogleFontsCatalog();
    const expectedTimestamp = formatGoogleFontsCatalogTimestamp(catalog.fetchedAt);
    const markup = renderToStaticMarkup(
      <ManageFontsPanel
        document={document}
        onAddFont={() => {}}
        onRemoveFont={() => {}}
        onToggleFavorite={() => {}}
        onPurgeUnused={() => {}}
      />,
    );

    expect(markup).toContain('Browse Google Fonts');
    expect(markup).toContain(`Catalog updated ${expectedTimestamp}`);
  });
});
