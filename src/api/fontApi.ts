/**
 * @module fontApi
 *
 * Pass-through re-exports from the fonts subsystem.
 * Covers document font library management, Google Fonts integration,
 * font weight utilities, and stylesheet URL builders.
 */

/** Document font library: add, remove, query, and normalize fonts on a DocumentModel. */
export {
  addDocumentFontFamily,
  createDefaultFontLibrary,
  DEFAULT_DOCUMENT_FONT_FAMILIES,
  ensureDocumentFontFamily,
  ensureDocumentFontFamilyByName,
  getDefaultDocumentFontFamily,
  getDocumentDefaultFontFamily,
  getDocumentFontFamily,
  getDocumentFontLibrary,
  getDocumentFontUsageMap,
  getFontUsage,
  isFontFamilyUsed,
  listDocumentFonts,
  listDocumentFontsForPicker,
  normalizeDocumentFontState,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  toggleDocumentFontFavorite,
} from '../fonts';

/** Google Fonts catalog: fetch, search, filter, sort, and load font families. */
export {
  fetchGoogleFontCatalog,
  filterGoogleFontFamilies,
  getBundledGoogleFontsCatalog,
  getCachedGoogleFontsCatalog,
  getGoogleFontFamily,
  loadGoogleFontsCatalog,
  queryGoogleFontFamilies,
  searchGoogleFontFamilies,
  sortGoogleFontFamilies,
  useGoogleFontsCatalog,
  type GoogleFontFamily,
  type GoogleFontSort,
  type GoogleFontsCatalog,
  type GoogleFontsFetchOptions,
  type GoogleFontsQuery,
} from '../fonts';

/** Stylesheet URL builders: generate Google Fonts and preview stylesheet hrefs. */
export {
  buildDocumentGoogleFontsStylesheetHref,
  buildEditorGoogleFontsStylesheetHref,
  buildFontFamilyStack,
  buildFontPickerPreviewStylesheetHref,
  buildFontPreviewStylesheetHref,
  buildGoogleFontsStylesheetHref,
  collectDocumentFontRequests,
} from '../fonts';

/** Font weight utilities: resolve, toggle, label, and parse font weights. */
export {
  BOLD_ACTIVE_WEIGHT,
  BOLD_FONT_WEIGHT,
  DEFAULT_FONT_WEIGHT,
  getFontWeightLabel,
  getSupportedFontWeights,
  isBoldFontWeight,
  listFontWeightOptions,
  parseFontWeightInput,
  resolveNearestSupportedFontWeight,
  toggleBoldFontWeight,
} from '../fonts';
