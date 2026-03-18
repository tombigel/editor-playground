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

export function getDocumentDefaultFontFamily(document: Pick<DocumentModel, 'fontLibrary'>) {
  const preferredFamilyName = document.fontLibrary.defaults.find((familyName) =>
    document.fontLibrary.usedFamilies.some((family) => family.family === familyName),
  );

  if (preferredFamilyName) {
    return document.fontLibrary.usedFamilies.find((family) => family.family === preferredFamilyName);
  }

  return document.fontLibrary.usedFamilies[0] ?? DEFAULT_DOCUMENT_FONT_FAMILIES[0];
}

export function buildDocumentDefaultFontStack(document: Pick<DocumentModel, 'fontLibrary'>) {
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
