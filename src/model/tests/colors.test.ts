import { describe, expect, it } from 'vitest';
import { forceOpaqueColorValue, isFullyTransparentColorValue } from '../colors';

describe('model/colors', () => {
  it('forces color values opaque when opacity is not allowed', () => {
    expect(forceOpaqueColorValue('#336699cc')).toBe('#336699');
    expect(forceOpaqueColorValue('rgb(12 34 56 / 25%)')).toBe('rgb(12 34 56)');
    expect(forceOpaqueColorValue('rgba(12, 34, 56, 0.4)')).toBe('rgb(12, 34, 56)');
    expect(forceOpaqueColorValue('oklch(70% 0.2 250 / 0.7)')).toBe('oklch(70% 0.2 250)');
    expect(forceOpaqueColorValue('color(display-p3 0.24 0.52 0.88 / 0.9)')).toBe('color(display-p3 0.24 0.52 0.88)');
  });

  it('detects fully transparent authored colors across supported syntaxes', () => {
    expect(isFullyTransparentColorValue('transparent')).toBe(true);
    expect(isFullyTransparentColorValue('#1230')).toBe(true);
    expect(isFullyTransparentColorValue('#12345600')).toBe(true);
    expect(isFullyTransparentColorValue('rgba(12, 34, 56, 0)')).toBe(true);
    expect(isFullyTransparentColorValue('rgb(12 34 56 / 0%)')).toBe(true);
    expect(isFullyTransparentColorValue('oklch(70% 0.2 250 / 0)')).toBe(true);
    expect(isFullyTransparentColorValue('color(display-p3 0.24 0.52 0.88 / 0)')).toBe(true);
    expect(isFullyTransparentColorValue('#123456')).toBe(false);
    expect(isFullyTransparentColorValue('rgba(12, 34, 56, 0.2)')).toBe(false);
    expect(isFullyTransparentColorValue('oklch(70% 0.2 250 / 0.7)')).toBe(false);
  });
});
