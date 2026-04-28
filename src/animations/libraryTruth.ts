import {
  LIBRARY_DISCREPANCIES,
  LIBRARY_EXPORTED_PRESET_NAMES,
  LIBRARY_PRESET_TRUTH,
  LIBRARY_STALE_INTERACT_RULE_REFS,
  LIBRARY_TRIGGER_TRUTH,
  LIBRARY_TRUTH_META,
  LIBRARY_TRUTH_MOTION,
  SUPPORTED_TRIGGER_CATEGORIES,
} from './libraryTruth.generated';

export {
  LIBRARY_DISCREPANCIES,
  LIBRARY_EXPORTED_PRESET_NAMES,
  LIBRARY_PRESET_TRUTH,
  LIBRARY_STALE_INTERACT_RULE_REFS,
  LIBRARY_TRIGGER_TRUTH,
  LIBRARY_TRUTH_META,
  LIBRARY_TRUTH_MOTION,
  SUPPORTED_TRIGGER_CATEGORIES,
};

export type UiPresetCategory = 'entrance' | 'ongoing' | 'scroll' | 'mouse';

const UI_PRESET_ORDER = LIBRARY_EXPORTED_PRESET_NAMES.filter((preset) => {
  const truth = LIBRARY_PRESET_TRUTH[preset as keyof typeof LIBRARY_PRESET_TRUTH];
  return Boolean(truth?.uiExposed);
});

export function getLibraryPresetTruth(preset: string) {
  return LIBRARY_PRESET_TRUTH[preset as keyof typeof LIBRARY_PRESET_TRUTH] ?? null;
}

export function getPlayablePresetCategory(preset: string): UiPresetCategory | null {
  const truth = getLibraryPresetTruth(preset);
  if (!truth || truth.supportStatus !== 'supported' || !truth.uiCategory) return null;
  return truth.uiCategory as UiPresetCategory;
}

export function isPlayablePreset(preset: string): boolean {
  return getPlayablePresetCategory(preset) !== null;
}

export function getUiPresetNamesByCategory(category: UiPresetCategory): string[] {
  return UI_PRESET_ORDER.filter((preset) => {
    const truth = getLibraryPresetTruth(preset);
    return truth?.uiCategory === category;
  });
}

