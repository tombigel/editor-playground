export const FONT_CATALOG_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const FONT_CATALOG_PAGE_SIZE = FONT_CATALOG_PAGE_SIZE_OPTIONS[0];

export type PaginationResult<T> = {
  items: T[];
  activePage: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
};

export function paginateCatalogFamilies<T>(
  items: T[],
  requestedPage: number,
  pageSize: number = FONT_CATALOG_PAGE_SIZE,
): PaginationResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const activePage = clampPage(requestedPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const visibleItems = items.slice(startIndex, startIndex + pageSize);
  const rangeStart = items.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = items.length === 0 ? 0 : rangeStart + visibleItems.length - 1;

  return {
    items: visibleItems,
    activePage,
    totalPages,
    rangeStart,
    rangeEnd,
  };
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page)) {
    return 1;
  }
  return Math.min(totalPages, Math.max(1, Math.trunc(page)));
}
