import { describe, expect, it } from 'vitest';
import { normalizeThemeMode, resolveThemeMode } from '../theme';

describe('lib/theme', () => {
  it('normalizes unsupported values to auto', () => {
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode('dark')).toBe('dark');
    expect(normalizeThemeMode('auto')).toBe('auto');
    expect(normalizeThemeMode('nope')).toBe('auto');
    expect(normalizeThemeMode(undefined)).toBe('auto');
  });

  it('resolves auto against system preference', () => {
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(resolveThemeMode('dark', false)).toBe('dark');
    expect(resolveThemeMode('auto', true)).toBe('dark');
    expect(resolveThemeMode('auto', false)).toBe('light');
  });
});
