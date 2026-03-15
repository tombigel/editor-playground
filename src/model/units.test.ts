import { describe, expect, it } from 'vitest';
import { formatValue, parseHeightValue, parseUnitValue, parseWidthValue, resolveUnitValuePx } from './units';

describe('model/units', () => {
  it('parses unit values and rejects invalid values', () => {
    expect(parseUnitValue('12px').parsed).toEqual({ value: 12, unit: 'px' });
    expect(parseUnitValue('-5.5vh').parsed).toEqual({ value: -5.5, unit: 'vh' });
    expect(() => parseUnitValue('12rem')).toThrow('Invalid unit value');
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
  });

  it('resolves units into px with axis-aware percentages', () => {
    const ref = { width: 500, height: 200, viewportWidth: 1200, viewportHeight: 900 };
    expect(resolveUnitValuePx(parseUnitValue('50%').parsed, ref, 'width')).toBe(250);
    expect(resolveUnitValuePx(parseUnitValue('50%').parsed, ref, 'height')).toBe(100);
    expect(resolveUnitValuePx(parseUnitValue('10vw').parsed, ref, 'x')).toBe(120);
    expect(resolveUnitValuePx(parseUnitValue('20vh').parsed, ref, 'y')).toBe(180);
  });
});
