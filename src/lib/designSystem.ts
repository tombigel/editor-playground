import {
  DEFAULT_EDITOR_ACCENT_COLOR,
  DEFAULT_EDITOR_DARK_THEME,
  DEFAULT_EDITOR_LIGHT_THEME,
  normalizeEditorAccentColor,
  normalizeEditorDarkTheme,
  normalizeEditorLightTheme,
  normalizeThemeMode,
  type ThemeMode,
  type EditorLightTheme,
  type EditorDarkTheme,
} from './theme';

export type DesignSystemThemeConfig = {
  themeMode: ThemeMode;
  lightTheme: EditorLightTheme;
  darkTheme: EditorDarkTheme;
  accentColor: string;
};

export const DESIGN_SYSTEM_THEME_STORAGE_KEY = 'editor-playground.design-system-theme.v1';
export const DESIGN_SYSTEM_THEME_HANDOFF_KEY = 'editor-playground.design-system-theme.handoff.v1';
export const DESIGN_SYSTEM_ROUTE_HASH = '#/design-system';
export const DESIGN_SYSTEM_EDITOR_ROUTE_HASH = `${DESIGN_SYSTEM_ROUTE_HASH}?from=editor`;
export const DESIGN_SYSTEM_BACK_HOME_HASH = '#/';
export const DESIGN_SYSTEM_BACK_EDITOR_HASH = '#/edit';

export function normalizeDesignSystemThemeConfig(
  value: Partial<DesignSystemThemeConfig> | null | undefined,
): DesignSystemThemeConfig | null {
  if (!value) {
    return null;
  }

  return {
    themeMode: normalizeThemeMode(value.themeMode),
    lightTheme: normalizeEditorLightTheme(value.lightTheme),
    darkTheme: normalizeEditorDarkTheme(value.darkTheme),
    accentColor: normalizeEditorAccentColor(value.accentColor, DEFAULT_EDITOR_ACCENT_COLOR),
  };
}

export function parseStoredDesignSystemThemeConfig(raw: string | null): DesignSystemThemeConfig | null {
  if (!raw) {
    return null;
  }

  try {
    return normalizeDesignSystemThemeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readPersistedDesignSystemThemeConfig(): DesignSystemThemeConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseStoredDesignSystemThemeConfig(window.localStorage.getItem(DESIGN_SYSTEM_THEME_STORAGE_KEY));
}

export function persistDesignSystemThemeConfig(config: DesignSystemThemeConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DESIGN_SYSTEM_THEME_STORAGE_KEY, JSON.stringify(config));
}

export function storeDesignSystemThemeHandoff(config: DesignSystemThemeConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(DESIGN_SYSTEM_THEME_HANDOFF_KEY, JSON.stringify(config));
}

export function consumeDesignSystemThemeHandoff(): DesignSystemThemeConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(DESIGN_SYSTEM_THEME_HANDOFF_KEY);
  window.sessionStorage.removeItem(DESIGN_SYSTEM_THEME_HANDOFF_KEY);
  return parseStoredDesignSystemThemeConfig(raw);
}

export function openDesignSystemShowcase(config: DesignSystemThemeConfig) {
  storeDesignSystemThemeHandoff(config);
  window.location.hash = DESIGN_SYSTEM_EDITOR_ROUTE_HASH;
}

export function getDesignSystemBackRouteHash(hash: string | null | undefined) {
  return getDesignSystemRouteSearch(hash).get('from') === 'editor'
    ? DESIGN_SYSTEM_BACK_EDITOR_HASH
    : DESIGN_SYSTEM_BACK_HOME_HASH;
}

export function getDesignSystemRouteSearch(hash: string | null | undefined) {
  const normalized = (hash ?? '').startsWith('#') ? (hash ?? '').slice(1) : (hash ?? '');
  const queryIndex = normalized.indexOf('?');

  if (!normalized.startsWith('/design-system') || queryIndex === -1) {
    return new URLSearchParams();
  }

  const sectionHashIndex = normalized.indexOf('#', queryIndex);
  const query = normalized.slice(
    queryIndex + 1,
    sectionHashIndex === -1 ? undefined : sectionHashIndex,
  );
  return new URLSearchParams(query);
}

export function createDefaultDesignSystemThemeConfig(): DesignSystemThemeConfig {
  return {
    themeMode: 'auto',
    lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
    darkTheme: DEFAULT_EDITOR_DARK_THEME,
    accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
  };
}
