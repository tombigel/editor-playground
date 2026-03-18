import { describe, expect, it } from 'vitest';
import { FONT_CATALOG_PAGE_SIZE, paginateCatalogFamilies } from '../pagination';

describe('panels/fontManagement/pagination', () => {
  it('returns 10-item pages by default and clamps out-of-range page requests', () => {
    const items = Array.from({ length: 25 }, (_, index) => `Font ${String(index + 1).padStart(2, '0')}`);

    expect(paginateCatalogFamilies(items, 1)).toEqual({
      items: items.slice(0, FONT_CATALOG_PAGE_SIZE),
      activePage: 1,
      totalPages: 3,
      rangeStart: 1,
      rangeEnd: 10,
    });

    expect(paginateCatalogFamilies(items, 2)).toEqual({
      items: items.slice(10, 20),
      activePage: 2,
      totalPages: 3,
      rangeStart: 11,
      rangeEnd: 20,
    });

    expect(paginateCatalogFamilies(items, 9)).toMatchObject({
      activePage: 3,
      rangeStart: 21,
      rangeEnd: 25,
    });
  });

  it('supports caller-selected page sizes', () => {
    const items = Array.from({ length: 25 }, (_, index) => `Font ${String(index + 1).padStart(2, '0')}`);

    expect(paginateCatalogFamilies(items, 1, 20)).toEqual({
      items: items.slice(0, 20),
      activePage: 1,
      totalPages: 2,
      rangeStart: 1,
      rangeEnd: 20,
    });

    expect(paginateCatalogFamilies(items, 1, 50)).toEqual({
      items,
      activePage: 1,
      totalPages: 1,
      rangeStart: 1,
      rangeEnd: 25,
    });
  });

  it('returns an empty first page for empty results', () => {
    expect(paginateCatalogFamilies<string>([], 3)).toEqual({
      items: [],
      activePage: 1,
      totalPages: 1,
      rangeStart: 0,
      rangeEnd: 0,
    });
  });
});
