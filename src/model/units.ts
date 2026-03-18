import type {
  FontSizeValue,
  HeightValue,
  ParsedValue,
  SpacingValue,
  Unit,
  UnitValue,
  WidthValue,
} from './types';

const unitPattern = /^(-?\d+(?:\.\d+)?)(px|%|vw|vh|vmin|vmax)$/;
const fontSizePattern = /^(-?\d+(?:\.\d+)?)(px|em|rem)$/;
const spacingPattern = /^(-?\d+(?:\.\d+)?)(px|em|rem)$/;
const aspectRatioPattern = /^aspect-ratio\(\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*\)$/;

export function parseUnitValue(raw: string): ParsedValue<UnitValue> {
  const value = raw.trim();
  const match = value.match(unitPattern);
  if (!match) {
    throw new Error(`Invalid unit value: ${raw}`);
  }
  return {
    raw,
    parsed: {
      value: Number(match[1]),
      unit: match[2] as Unit,
    },
  };
}

export function parseWidthValue(raw: string): ParsedValue<WidthValue> {
  const value = raw.trim();
  if (value === 'fit-content' || value === 'min-content' || value === 'max-content') {
    return { raw, parsed: { keyword: value } };
  }
  return parseUnitValue(raw);
}

export function parseFontSizeValue(raw: string): ParsedValue<FontSizeValue> {
  const value = raw.trim();
  const match = value.match(fontSizePattern);
  if (!match) {
    throw new Error(`Invalid font size value: ${raw}`);
  }
  return {
    raw,
    parsed: {
      value: Number(match[1]),
      unit: match[2] as FontSizeValue['unit'],
    },
  };
}

export function parseSpacingValue(raw: string): ParsedValue<SpacingValue> {
  const value = raw.trim();
  const match = value.match(spacingPattern);
  if (!match) {
    throw new Error(`Invalid spacing value: ${raw}`);
  }
  return {
    raw,
    parsed: {
      value: Number(match[1]),
      unit: match[2] as SpacingValue['unit'],
    },
  };
}

export function parseHeightValue(raw: string): ParsedValue<HeightValue> {
  const value = raw.trim();
  if (value === 'auto') {
    return { raw, parsed: { keyword: 'auto' } };
  }
  const aspectMatch = value.match(aspectRatioPattern);
  if (aspectMatch) {
    const left = Number(aspectMatch[1]);
    const right = aspectMatch[2] ? Number(aspectMatch[2]) : 1;
    if (left <= 0 || right <= 0) {
      throw new Error(`Invalid aspect ratio: ${raw}`);
    }
    return {
      raw,
      parsed: { keyword: 'aspect-ratio', ratio: left / right },
    };
  }
  return parseUnitValue(raw);
}

export function formatValue(
  value: UnitValue | WidthValue | HeightValue | FontSizeValue | SpacingValue,
): string {
  if ('unit' in value) {
    return `${value.value}${value.unit}`;
  }
  if (value.keyword === 'aspect-ratio') {
    return `aspect-ratio(${value.ratio})`;
  }
  return value.keyword;
}

export function resolveFontSizePx(
  value: FontSizeValue,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  switch (value.unit) {
    case 'px':
      return value.value;
    case 'em':
      return value.value * reference.inheritedFontSizePx;
    case 'rem':
      return value.value * reference.rootFontSizePx;
  }
}

export function resolveSpacingPx(
  value: SpacingValue,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  switch (value.unit) {
    case 'px':
      return value.value;
    case 'em':
      return value.value * reference.inheritedFontSizePx;
    case 'rem':
      return value.value * reference.rootFontSizePx;
  }
}

export function resolveUnitValuePx(
  value: UnitValue,
  reference: { width: number; height: number; viewportWidth: number; viewportHeight: number },
  axis: 'x' | 'y' | 'width' | 'height',
): number {
  switch (value.unit) {
    case 'px':
      return value.value;
    case '%':
      return axis === 'x' || axis === 'width'
        ? (value.value / 100) * reference.width
        : (value.value / 100) * reference.height;
    case 'vw':
      return (value.value / 100) * reference.viewportWidth;
    case 'vh':
      return (value.value / 100) * reference.viewportHeight;
    case 'vmin':
      return (value.value / 100) * Math.min(reference.viewportWidth, reference.viewportHeight);
    case 'vmax':
      return (value.value / 100) * Math.max(reference.viewportWidth, reference.viewportHeight);
  }
}
