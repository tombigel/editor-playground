import bundledCatalog from './generated/googleFontsCatalog.json';
import type { GoogleFontsCatalog } from './types';
import { isGoogleFontsCatalog } from './googleFontsValidation';

const BUNDLED_GOOGLE_FONTS_CATALOG = parseBundledGoogleFontsCatalog(bundledCatalog);

export function getBundledGoogleFontsCatalog() {
  return BUNDLED_GOOGLE_FONTS_CATALOG;
}

function parseBundledGoogleFontsCatalog(value: unknown): GoogleFontsCatalog {
  if (!isGoogleFontsCatalog(value)) {
    throw new Error('Invalid bundled Google Fonts catalog. Run `npm run refresh:google-fonts`.');
  }

  return value;
}
