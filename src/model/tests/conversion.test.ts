import { describe, expect, it } from 'vitest';
import {
  convertRenderedPxToBorderRadiusUnit,
  convertRenderedPxToFontRelativeUnit,
  convertRenderedPxToGeometryUnit,
  formatDisplayValue,
} from '../conversion';

describe('model/conversion', () => {
  it('converts rendered pixels into geometry units with explicit viewport references', () => {
    const viewport = { width: 1200, height: 800 };

    expect(convertRenderedPxToGeometryUnit(240, 'width', 'px')).toBe(240);
    expect(convertRenderedPxToGeometryUnit(300, 'width', '%', { referenceSizePx: 1200 })).toBe(25);
    expect(convertRenderedPxToGeometryUnit(120, 'width', 'vw', { viewport })).toBe(10);
    expect(convertRenderedPxToGeometryUnit(80, 'height', 'vh', { viewport })).toBe(10);
    expect(convertRenderedPxToGeometryUnit(80, 'width', 'vmin', { viewport })).toBe(10);
    expect(convertRenderedPxToGeometryUnit(120, 'width', 'vmax', { viewport })).toBe(10);
    expect(convertRenderedPxToGeometryUnit(80, 'y', '%', { referenceSizePx: 500 })).toBeNull();
  });

  it('converts rendered pixels into font-relative units', () => {
    expect(
      convertRenderedPxToFontRelativeUnit(32, 'px', { rootFontSizePx: 16, inheritedFontSizePx: 20 }),
    ).toBe(32);
    expect(
      convertRenderedPxToFontRelativeUnit(32, 'em', { rootFontSizePx: 16, inheritedFontSizePx: 20 }),
    ).toBe(1.6);
    expect(
      convertRenderedPxToFontRelativeUnit(32, 'rem', { rootFontSizePx: 16, inheritedFontSizePx: 20 }),
    ).toBe(2);
  });

  it('converts rendered border radius using a stable average-dimension approximation', () => {
    expect(convertRenderedPxToBorderRadiusUnit(18, 'px', { width: 240, height: 120 })).toBe(18);
    expect(convertRenderedPxToBorderRadiusUnit(18, '%', { width: 240, height: 120 })).toBe(10);
  });

  it('formats display numbers consistently', () => {
    expect(formatDisplayValue(12)).toBe('12');
    expect(formatDisplayValue(12.345)).toBe('12.35');
  });
});
