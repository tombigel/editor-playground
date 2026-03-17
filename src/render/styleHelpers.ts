import { formatValue } from '../model/units';
import type { BorderStyle, ParsedValue, ShadowStyle, UnitValue } from '../model/types';
import type { StyleRecord } from './types';

type BorderDefaults = {
  color?: string;
  width?: string;
  radius?: string;
};

type ShadowDefaults = {
  color?: string;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
};

const BORDER_SIDES = [
  ['Top', 'borderTopWidth', 'borderTopColor'],
  ['Right', 'borderRightWidth', 'borderRightColor'],
  ['Bottom', 'borderBottomWidth', 'borderBottomColor'],
  ['Left', 'borderLeftWidth', 'borderLeftColor'],
] as const;

const BORDER_CORNERS = [
  ['TopLeft', 'borderTopLeftRadius'],
  ['TopRight', 'borderTopRightRadius'],
  ['BottomRight', 'borderBottomRightRadius'],
  ['BottomLeft', 'borderBottomLeftRadius'],
] as const;

export function buildBorderStyle(style: BorderStyle | undefined, defaults: BorderDefaults = {}): StyleRecord {
  const result: StyleRecord = {};
  const shorthandColor = style?.borderColor ?? defaults.color;
  const hasPerSideColor = hasAnyPerSideBorderColor(style);
  const hasPerSideWidth = hasAnyPerSideBorderWidth(style);
  const explicitColor = style?.borderColor !== undefined || hasPerSideColor;
  const shorthandWidth = formatParsedUnitValue(style?.borderWidth) ?? defaults.width ?? (explicitColor ? '1px' : undefined);
  const shorthandRadius = formatParsedUnitValue(style?.borderRadius) ?? defaults.radius;

  let hasBorder = false;

  for (const [label, widthField, colorField] of BORDER_SIDES) {
    const sideWidth =
      formatParsedUnitValue(style?.[widthField]) ??
      (hasPerSideWidth || hasPerSideColor ? shorthandWidth : undefined);
    const sideColor = style?.[colorField] ?? (hasPerSideWidth || hasPerSideColor ? shorthandColor : undefined);
    if (!sideWidth && !sideColor) {
      continue;
    }
    result[`border${label}Style`] = 'solid';
    if (sideWidth) {
      result[`border${label}Width`] = sideWidth;
    }
    if (sideColor) {
      result[`border${label}Color`] = sideColor;
    }
    hasBorder = true;
  }

  if (!hasPerSideWidth && !hasPerSideColor && (shorthandWidth || shorthandColor)) {
    result.borderStyle = 'solid';
    if (shorthandWidth) {
      result.borderWidth = shorthandWidth;
    }
    if (shorthandColor) {
      result.borderColor = shorthandColor;
    }
    hasBorder = true;
  }

  if (hasBorder) {
    result.boxSizing = 'border-box';
    result.backgroundClip = 'padding-box';
  }

  let hasCornerRadius = false;
  for (const [label, field] of BORDER_CORNERS) {
    const value = formatParsedUnitValue(style?.[field]) ?? (hasAnyCornerRadius(style) ? shorthandRadius : undefined);
    if (!value) {
      continue;
    }
    result[`border${label}Radius`] = value;
    hasCornerRadius = true;
  }

  if (!hasCornerRadius && shorthandRadius) {
    result.borderRadius = shorthandRadius;
  }

  return result;
}

export function buildBoxShadow(style: ShadowStyle | undefined, defaults: ShadowDefaults = {}) {
  const resolved = resolveShadowStyle(style, defaults);
  if (!resolved) {
    return undefined;
  }
  return `${resolved.offsetX}px ${resolved.offsetY}px ${resolved.blur}px ${resolved.color}`;
}

export function buildFilterShadow(style: ShadowStyle | undefined, defaults: ShadowDefaults = {}) {
  const resolved = resolveShadowStyle(style, defaults);
  if (!resolved) {
    return undefined;
  }
  return `drop-shadow(${resolved.offsetX}px ${resolved.offsetY}px ${resolved.blur}px ${resolved.color})`;
}

export function hasShadowStyle(style: ShadowStyle | undefined) {
  return Boolean(
    style &&
      (style.shadowColor !== undefined ||
        style.shadowBlur !== undefined ||
        style.shadowOffsetX !== undefined ||
        style.shadowOffsetY !== undefined),
  );
}

export function hasBorderStyle(style: BorderStyle | undefined) {
  return Boolean(
    style &&
      (style.borderColor !== undefined ||
        style.borderWidth !== undefined ||
        style.borderRadius !== undefined ||
        hasAnyPerSideBorderColor(style) ||
        hasAnyPerSideBorderWidth(style) ||
        hasAnyCornerRadius(style)),
  );
}

function resolveShadowStyle(style: ShadowStyle | undefined, defaults: ShadowDefaults) {
  if (!style && !hasShadowDefaults(defaults)) {
    return null;
  }
  const color = style?.shadowColor ?? defaults.color;
  if (!color) {
    return null;
  }
  return {
    color,
    blur: style?.shadowBlur ?? defaults.blur ?? 0,
    offsetX: style?.shadowOffsetX ?? defaults.offsetX ?? 0,
    offsetY: style?.shadowOffsetY ?? defaults.offsetY ?? 0,
  };
}

function hasShadowDefaults(defaults: ShadowDefaults) {
  return (
    defaults.color !== undefined ||
    defaults.blur !== undefined ||
    defaults.offsetX !== undefined ||
    defaults.offsetY !== undefined
  );
}

function formatParsedUnitValue(value: ParsedValue<UnitValue> | undefined) {
  return value ? formatValue(value.parsed) : undefined;
}

function hasAnyPerSideBorderWidth(style: BorderStyle | undefined) {
  return Boolean(
    style &&
      (style.borderTopWidth !== undefined ||
        style.borderRightWidth !== undefined ||
        style.borderBottomWidth !== undefined ||
        style.borderLeftWidth !== undefined),
  );
}

function hasAnyPerSideBorderColor(style: BorderStyle | undefined) {
  return Boolean(
    style &&
      (style.borderTopColor !== undefined ||
        style.borderRightColor !== undefined ||
        style.borderBottomColor !== undefined ||
        style.borderLeftColor !== undefined),
  );
}

function hasAnyCornerRadius(style: BorderStyle | undefined) {
  return Boolean(
    style &&
      (style.borderTopLeftRadius !== undefined ||
        style.borderTopRightRadius !== undefined ||
        style.borderBottomRightRadius !== undefined ||
        style.borderBottomLeftRadius !== undefined),
  );
}
