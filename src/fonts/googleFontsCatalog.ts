import type { GoogleFontsCatalog } from './types';
import { isGoogleFontsCatalog } from './googleFontsValidation';

let _catalog: GoogleFontsCatalog | null = null;

export async function loadGoogleFontsCatalog(): Promise<GoogleFontsCatalog> {
  if (_catalog) return _catalog;
  const { default: bundledCatalog } = await import('./generated/googleFontsCatalog.json');
  _catalog = parseBundledGoogleFontsCatalog(bundledCatalog);
  return _catalog;
}

export function getCachedGoogleFontsCatalog(): GoogleFontsCatalog | null {
  return _catalog;
}

export async function getBundledGoogleFontsCatalog(): Promise<GoogleFontsCatalog> {
  return loadGoogleFontsCatalog();
}

function parseBundledGoogleFontsCatalog(value: unknown): GoogleFontsCatalog {
  if (!isGoogleFontsCatalog(value)) {
    throw new Error('Invalid bundled Google Fonts catalog. Run `npm run refresh:google-fonts`.');
  }

  return value;
}
