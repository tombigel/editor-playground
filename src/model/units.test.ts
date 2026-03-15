import { describe, expect, it } from 'vitest';
import { formatValue, parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue, resolveFontSizePx, resolveUnitValuePx } from './units';

describe('model/units', () => {
  it('parses unit values and rejects invalid values', () => {
    expect(parseUnitValue('12px').parsed).toEqual({ value: 12, unit: 'px' });
    expect(parseUnitValue('-5.5vh').parsed).toEqual({ value: -5.5, unit: 'vh' });
    expect(parseUnitValue('10vmin').parsed).toEqual({ value: 10, unit: 'vmin' });
    expect(parseUnitValue('12vmax').parsed).toEqual({ value: 12, unit: 'vmax' });
    expect(() => parseUnitValue('12rem')).toThrow('Invalid unit value');
  });

  it('parses font size values and rejects invalid ones', () => {
    expect(parseFontSizeValue('18px').parsed).toEqual({ value: 18, unit: 'px' });
    expect(parseFontSizeValue('1.25em').parsed).toEqual({ value: 1.25, unit: 'em' });
    expect(parseFontSizeValue('0.875rem').parsed).toEqual({ value: 0.875, unit: 'rem' });
    expect(() => parseFontSizeValue('10vh')).toThrow('Invalid font size value');
  });

  it('parses width keywords and numeric widths', () => {
    expect(parseWidthValue('fit-content').parsed).toEqual({ keyword: 'fit-content' });
    expect(parseWidthValue('min-content').parsed).toEqual({ keyword: 'min-content' });
    expect(parseWidthValue('max-content').parsed).toEqual({ keyword: 'max-content' });
    expect(parseWidthValue('75%').parsed).toEqual({ value: 75, unit: '%' });
  });

  it('parses auto and aspect-ratio heights', () => {
    expect(parseHeightValue('auto').parsed).toEqual({ keyword: 'auto' });
    expect(parseHeightValue('aspect-ratio(4/3)').parsed).toEqual({
      keyword: 'aspect-ratio',
      ratio: 4 / 3,
    });
    expect(() => parseHeightValue('aspect-ratio(0/3)')).toThrow('Invalid aspect ratio');
  });

  it('formats parsed values back to css-like strings', () => {
    expect(formatValue(parseUnitValue('10px').parsed)).toBe('10px');
    expect(formatValue(parseWidthValue('fit-content').parsed)).toBe('fit-content');
    expect(formatValue(parseWidthValue('min-content').parsed)).toBe('min-content');
    expect(formatValue(parseWidthValue('max-content').parsed)).toBe('max-content');
    expect(formatValue(parseHeightValue('aspect-ratio(1.5)').parsed)).toBe('aspect-ratio(1.5)');
    expect(formatValue(parseFontSizeValue('1.25rem').parsed)).toBe('1.25rem');
  });

  it('resolves units into px with axis-aware percentages', () => {
    const ref = { width: 500, height: 200, viewportWidth: 1200, viewportHeight: 900 };
    expect(resolveUnitValuePx(parseUnitValue('50%').parsed, ref, 'width')).toBe(250);
    expect(resolveUnitValuePx(parseUnitValue('50%').parsed, ref, 'height')).toBe(100);
    expect(resolveUnitValuePx(parseUnitValue('10vw').parsed, ref, 'x')).toBe(120);
    expect(resolveUnitValuePx(parseUnitValue('20vh').parsed, ref, 'y')).toBe(180);
    expect(resolveUnitValuePx(parseUnitValue('10vmin').parsed, ref, 'width')).toBe(90);
    expect(resolveUnitValuePx(parseUnitValue('10vmax').parsed, ref, 'width')).toBe(120);
  });

  it('resolves font size units into px', () => {
    expect(resolveFontSizePx(parseFontSizeValue('18px').parsed, { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(18);
    expect(resolveFontSizePx(parseFontSizeValue('1.5em').parsed, { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(30);
    expect(resolveFontSizePx(parseFontSizeValue('2rem').parsed, { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(32);
  });
});
