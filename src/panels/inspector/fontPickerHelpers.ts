import type { DocumentFontFamily } from '../../api/documentViewApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FontWeightOption = {
  value: number;
  label: string;
};

export type OrderedFontFamilyGroups = {
  recent: DocumentFontFamily[];
  byLanguage: DocumentFontFamily[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RECENT_FONT_FAMILIES_STORAGE_KEY = 'editor-playground.recent-font-families';
export const RECENT_FONT_FAMILIES_LIMIT = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function applyPersistentSelectValueChange(options: {
  nextValue: string;
  keepOpenOnSelect: boolean;
  onChange: (value: string) => void;
  reopen: () => void;
}) {
  options.onChange(options.nextValue);
  if (options.keepOpenOnSelect) {
    options.reopen();
  }
}

export function orderFontFamiliesForPicker(families: DocumentFontFamily[], recentFamilyNames: string[]): OrderedFontFamilyGroups {
  const familyMap = new Map(families.map((family) => [family.family, family]));
  const recent: DocumentFontFamily[] = [];

  for (const familyName of recentFamilyNames.map((name) => name.trim()).filter(Boolean)) {
    const family = familyMap.get(familyName);
    if (!family) {
      continue;
    }
    recent.push(family);
    familyMap.delete(familyName);
  }

  const byLanguage = [...familyMap.values()].sort((left, right) => {
    const subsetDelta = (left.subsets[0] ?? '').localeCompare(right.subsets[0] ?? '');
    if (subsetDelta !== 0) {
      return subsetDelta;
    }
    return left.family.localeCompare(right.family);
  });

  return { recent, byLanguage };
}

export function readRecentFontFamilies() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_FONT_FAMILIES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, RECENT_FONT_FAMILIES_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function writeRecentFontFamilies(families: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(RECENT_FONT_FAMILIES_STORAGE_KEY, JSON.stringify(families));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}
