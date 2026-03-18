import { getBundledGoogleFontsCatalog } from './googleFontsCatalog';
import type { GoogleFontsCatalog } from './types';

const BUNDLED_GOOGLE_FONTS_CATALOG = getBundledGoogleFontsCatalog();
const RETRY_NOOP = () => undefined;

type GoogleFontsCatalogState =
  | { status: 'loading'; catalog: null; error: null }
  | { status: 'ready'; catalog: GoogleFontsCatalog; error: null }
  | { status: 'error'; catalog: null; error: string };

export function useGoogleFontsCatalog(): GoogleFontsCatalogState & { retry: () => void } {
  return {
    status: 'ready' as const,
    catalog: BUNDLED_GOOGLE_FONTS_CATALOG,
    error: null,
    retry: RETRY_NOOP,
  };
}
