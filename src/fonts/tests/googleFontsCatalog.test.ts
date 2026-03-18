import { describe, expect, it } from 'vitest';
import { getBundledGoogleFontsCatalog } from '../googleFontsCatalog';

describe('fonts/googleFontsCatalog', () => {
  it('loads a bundled Google Fonts catalog snapshot', () => {
    const catalog = getBundledGoogleFontsCatalog();

    expect(catalog.source).toBe('google-fonts');
    expect(catalog.remoteSort).toBe('popularity');
    expect(catalog.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(catalog.families)).toBe(true);
    expect(catalog.families.length).toBeGreaterThan(0);
  });
});
