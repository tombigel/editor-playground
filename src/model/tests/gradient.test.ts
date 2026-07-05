import { describe, expect, it } from 'vitest';
import {
  createDefaultGradient,
  isGradientText,
  parseGradient,
  serializeGradient,
  splitTopLevelArgs,
} from '../gradient';

describe('model/gradient splitTopLevelArgs', () => {
  it('splits only on top-level commas', () => {
    expect(splitTopLevelArgs('red, blue 50%, var(--x, green) 100%')).toEqual([
      'red',
      'blue 50%',
      'var(--x, green) 100%',
    ]);
  });

  it('keeps nested function commas intact', () => {
    expect(splitTopLevelArgs('color-mix(in srgb, red 40%, blue), rgba(0, 0, 0, 0.5)')).toEqual([
      'color-mix(in srgb, red 40%, blue)',
      'rgba(0, 0, 0, 0.5)',
    ]);
  });
});

describe('model/gradient parseGradient', () => {
  it('parses a linear gradient with angle and positioned stops', () => {
    const parsed = parseGradient('linear-gradient(45deg, #ff0000 0%, #0000ff 100%)');
    expect(parsed).toEqual({
      type: 'linear',
      repeating: false,
      angle: 45,
      stops: [
        { color: '#ff0000', position: { value: 0, unit: '%' } },
        { color: '#0000ff', position: { value: 100, unit: '%' } },
      ],
    });
  });

  it('parses function colors as opaque tokens', () => {
    const parsed = parseGradient(
      'linear-gradient(90deg, var(--brand, #123456) 0%, color-mix(in srgb, red 40%, blue) 100%)',
    );
    expect(parsed?.stops[0].color).toBe('var(--brand, #123456)');
    expect(parsed?.stops[1].color).toBe('color-mix(in srgb, red 40%, blue)');
  });

  it('parses radial gradients with shape, extent keyword, and position', () => {
    const parsed = parseGradient('radial-gradient(circle farthest-corner at 30% 120px, red, blue)');
    expect(parsed).toMatchObject({
      type: 'radial',
      shape: 'circle',
      extent: 'farthest-corner',
      position: { x: { value: 30, unit: '%' }, y: { value: 120, unit: 'px' } },
    });
  });

  it('parses radial gradients with explicit sizes', () => {
    const parsed = parseGradient('radial-gradient(ellipse 40% 60px at 50% 50%, red, blue)');
    expect(parsed?.sizes).toEqual([
      { value: 40, unit: '%' },
      { value: 60, unit: 'px' },
    ]);
  });

  it('parses conic gradients with from-angle and position', () => {
    const parsed = parseGradient('conic-gradient(from 90deg at 25% 75%, red 0%, blue 50%, red 100%)');
    expect(parsed).toMatchObject({
      type: 'conic',
      angle: 90,
      position: { x: { value: 25, unit: '%' }, y: { value: 75, unit: '%' } },
    });
    expect(parsed?.stops).toHaveLength(3);
  });

  it('parses repeating gradients', () => {
    const parsed = parseGradient('repeating-linear-gradient(45deg, #000 0px, #000 10px, #fff 10px, #fff 20px)');
    expect(parsed?.repeating).toBe(true);
    expect(parsed?.stops).toHaveLength(4);
  });

  it('rejects non-gradient values and hand-authored syntax it cannot round-trip', () => {
    expect(parseGradient('#ff0000')).toBeNull();
    expect(parseGradient('linear-gradient(to top right, red, blue)')).toBeNull();
    expect(parseGradient('linear-gradient(red)')).toBeNull();
    expect(parseGradient('url(evil.png)')).toBeNull();
  });
});

describe('model/gradient round-trip', () => {
  const samples = [
    'linear-gradient(45deg, #ff0000 0%, #0000ff 100%)',
    'linear-gradient(#ff0000, #0000ff)',
    'radial-gradient(circle farthest-corner at 30% 120px, red 0%, blue 100%)',
    'radial-gradient(ellipse 40% 60px at 50% 50%, red, blue)',
    'radial-gradient(closest-side, var(--a) 10%, var(--b) 90%)',
    'conic-gradient(from 90deg at 25% 75%, red 0%, blue 50%, red 100%)',
    'repeating-linear-gradient(45deg, #000 0px, #000 10px, #fff 10px, #fff 20px)',
    'repeating-conic-gradient(from 0deg at 50% 50%, #000 0%, #fff 25%)',
  ];

  for (const sample of samples) {
    it(`round-trips ${sample}`, () => {
      const parsed = parseGradient(sample);
      expect(parsed).not.toBeNull();
      if (!parsed) return;
      const serialized = serializeGradient(parsed);
      // Serialization is canonical; parsing it again must be a fixed point.
      expect(parseGradient(serialized)).toEqual(parsed);
    });
  }

  it('serializes the default gradient to parseable text', () => {
    const gradient = createDefaultGradient();
    expect(parseGradient(serializeGradient(gradient))).toEqual(gradient);
  });
});

describe('model/gradient isGradientText', () => {
  it('accepts gradient functions and rejects other values', () => {
    expect(isGradientText('linear-gradient(red, blue)')).toBe(true);
    expect(isGradientText('repeating-radial-gradient(circle, red, blue)')).toBe(true);
    expect(isGradientText('#fff')).toBe(false);
    expect(isGradientText('url(x)')).toBe(false);
  });
});
