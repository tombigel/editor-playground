import { describe, expect, it } from 'vitest';
import type { BorderStyle, ShadowStyle } from '../../../model/types';
import {
  buildSizeFieldValue,
  clamp,
  clampFieldNumber,
  convertRenderedPxToBorderRadiusValue,
  convertRenderedPxToFontSizeValue,
  convertRenderedPxToSpacingValue,
  convertRenderedPxToUnitValue,
  describeSizeFieldValue,
  extractAspectRatioExpression,
  formatFieldNumber,
  formatNumericFieldInput,
  getAllowedNumericSizeModes,
  getDefaultNumericDraft,
  getDefaultNumericMode,
  getInitialAspectDraft,
  getInitialSizeFieldMode,
  getSizeModeOptions,
  isNumericSizeFieldMode,
  normalizeAspectRatioExpression,
  offsetsFromDistanceAndAngle,
  readShadowFieldValues,
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
  resolveSizeFieldMode,
  validateNumberInputDraft,
  FONT_SIZE_SUGGESTIONS_BY_UNIT,
  FONT_SIZE_UNIT_OPTIONS,
  HEIGHT_KEYWORD_OPTIONS,
  WIDTH_KEYWORD_OPTIONS,
} from '../stageConversions';
import type { SizeFieldDescriptor } from '../stageConversions';

