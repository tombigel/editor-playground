import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BorderControlGroup,
  HoverColorField,
  ShadowControlGroup,
  formatRgbColorValue,
  normalizeColorFieldValue,
  offsetsFromDistanceAndAngle,
  parseColorFieldValue,
  readShadowFieldValues,
} from '../InspectorControls';

describe('panels/InspectorControls', () => {
  it('parses hex and rgb color formats with opacity', () => {
    expect(parseColorFieldValue('#336699cc')).toEqual({
      red: 51,
      green: 102,
      blue: 153,
      alpha: 0.8,
    });

    expect(parseColorFieldValue('rgb(12 34 56 / 25%)')).toEqual({
      red: 12,
      green: 34,
      blue: 56,
      alpha: 0.25,
    });

    expect(parseColorFieldValue('rgba(12, 34, 56, 0.4)')).toEqual({
      red: 12,
      green: 34,
      blue: 56,
      alpha: 0.4,
    });
  });

  it('normalizes color values into rgb slash-alpha output', () => {
    expect(formatRgbColorValue(51, 102, 153, 0.8)).toBe('rgb(51 102 153 / 0.8)');
    expect(normalizeColorFieldValue('#336699cc', '#ffffff')).toMatchObject({
      hex: '#336699',
      css: 'rgb(51 102 153 / 0.8)',
      opacityPercent: 80,
    });
  });

  it('renders color controls inline with opacity slider and native color input', () => {
    const markup = renderToStaticMarkup(
      <HoverColorField value="rgb(51 102 153 / 0.8)" onChange={() => {}} ariaLabel="Text color" />,
    );

    expect(markup).toContain('aria-label="Text color opacity"');
    expect(markup).toContain('type="color"');
    expect(markup).toContain('min-w-[8.75rem]');
  });

  it('renders shadow numeric controls without unit suffix shells', () => {
    const markup = renderToStaticMarkup(
      <ShadowControlGroup
        color="rgb(0 0 0 / 0.4)"
        blur={12}
        distance={24}
        angle={45}
        colorFallback="#000000"
        onColorChange={() => {}}
        onBlurChange={() => {}}
        onDistanceChange={() => {}}
        onAngleChange={() => {}}
      />,
    );

    expect(markup).toContain('>Blur<');
    expect(markup).toContain('>Distance<');
    expect(markup).toContain('>Angle<');
    expect(markup).not.toContain('>px<');
    expect(markup).not.toContain('>deg<');
  });

  it('renders border controls with a unit selector for radius', () => {
    const markup = renderToStaticMarkup(
      <BorderControlGroup
        colorValue="rgb(216 224 234 / 1)"
        widthValue="1px"
        radiusValue="16%"
        onColorChange={() => {}}
        onWidthChange={() => {}}
        onRadiusChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-label="Border color opacity"');
    expect(markup).toContain('>Width<');
    expect(markup).toContain('>Radius<');
    expect(markup).toContain('>px<');
    expect(markup.match(/data-ui="select-trigger"/g)?.length).toBe(1);
  });

  it('preserves authored shadow angle through distance/offset round-trips', () => {
    const fourDegreeOffsets = offsetsFromDistanceAndAngle(10, 4);
    const fortyFiveDegreeOffsets = offsetsFromDistanceAndAngle(18, 45);

    expect(
      readShadowFieldValues(
        {
          shadowOffsetX: fourDegreeOffsets.offsetX,
          shadowOffsetY: fourDegreeOffsets.offsetY,
        },
        { color: '#000000', blur: 0, distance: 0, angle: 0 },
      ).angle,
    ).toBe(4);

    expect(
      readShadowFieldValues(
        {
          shadowOffsetX: fortyFiveDegreeOffsets.offsetX,
          shadowOffsetY: fortyFiveDegreeOffsets.offsetY,
        },
        { color: '#000000', blur: 0, distance: 0, angle: 0 },
      ).angle,
    ).toBe(45);
  });
});
