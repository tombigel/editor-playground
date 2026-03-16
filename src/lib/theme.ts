import type { ResolvedTheme, ThemeMode } from './types/theme';

export type { ResolvedTheme, ThemeMode } from './types/theme';

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
}

export function resolveThemeMode(themeMode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (themeMode === 'auto') {
    return prefersDark ? 'dark' : 'light';
  }
  return themeMode;
}