describe('panels/inspector/stageConversions', () => {
  // ---------------------------------------------------------------------------
  // Number / field formatting helpers
  // ---------------------------------------------------------------------------

  describe('clampFieldNumber', () => {
    it('rounds to 2 decimal places', () => {
      expect(clampFieldNumber(1.234)).toBe(1.23);
      expect(clampFieldNumber(1.235)).toBe(1.24);
      expect(clampFieldNumber(5)).toBe(5);
    });
  });

  describe('formatFieldNumber', () => {
    it('strips trailing zeros and unnecessary decimal point', () => {
      expect(formatFieldNumber(10)).toBe('10');
      expect(formatFieldNumber(1.5)).toBe('1.5');
      expect(formatFieldNumber(1.0)).toBe('1');
      expect(formatFieldNumber(0.1)).toBe('0.1');
    });
  });

  describe('formatNumericFieldInput', () => {
    it('delegates to formatFieldNumber', () => {
      expect(formatNumericFieldInput(24)).toBe('24');
      expect(formatNumericFieldInput(3.14159)).toBe('3.14');
    });
  });

  describe('clamp', () => {
    it('clamps value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles min equal to max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });
  });

  describe('validateNumberInputDraft', () => {
    it('returns invalid for empty or whitespace-only input', () => {
      expect(validateNumberInputDraft('', 0, 100)).toEqual({ isValid: false, nextValue: null });
      expect(validateNumberInputDraft('   ', 0, 100)).toEqual({ isValid: false, nextValue: null });
    });

    it('returns invalid for non-numeric input', () => {
      expect(validateNumberInputDraft('abc', 0, 100)).toEqual({ isValid: false, nextValue: null });
      expect(validateNumberInputDraft('NaN', 0, 100)).toEqual({ isValid: false, nextValue: null });
    });

    it('returns invalid for values outside range', () => {
      expect(validateNumberInputDraft('-1', 0, 100)).toEqual({ isValid: false, nextValue: null });
      expect(validateNumberInputDraft('101', 0, 100)).toEqual({ isValid: false, nextValue: null });
    });

    it('returns valid for values within range', () => {
      expect(validateNumberInputDraft('50', 0, 100)).toEqual({ isValid: true, nextValue: 50 });
      expect(validateNumberInputDraft('0', 0, 100)).toEqual({ isValid: true, nextValue: 0 });
      expect(validateNumberInputDraft('100', 0, 100)).toEqual({ isValid: true, nextValue: 100 });
    });

    it('parses floats correctly', () => {
      expect(validateNumberInputDraft('3.14', 0, 10)).toEqual({ isValid: true, nextValue: 3.14 });
    });

    it('returns invalid for Infinity', () => {
      expect(validateNumberInputDraft('Infinity', 0, 100)).toEqual({ isValid: false, nextValue: null });
    });
  });

  // ---------------------------------------------------------------------------
  // Aspect ratio helpers
  // ---------------------------------------------------------------------------

  describe('normalizeAspectRatioExpression', () => {
    it('accepts a plain positive number', () => {
      expect(normalizeAspectRatioExpression('1.5')).toBe('1.5');
      expect(normalizeAspectRatioExpression('  2  ')).toBe('2');
    });

    it('rejects zero and negative numbers', () => {
      expect(normalizeAspectRatioExpression('0')).toBeNull();
      expect(normalizeAspectRatioExpression('-1')).toBeNull();
    });

    it('accepts fraction notation with optional whitespace', () => {
      expect(normalizeAspectRatioExpression('16/9')).toBe('16/9');
      expect(normalizeAspectRatioExpression(' 4 / 3 ')).toBe('4/3');
    });

    it('rejects fractions with zero parts', () => {
      expect(normalizeAspectRatioExpression('0/9')).toBeNull();
      expect(normalizeAspectRatioExpression('16/0')).toBeNull();
    });

    it('rejects non-numeric or malformed input', () => {
      expect(normalizeAspectRatioExpression('abc')).toBeNull();
      expect(normalizeAspectRatioExpression('16/')).toBeNull();
      expect(normalizeAspectRatioExpression('/9')).toBeNull();
      expect(normalizeAspectRatioExpression('')).toBeNull();
    });
  });

  describe('extractAspectRatioExpression', () => {
    it('extracts expression from aspect-ratio(...) wrapper', () => {
      expect(extractAspectRatioExpression('aspect-ratio(16/9)')).toBe('16/9');
      expect(extractAspectRatioExpression('aspect-ratio( 4/3 )')).toBe('4/3');
      expect(extractAspectRatioExpression('aspect-ratio(1.5)')).toBe('1.5');
    });

    it('returns default 16/9 for non-matching input', () => {
      expect(extractAspectRatioExpression('auto')).toBe('16/9');
      expect(extractAspectRatioExpression('100px')).toBe('16/9');
      expect(extractAspectRatioExpression('')).toBe('16/9');
    });
  });

  // ---------------------------------------------------------------------------
  // Size field descriptor helpers
  // ---------------------------------------------------------------------------

  describe('describeSizeFieldValue', () => {
    it('describes numeric px values for x/y axes', () => {
      const result = describeSizeFieldValue('120px', 'x');
      expect(result.kind).toBe('numeric');
      expect(result.mode).toBe('px');
      expect(result.input).toBe('120');
    });

    it('describes numeric % values for width', () => {
      const result = describeSizeFieldValue('50%', 'width');
      expect(result.kind).toBe('numeric');
      expect(result.mode).toBe('%');
      expect(result.input).toBe('50');
    });

    it('describes width keyword values', () => {
      expect(describeSizeFieldValue('fit-content', 'width')).toEqual({
        kind: 'keyword',
        mode: 'fit-content',
        input: '',
      });
      expect(describeSizeFieldValue('min-content', 'width')).toEqual({
        kind: 'keyword',
        mode: 'min-content',
        input: '',
      });
    });

    it('describes height auto keyword', () => {
      expect(describeSizeFieldValue('auto', 'height')).toEqual({
        kind: 'keyword',
        mode: 'auto',
        input: '',
      });
    });

    it('describes aspect-ratio for height', () => {
      const result = describeSizeFieldValue('aspect-ratio(16/9)', 'height');
      expect(result.kind).toBe('aspect-ratio');
      expect(result.mode).toBe('aspect-ratio');
      expect(result.input).toBe('16/9');
    });

    it('describes viewport units for height', () => {
      const result = describeSizeFieldValue('50vh', 'height');
      expect(result.kind).toBe('numeric');
      expect(result.mode).toBe('vh');
      expect(result.input).toBe('50');
    });
  });

  describe('buildSizeFieldValue', () => {
    it('builds px value for x axis', () => {
      expect(buildSizeFieldValue('x', 'px', '100')).toBe('100px');
    });

    it('builds px value for y axis with negative', () => {
      expect(buildSizeFieldValue('y', 'px', '-50')).toBe('-50px');
    });

    it('rejects non-px modes for x/y', () => {
      expect(buildSizeFieldValue('x', '%', '50')).toBeNull();
      expect(buildSizeFieldValue('y', 'vh', '10')).toBeNull();
    });

    it('builds numeric width values', () => {
      expect(buildSizeFieldValue('width', 'px', '240')).toBe('240px');
      expect(buildSizeFieldValue('width', '%', '50')).toBe('50%');
    });

    it('rejects negative width/height for numeric modes', () => {
      expect(buildSizeFieldValue('width', 'px', '-10')).toBeNull();
      expect(buildSizeFieldValue('height', 'px', '-5')).toBeNull();
    });

    it('builds keyword values for width', () => {
      expect(buildSizeFieldValue('width', 'fit-content', '')).toBe('fit-content');
      expect(buildSizeFieldValue('width', 'min-content', '')).toBe('min-content');
      expect(buildSizeFieldValue('width', 'max-content', '')).toBe('max-content');
    });

    it('rejects width keywords on height axis', () => {
      expect(buildSizeFieldValue('height', 'fit-content', '')).toBeNull();
    });

    it('builds auto for height only', () => {
      expect(buildSizeFieldValue('height', 'auto', '')).toBe('auto');
      expect(buildSizeFieldValue('width', 'auto', '')).toBeNull();
    });

    it('builds aspect-ratio for height only', () => {
      expect(buildSizeFieldValue('height', 'aspect-ratio', '16/9')).toBe('aspect-ratio(16/9)');
      expect(buildSizeFieldValue('width', 'aspect-ratio', '16/9')).toBeNull();
    });

    it('rejects invalid aspect-ratio expressions', () => {
      expect(buildSizeFieldValue('height', 'aspect-ratio', 'abc')).toBeNull();
      expect(buildSizeFieldValue('height', 'aspect-ratio', '0/9')).toBeNull();
    });

    it('rejects non-numeric input for numeric modes', () => {
      expect(buildSizeFieldValue('width', 'px', 'abc')).toBeNull();
      expect(buildSizeFieldValue('width', 'px', '')).toBeNull();
    });

    it('rejects non-numeric input for x/y position', () => {
      expect(buildSizeFieldValue('x', 'px', 'foo')).toBeNull();
    });

    it('allows viewport units for section heights', () => {
      expect(buildSizeFieldValue('height', 'vh', '100', { isSectionHeight: true })).toBe('100vh');
      expect(buildSizeFieldValue('height', 'vmin', '50', { isSectionHeight: true })).toBe('50vmin');
      expect(buildSizeFieldValue('height', 'vmax', '80', { isSectionHeight: true })).toBe('80vmax');
    });

    it('rejects viewport units for non-section heights', () => {
      expect(buildSizeFieldValue('height', 'vh', '100')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Size mode helpers
  // ---------------------------------------------------------------------------

  describe('getSizeModeOptions', () => {
    it('returns only px for x/y axes', () => {
      const result = getSizeModeOptions('x');
      expect(result.scalarUnits).toEqual(['px']);
      expect(result.keywords).toBeNull();
      expect(result.selectableModes).toEqual(['px']);
    });

    it('returns px, %, and width keywords for width axis', () => {
      const result = getSizeModeOptions('width');
      expect(result.scalarUnits).toEqual(['px', '%']);
      expect(result.keywords).toEqual(['fit-content', 'min-content', 'max-content']);
      expect(result.selectableModes).toContain('px');
      expect(result.selectableModes).toContain('%');
      expect(result.selectableModes).toContain('fit-content');
    });

    it('returns px, %, and height keywords for height axis', () => {
      const result = getSizeModeOptions('height');
      expect(result.scalarUnits).toEqual(['px', '%']);
      expect(result.keywords).toEqual(['auto', 'aspect-ratio']);
    });

    it('includes viewport units for section height', () => {
      const result = getSizeModeOptions('height', { isSectionHeight: true });
      expect(result.viewportUnits).toEqual(['vh', 'vmin', 'vmax']);
      expect(result.selectableModes).toContain('vh');
      expect(result.selectableModes).toContain('vmin');
      expect(result.selectableModes).toContain('vmax');
    });

    it('does not include viewport units for non-section height', () => {
      const result = getSizeModeOptions('height');
      expect(result.viewportUnits).toEqual([]);
    });
  });

  describe('isNumericSizeFieldMode', () => {
    it('returns true for numeric modes', () => {
      expect(isNumericSizeFieldMode('px')).toBe(true);
      expect(isNumericSizeFieldMode('%')).toBe(true);
      expect(isNumericSizeFieldMode('vw')).toBe(true);
      expect(isNumericSizeFieldMode('vh')).toBe(true);
      expect(isNumericSizeFieldMode('vmin')).toBe(true);
      expect(isNumericSizeFieldMode('vmax')).toBe(true);
    });

    it('returns false for keyword modes', () => {
      expect(isNumericSizeFieldMode('fit-content')).toBe(false);
      expect(isNumericSizeFieldMode('auto')).toBe(false);
      expect(isNumericSizeFieldMode('aspect-ratio')).toBe(false);
      expect(isNumericSizeFieldMode('min-content')).toBe(false);
      expect(isNumericSizeFieldMode('max-content')).toBe(false);
    });
  });

  describe('getAllowedNumericSizeModes', () => {
    it('returns px only for x axis', () => {
      expect(getAllowedNumericSizeModes('x', false)).toEqual(['px']);
    });

    it('returns px and % for width', () => {
      expect(getAllowedNumericSizeModes('width', false)).toEqual(['px', '%']);
    });

    it('adds viewport units for section height', () => {
      const modes = getAllowedNumericSizeModes('height', true);
      expect(modes).toContain('px');
      expect(modes).toContain('%');
      expect(modes).toContain('vh');
      expect(modes).toContain('vmin');
      expect(modes).toContain('vmax');
    });
  });

  describe('getDefaultNumericMode', () => {
    it('returns px for all axes', () => {
      expect(getDefaultNumericMode('x', false)).toBe('px');
      expect(getDefaultNumericMode('y', false)).toBe('px');
      expect(getDefaultNumericMode('width', false)).toBe('px');
      expect(getDefaultNumericMode('height', false)).toBe('px');
      expect(getDefaultNumericMode('height', true)).toBe('px');
    });
  });

  describe('resolveSizeFieldMode', () => {
    it('returns keyword mode unchanged', () => {
      const desc: SizeFieldDescriptor = { kind: 'keyword', mode: 'fit-content', input: '' };
      expect(resolveSizeFieldMode(desc, 'width', false)).toBe('fit-content');
    });

    it('returns aspect-ratio mode unchanged', () => {
      const desc: SizeFieldDescriptor = { kind: 'aspect-ratio', mode: 'aspect-ratio', input: '16/9' };
      expect(resolveSizeFieldMode(desc, 'height', false)).toBe('aspect-ratio');
    });

    it('returns the numeric mode when it is allowed', () => {
      const desc: SizeFieldDescriptor = { kind: 'numeric', mode: '%', input: '50' };
      expect(resolveSizeFieldMode(desc, 'width', false)).toBe('%');
    });

    it('falls back to default when numeric mode is not allowed', () => {
      const desc: SizeFieldDescriptor = { kind: 'numeric', mode: 'vh', input: '50' };
      expect(resolveSizeFieldMode(desc, 'height', false)).toBe('px');
    });

    it('allows vh mode for section height', () => {
      const desc: SizeFieldDescriptor = { kind: 'numeric', mode: 'vh', input: '50' };
      expect(resolveSizeFieldMode(desc, 'height', true)).toBe('vh');
    });
  });

  describe('getInitialSizeFieldMode', () => {
    it('returns the mode from the parsed value', () => {
      expect(getInitialSizeFieldMode('100px', 'width', false)).toBe('px');
      expect(getInitialSizeFieldMode('50%', 'width', false)).toBe('%');
      expect(getInitialSizeFieldMode('fit-content', 'width', false)).toBe('fit-content');
      expect(getInitialSizeFieldMode('auto', 'height', false)).toBe('auto');
    });
  });

  describe('getInitialAspectDraft', () => {
    it('returns the ratio expression for aspect-ratio values', () => {
      expect(getInitialAspectDraft('aspect-ratio(4/3)')).toBe('4/3');
    });

    it('returns default 16/9 for non-aspect-ratio values', () => {
      expect(getInitialAspectDraft('auto')).toBe('16/9');
      expect(getInitialAspectDraft('100px')).toBe('16/9');
    });

    it('returns default 16/9 for invalid values', () => {
      expect(getInitialAspectDraft('')).toBe('16/9');
    });
  });

  describe('getDefaultNumericDraft', () => {
    it('returns 240 for width', () => {
      expect(getDefaultNumericDraft('width')).toBe('240');
    });

    it('returns 120 for height', () => {
      expect(getDefaultNumericDraft('height')).toBe('120');
    });

    it('returns 0 for x and y', () => {
      expect(getDefaultNumericDraft('x')).toBe('0');
      expect(getDefaultNumericDraft('y')).toBe('0');
    });
  });

  // ---------------------------------------------------------------------------
  // Stage measurement conversions (pure, no DOM)
  // ---------------------------------------------------------------------------

  describe('convertRenderedPxToUnitValue', () => {
    it('converts px to px (identity)', () => {
      expect(convertRenderedPxToUnitValue(100, 'width', 'px')).toBe(100);
      expect(convertRenderedPxToUnitValue(0, 'x', 'px')).toBe(0);
    });

    it('converts px to % using parent size', () => {
      expect(convertRenderedPxToUnitValue(50, 'width', '%', 200)).toBe(25);
      expect(convertRenderedPxToUnitValue(100, 'height', '%', 400)).toBe(25);
    });

    it('returns null for % on x/y axis', () => {
      expect(convertRenderedPxToUnitValue(50, 'x', '%', 200)).toBeNull();
      expect(convertRenderedPxToUnitValue(50, 'y', '%', 200)).toBeNull();
    });

    it('returns null for % when parent size is 0 or missing', () => {
      expect(convertRenderedPxToUnitValue(50, 'width', '%', 0)).toBeNull();
      expect(convertRenderedPxToUnitValue(50, 'width', '%')).toBeNull();
    });

    it('converts px to vw using viewport width', () => {
      expect(convertRenderedPxToUnitValue(120, 'width', 'vw', undefined, 1200)).toBe(10);
    });

    it('converts px to vh using viewport height', () => {
      expect(convertRenderedPxToUnitValue(90, 'height', 'vh', undefined, 900)).toBe(10);
    });

    it('converts px to vmin using viewport size', () => {
      // vmin: viewport = {width: viewportSize, height: viewportSize}
      expect(convertRenderedPxToUnitValue(50, 'width', 'vmin', undefined, 500)).toBe(10);
    });

    it('converts px to vmax using viewport size', () => {
      expect(convertRenderedPxToUnitValue(50, 'width', 'vmax', undefined, 500)).toBe(10);
    });

    it('returns null for viewport units when viewport is zero', () => {
      expect(convertRenderedPxToUnitValue(50, 'width', 'vw', undefined, 0)).toBeNull();
    });

    it('returns null for NaN input', () => {
      expect(convertRenderedPxToUnitValue(NaN, 'width', 'px')).toBeNull();
    });
  });

  describe('convertRenderedPxToFontSizeValue', () => {
    const ref = { rootFontSizePx: 16, inheritedFontSizePx: 20 };

    it('returns px value unchanged (rounded)', () => {
      expect(convertRenderedPxToFontSizeValue(18, 'px', ref)).toBe(18);
    });

    it('converts px to em using inherited font size', () => {
      expect(convertRenderedPxToFontSizeValue(30, 'em', ref)).toBe(1.5);
    });

    it('converts px to rem using root font size', () => {
      expect(convertRenderedPxToFontSizeValue(32, 'rem', ref)).toBe(2);
    });

    it('returns null for zero px', () => {
      expect(convertRenderedPxToFontSizeValue(0, 'px', ref)).toBeNull();
    });

    it('returns null for negative px', () => {
      expect(convertRenderedPxToFontSizeValue(-5, 'em', ref)).toBeNull();
    });

    it('returns null when reference size is zero', () => {
      expect(convertRenderedPxToFontSizeValue(16, 'em', { rootFontSizePx: 16, inheritedFontSizePx: 0 })).toBeNull();
      expect(convertRenderedPxToFontSizeValue(16, 'rem', { rootFontSizePx: 0, inheritedFontSizePx: 16 })).toBeNull();
    });
  });

  describe('convertRenderedPxToSpacingValue', () => {
    const ref = { rootFontSizePx: 16, inheritedFontSizePx: 20 };

    it('returns rounded px value', () => {
      // spacing px is Math.round'd
      expect(convertRenderedPxToSpacingValue(10.6, 'px', ref)).toBe(11);
    });

    it('converts px to em', () => {
      expect(convertRenderedPxToSpacingValue(30, 'em', ref)).toBe(1.5);
    });

    it('converts px to rem', () => {
      expect(convertRenderedPxToSpacingValue(32, 'rem', ref)).toBe(2);
    });

    it('returns null for zero px', () => {
      expect(convertRenderedPxToSpacingValue(0, 'px', ref)).toBeNull();
    });
  });

  describe('convertRenderedPxToBorderRadiusValue', () => {
    const box = { width: 200, height: 100 };

    it('returns px unchanged (rounded)', () => {
      expect(convertRenderedPxToBorderRadiusValue(10, 'px', box)).toBe(10);
    });

    it('converts px to % based on average of width and height', () => {
      // basis = (200+100)/2 = 150, 15/150*100 = 10
      expect(convertRenderedPxToBorderRadiusValue(15, '%', box)).toBe(10);
    });

    it('returns null for negative px', () => {
      expect(convertRenderedPxToBorderRadiusValue(-1, 'px', box)).toBeNull();
    });

    it('returns null for zero-dimension box', () => {
      expect(convertRenderedPxToBorderRadiusValue(10, '%', { width: 0, height: 100 })).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Border / shadow read helpers
  // ---------------------------------------------------------------------------

  describe('readUnifiedBorderColor', () => {
    it('returns empty string for undefined style', () => {
      expect(readUnifiedBorderColor(undefined)).toBe('');
    });

    it('returns shorthand borderColor when set', () => {
      expect(readUnifiedBorderColor({ borderColor: '#ff0000' })).toBe('#ff0000');
    });

    it('returns the color when all four sides match', () => {
      expect(
        readUnifiedBorderColor({
          borderTopColor: '#333',
          borderRightColor: '#333',
          borderBottomColor: '#333',
          borderLeftColor: '#333',
        }),
      ).toBe('#333');
    });

    it('returns empty string when sides differ', () => {
      expect(
        readUnifiedBorderColor({
          borderTopColor: '#333',
          borderRightColor: '#444',
          borderBottomColor: '#333',
          borderLeftColor: '#333',
        }),
      ).toBe('');
    });

    it('returns empty string when some sides are missing', () => {
      expect(
        readUnifiedBorderColor({
          borderTopColor: '#333',
          borderRightColor: '#333',
        }),
      ).toBe('');
    });
  });

  describe('readUnifiedBorderWidth', () => {
    it('returns empty string for undefined style', () => {
      expect(readUnifiedBorderWidth(undefined)).toBe('');
    });

    it('returns shorthand borderWidth raw when set', () => {
      const style: BorderStyle = {
        borderWidth: { raw: '2px', parsed: { value: 2, unit: 'px' } },
      };
      expect(readUnifiedBorderWidth(style)).toBe('2px');
    });

    it('returns unified raw when all four sides match', () => {
      const side = { raw: '1px', parsed: { value: 1, unit: 'px' as const } };
      const style: BorderStyle = {
        borderTopWidth: side,
        borderRightWidth: side,
        borderBottomWidth: side,
        borderLeftWidth: side,
      };
      expect(readUnifiedBorderWidth(style)).toBe('1px');
    });

    it('returns empty string when sides differ', () => {
      const style: BorderStyle = {
        borderTopWidth: { raw: '1px', parsed: { value: 1, unit: 'px' as const } },
        borderRightWidth: { raw: '2px', parsed: { value: 2, unit: 'px' as const } },
        borderBottomWidth: { raw: '1px', parsed: { value: 1, unit: 'px' as const } },
        borderLeftWidth: { raw: '1px', parsed: { value: 1, unit: 'px' as const } },
      };
      expect(readUnifiedBorderWidth(style)).toBe('');
    });
  });

  describe('readUnifiedBorderRadius', () => {
    it('returns empty string for undefined style', () => {
      expect(readUnifiedBorderRadius(undefined)).toBe('');
    });

    it('returns shorthand borderRadius raw when set', () => {
      const style: BorderStyle = {
        borderRadius: { raw: '8px', parsed: { value: 8, unit: 'px' } },
      };
      expect(readUnifiedBorderRadius(style)).toBe('8px');
    });

    it('returns unified raw when all four corners match', () => {
      const corner = { raw: '4px', parsed: { value: 4, unit: 'px' as const } };
      const style: BorderStyle = {
        borderTopLeftRadius: corner,
        borderTopRightRadius: corner,
        borderBottomRightRadius: corner,
        borderBottomLeftRadius: corner,
      };
      expect(readUnifiedBorderRadius(style)).toBe('4px');
    });

    it('returns empty string when corners differ', () => {
      const style: BorderStyle = {
        borderTopLeftRadius: { raw: '4px', parsed: { value: 4, unit: 'px' as const } },
        borderTopRightRadius: { raw: '8px', parsed: { value: 8, unit: 'px' as const } },
        borderBottomRightRadius: { raw: '4px', parsed: { value: 4, unit: 'px' as const } },
        borderBottomLeftRadius: { raw: '4px', parsed: { value: 4, unit: 'px' as const } },
      };
      expect(readUnifiedBorderRadius(style)).toBe('');
    });
  });

  describe('readShadowFieldValues', () => {
    const fallback = { color: '#000', blur: 4, spread: 0, distance: 5, angle: 0 };

    it('uses fallback values when style is undefined', () => {
      const result = readShadowFieldValues(undefined, fallback);
      expect(result.color).toBe('#000');
      expect(result.blur).toBe(4);
      expect(result.spread).toBe(0);
      expect(result.distance).toBe(5);
      expect(result.angle).toBe(0);
    });

    it('uses style values when provided', () => {
      const style: ShadowStyle = {
        shadowColor: '#f00',
        shadowBlur: 10,
        shadowSpread: 2,
        shadowOffsetX: 3,
        shadowOffsetY: 4,
      };
      const result = readShadowFieldValues(style, fallback);
      expect(result.color).toBe('#f00');
      expect(result.blur).toBe(10);
      expect(result.spread).toBe(2);
      expect(result.distance).toBe(5); // sqrt(3^2 + 4^2) = 5
    });

    it('computes angle from offsets', () => {
      const style: ShadowStyle = {
        shadowOffsetX: 5,
        shadowOffsetY: 0,
      };
      const result = readShadowFieldValues(style, fallback);
      expect(result.angle).toBe(0);
    });

    it('computes 90-degree angle for downward shadow', () => {
      const style: ShadowStyle = {
        shadowOffsetX: 0,
        shadowOffsetY: 5,
      };
      const result = readShadowFieldValues(style, fallback);
      expect(result.angle).toBe(90);
    });
  });

  describe('offsetsFromDistanceAndAngle', () => {
    it('returns correct offsets for 0 degrees', () => {
      const result = offsetsFromDistanceAndAngle(10, 0);
      expect(result.offsetX).toBeCloseTo(10, 5);
      expect(result.offsetY).toBeCloseTo(0, 5);
    });

    it('returns correct offsets for 90 degrees', () => {
      const result = offsetsFromDistanceAndAngle(10, 90);
      expect(result.offsetX).toBeCloseTo(0, 5);
      expect(result.offsetY).toBeCloseTo(10, 5);
    });

    it('returns correct offsets for 45 degrees', () => {
      const result = offsetsFromDistanceAndAngle(10, 45);
      const expected = 10 * Math.cos(Math.PI / 4);
      expect(result.offsetX).toBeCloseTo(expected, 5);
      expect(result.offsetY).toBeCloseTo(expected, 5);
    });

    it('returns zero offsets for zero distance', () => {
      const result = offsetsFromDistanceAndAngle(0, 45);
      expect(result.offsetX).toBeCloseTo(0, 5);
      expect(result.offsetY).toBeCloseTo(0, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  describe('exported constants', () => {
    it('WIDTH_KEYWORD_OPTIONS contains expected keywords', () => {
      expect(WIDTH_KEYWORD_OPTIONS).toEqual(['fit-content', 'min-content', 'max-content']);
    });

    it('HEIGHT_KEYWORD_OPTIONS contains expected keywords', () => {
      expect(HEIGHT_KEYWORD_OPTIONS).toEqual(['auto', 'aspect-ratio']);
    });

    it('FONT_SIZE_UNIT_OPTIONS contains px, em, rem', () => {
      expect(FONT_SIZE_UNIT_OPTIONS).toEqual(['px', 'em', 'rem']);
    });

    it('FONT_SIZE_SUGGESTIONS_BY_UNIT has entries for each unit', () => {
      expect(FONT_SIZE_SUGGESTIONS_BY_UNIT.px.length).toBeGreaterThan(0);
      expect(FONT_SIZE_SUGGESTIONS_BY_UNIT.em.length).toBeGreaterThan(0);
      expect(FONT_SIZE_SUGGESTIONS_BY_UNIT.rem.length).toBeGreaterThan(0);
    });
  });
});
