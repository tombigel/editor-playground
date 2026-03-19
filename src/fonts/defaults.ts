import type { DocumentFontFamily, DocumentModel, FontLibrary } from '../model/types';
import defaultFontFamiliesData from './generated/defaultFontFamilies.json';

const DEFAULT_DOCUMENT_FONT_DEFAULTS = ['Inter', 'Assistant'] as const;

export const DEFAULT_DOCUMENT_FONT_FAMILIES: DocumentFontFamily[] = (
  defaultFontFamiliesData.families as DocumentFontFamily[]
).map((family) => ({
  ...structuredClone(family),
  favorite: false,
  origin: 'default',
}));

export const DEFAULT_FONT_FALLBACK_STACK = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export function createDefaultFontLibrary(): FontLibrary {
  return {
    defaults: [...DEFAULT_DOCUMENT_FONT_DEFAULTS],
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
