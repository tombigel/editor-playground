import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDITOR_ACCENT_COLOR,
  DEFAULT_EDITOR_DARK_THEME,
  DEFAULT_EDITOR_LIGHT_THEME,
  DEFAULT_MONOKAI_ACCENT_COLOR,
  DEFAULT_PAPER_ACCENT_COLOR,
  normalizeEditorAccentColor,
  normalizeEditorDarkTheme,
  normalizeEditorLightTheme,
  resolveAccentSurfaceColors,
  resolveEditorAccentColor,
  resolveStickyGuideColors,
  normalizeThemeMode,
  resolveThemeMode,
} from '../theme';

describe('lib/theme', () => {
  it('normalizes unsupported values to auto', () => {
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode('dark')).toBe('dark');
    expect(normalizeThemeMode('auto')).toBe('auto');
    expect(normalizeThemeMode('nope')).toBe('auto');
    expect(normalizeThemeMode(undefined)).toBe('auto');
    expect(normalizeThemeMode(null as unknown as string)).toBe('auto');
  });

  it('normalizes editor accent and dark theme values', () => {
    expect(normalizeEditorAccentColor('#ff6b4a')).toBe('#ff6b4a');
    expect(normalizeEditorAccentColor('   ')).toBe(DEFAULT_EDITOR_ACCENT_COLOR);
    expect(normalizeEditorAccentColor(undefined)).toBe(DEFAULT_EDITOR_ACCENT_COLOR);
    expect(normalizeEditorLightTheme('paper')).toBe('paper');
    expect(normalizeEditorLightTheme('accent-light')).toBe('midday');
    expect(normalizeEditorLightTheme('clarity')).toBe('clarity');
    expect(normalizeEditorLightTheme('winter')).toBe(DEFAULT_EDITOR_LIGHT_THEME);
    expect(normalizeEditorLightTheme(undefined)).toBe(DEFAULT_EDITOR_LIGHT_THEME);
    expect(normalizeEditorDarkTheme('midnight')).toBe('midnight');
    expect(normalizeEditorDarkTheme('ink')).toBe('ink');
    expect(normalizeEditorDarkTheme('tinted')).toBe('monokai');
    expect(normalizeEditorDarkTheme('night-mode')).toBe(DEFAULT_EDITOR_DARK_THEME);
    expect(normalizeEditorDarkTheme(undefined)).toBe(DEFAULT_EDITOR_DARK_THEME);
  });

  it('resolves auto against system preference', () => {
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(resolveThemeMode('dark', false)).toBe('dark');
    expect(resolveThemeMode('auto', true)).toBe('dark');
    expect(resolveThemeMode('auto', false)).toBe('light');
  });

  it('uses palette-owned accents for paper and monokai', () => {
    expect(
      resolveEditorAccentColor(
        '#1668ff',
        DEFAULT_PAPER_ACCENT_COLOR,
        DEFAULT_MONOKAI_ACCENT_COLOR,
        'light',
        'paper',
        'graphite',
      ),
    ).toBe(DEFAULT_PAPER_ACCENT_COLOR);
    expect(
      resolveEditorAccentColor(
        '#1668ff',
        DEFAULT_PAPER_ACCENT_COLOR,
        DEFAULT_MONOKAI_ACCENT_COLOR,
        'dark',
        'air',
        'monokai',
      ),
    ).toBe(DEFAULT_MONOKAI_ACCENT_COLOR);
    expect(
      resolveEditorAccentColor(
        '#1668ff',
        DEFAULT_PAPER_ACCENT_COLOR,
        DEFAULT_MONOKAI_ACCENT_COLOR,
        'light',
        'clarity',
        'ink',
      ),
    ).toBe('#1668ff');
  });

  it('keeps the blue sticky guide family on the familiar green and yellow baseline', () => {
    expect(resolveStickyGuideColors('#1668ff')).toEqual({
      offsetGuideColor: '#d3a019',
      paddingGuideColor: '#c9a74b',
      offsetLabelBackground: '#e4b12c',
      autoGuideColor: '#2d9f61',
      autoLabelBackground: '#16a34a',
    });
  });

  it('uses light foregrounds for darker accents and dark foregrounds for bright accents', () => {
    expect(resolveAccentSurfaceColors('#1668ff')).toMatchObject({
      accentForeground: '#f8fafc',
      accentForegroundMuted: 'rgba(255, 255, 255, 0.68)',
    });

    expect(resolveAccentSurfaceColors('#facc15')).toMatchObject({
      accentForeground: '#0f172a',
      accentForegroundMuted: 'rgba(15, 23, 42, 0.68)',
    });
  });
});
