import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BorderControlGroup,
  forceOpaqueColorValue,
  HoverColorField,
  ShadowControlGroup,
  offsetsFromDistanceAndAngle,
  readShadowFieldValues,
} from '../InspectorControls';

describe('panels/InspectorControls', () => {
  it('strips alpha from color values used in non-alpha fields', () => {
    expect(forceOpaqueColorValue('#336699cc')).toBe('#336699');
    expect(forceOpaqueColorValue('rgb(12 34 56 / 25%)')).toBe('rgb(12 34 56)');
    expect(forceOpaqueColorValue('rgba(12, 34, 56, 0.4)')).toBe('rgb(12, 34, 56)');
    expect(forceOpaqueColorValue('oklch(70% 0.2 250 / 0.7)')).toBe('oklch(70% 0.2 250)');
    expect(forceOpaqueColorValue('color(display-p3 0.24 0.52 0.88 / 0.9)')).toBe('color(display-p3 0.24 0.52 0.88)');
  });

  it('renders color controls inline with the advanced color picker element', () => {
    const markup = renderToStaticMarkup(
      <HoverColorField value="oklch(62% 0.18 252 / 0.8)" onChange={() => {}} ariaLabel="Text color" />,
    );

    expect(markup).toContain('<color-input');
    expect(markup).toContain('data-ui="color-picker"');
    expect(markup).toContain('aria-label="Text color"');
    expect(markup).toContain('value="oklch(62% 0.18 252 / 0.8)"');
    expect(markup).toContain('editor-color-picker');
    expect(markup).toContain('h-8 w-8');
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

    expect(markup).toContain('aria-label="Border color"');
    expect(markup).toContain('data-allow-alpha="true"');
    expect(markup).toContain('>Width<');
    expect(markup).toContain('>Radius<');
    expect(markup).toContain('>px<');
    expect(markup.match(/data-ui="select-trigger"/g)?.length).toBe(1);
  });

  it('passes opaque values to non-alpha color fields', () => {
    const markup = renderToStaticMarkup(
      <HoverColorField
        value="oklch(62% 0.18 252 / 0.8)"
        onChange={() => {}}
        ariaLabel="Bottom border color"
        fallback="#dbe3ee"
        showOpacity={false}
      />,
    );

    expect(markup).toContain('value="oklch(62% 0.18 252)"');
    expect(markup).toContain('data-allow-alpha="false"');
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
