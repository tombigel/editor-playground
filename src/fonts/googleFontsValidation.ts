import type { GoogleFontsCatalog } from './types';

export function isGoogleFontsCatalog(value: unknown): value is GoogleFontsCatalog {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeCatalog = value as Partial<GoogleFontsCatalog>;
  return (
    maybeCatalog.source === 'google-fonts' &&
    typeof maybeCatalog.fetchedAt === 'string' &&
    (maybeCatalog.remoteSort === 'alpha' ||
      maybeCatalog.remoteSort === 'date' ||
      maybeCatalog.remoteSort === 'popularity' ||
      maybeCatalog.remoteSort === 'style' ||
      maybeCatalog.remoteSort === 'trending') &&
    Array.isArray(maybeCatalog.families)
  );
}
