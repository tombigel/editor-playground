import type { DocumentFontFamily, DocumentModel, FontLibrary } from '../model/types';

export const DEFAULT_DOCUMENT_FONT_FAMILIES: DocumentFontFamily[] = [
  {
    family: 'Inter',
    category: 'sans-serif',
    subsets: ['latin', 'latin-ext'],
    variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'],
    isVariable: true,
    axes: [{ tag: 'wght', min: 100, max: 900 }],
    source: 'google-fonts',
    favorite: false,
    origin: 'default',
  },
  {
    family: 'Roboto',
    category: 'sans-serif',
    subsets: ['latin', 'latin-ext'],
    variants: ['100', '300', 'regular', '500', '700', '900'],
    isVariable: false,
    source: 'google-fonts',
    favorite: false,
    origin: 'default',
  },
  {
    family: 'Lora',
    category: 'serif',
    subsets: ['latin', 'latin-ext'],
    variants: ['regular', '500', '600', '700'],
    isVariable: true,
    axes: [{ tag: 'wght', min: 400, max: 700 }],
    source: 'google-fonts',
    favorite: false,
    origin: 'default',
  },
  {
    family: 'Playfair Display',
    category: 'serif',
    subsets: ['latin', 'latin-ext'],
    variants: ['regular', '500', '600', '700', '800', '900'],
    isVariable: true,
    axes: [{ tag: 'wght', min: 400, max: 900 }],
    source: 'google-fonts',
    favorite: false,
    origin: 'default',
  },
  {
    family: 'Assistant',
    category: 'sans-serif',
    subsets: ['hebrew', 'latin', 'latin-ext'],
    variants: ['200', '300', 'regular', '500', '600', '700', '800'],
    isVariable: true,
    axes: [{ tag: 'wght', min: 200, max: 800 }],
    source: 'google-fonts',
    favorite: false,
    origin: 'default',
  },
];

export const DEFAULT_FONT_FALLBACK_STACK = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export function createDefaultFontLibrary(): FontLibrary {
  return {
    defaults: DEFAULT_DOCUMENT_FONT_FAMILIES.map((family) => family.family),
    favorites: [],
    usedFamilies: DEFAULT_DOCUMENT_FONT_FAMILIES.map((family) => structuredClone(family)),
  };
}

export function getDefaultDocumentFontFamily(familyName: string) {
  return DEFAULT_DOCUMENT_FONT_FAMILIES.find((family) => family.family === familyName);
}

function getAvailableDocumentFamilies(fontLibrary: Partial<FontLibrary> | undefined) {
  const usedFamilies = Array.isArray(fontLibrary?.usedFamilies)
    ? fontLibrary.usedFamilies.filter(
        (family): family is DocumentFontFamily => Boolean(family?.family && typeof family.family === 'string'),
      )
    : [];

  return usedFamilies.length > 0 ? usedFamilies : DEFAULT_DOCUMENT_FONT_FAMILIES;
}

function getDocumentDefaultFamilyNames(fontLibrary: Partial<FontLibrary> | undefined) {
  return Array.isArray(fontLibrary?.defaults)
    ? fontLibrary.defaults.filter((familyName): familyName is string => typeof familyName === 'string' && familyName.length > 0)
    : [];
}

export function getDocumentDefaultFontFamily(document: Partial<Pick<DocumentModel, 'fontLibrary'>> | null | undefined) {
  const usedFamilies = getAvailableDocumentFamilies(document?.fontLibrary);
  const preferredFamilyName = getDocumentDefaultFamilyNames(document?.fontLibrary).find((familyName) =>
    usedFamilies.some((family) => family.family === familyName),
  );

  if (preferredFamilyName) {
    return usedFamilies.find((family) => family.family === preferredFamilyName);
  }

  return usedFamilies[0] ?? DEFAULT_DOCUMENT_FONT_FAMILIES[0];
}

export function buildDocumentDefaultFontStack(document: Partial<Pick<DocumentModel, 'fontLibrary'>> | null | undefined) {
  const family = getDocumentDefaultFontFamily(document);
  if (!family?.family) {
    return DEFAULT_FONT_FALLBACK_STACK;
  }
  return buildFontFamilyStack(family.family);
}

export function buildFontFamilyStack(familyName: string) {
  return `${quoteFontFamily(familyName)}, ${DEFAULT_FONT_FALLBACK_STACK}`;
}

function quoteFontFamily(familyName: string) {
  return /[\s'",]/.test(familyName) ? `'${familyName.replace(/'/g, "\\'")}'` : familyName;
}
