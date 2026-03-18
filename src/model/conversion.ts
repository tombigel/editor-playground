import type { FontSizeUnit, SpacingUnit, Unit, ViewportMeasurement } from './types';

export type GeometryConversionAxis = 'x' | 'y' | 'width' | 'height';

export function convertRenderedPxToGeometryUnit(
  px: number,
  axis: GeometryConversionAxis,
  unit: Unit,
  options: {
    referenceSizePx?: number;
    viewport?: ViewportMeasurement | null;
  } = {},
) {
  if (!Number.isFinite(px)) {
    return null;
  }

  if (unit === 'px') {
    return roundConversionValue(px);
  }

  if (unit === '%') {
    if (axis === 'x' || axis === 'y') {
      return null;
    }
    const base = options.referenceSizePx;
    if (!base || base <= 0) {
      return null;
    }
    return roundConversionValue((px / base) * 100);
  }

  const viewportBase = getViewportUnitBase(options.viewport ?? null, unit);
  if (!viewportBase) {
    return null;
  }
  return roundConversionValue((px / viewportBase) * 100);
}

export function convertRenderedPxToFontRelativeUnit(
  px: number,
  unit: FontSizeUnit | SpacingUnit,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  if (!Number.isFinite(px) || px <= 0) {
    return null;
  }

  if (unit === 'px') {
    return clampDisplayValue(px);
  }

  const base = unit === 'rem' ? reference.rootFontSizePx : reference.inheritedFontSizePx;
  if (!Number.isFinite(base) || base <= 0) {
    return null;
  }

  return clampDisplayValue(px / base);
}

export function convertRenderedPxToSpacingUnit(
  px: number,
  unit: SpacingUnit,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  const converted = convertRenderedPxToFontRelativeUnit(px, unit, reference);
  if (converted == null) {
    return null;
  }
  return unit === 'px' ? Math.round(converted) : converted;
}

export function convertRenderedPxToBorderRadiusUnit(
  px: number,
  unit: 'px' | '%',
  box: { width: number; height: number },
) {
  if (!Number.isFinite(px) || px < 0) {
    return null;
  }

  if (unit === 'px') {
    return clampDisplayValue(px);
  }

  const basis = getBorderRadiusBasis(box);
  if (!basis) {
    return null;
  }

  return clampDisplayValue((px / basis) * 100);
}

export function getBorderRadiusBasis(box: { width: number; height: number }) {
  if (!Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0) {
    return null;
  }
  return (box.width + box.height) / 2;
}

export function roundConversionValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function clampDisplayValue(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatDisplayValue(value: number) {
  return clampDisplayValue(value).toFixed(2).replace(/\.?0+$/, '');
}

function getViewportUnitBase(viewport: ViewportMeasurement | null, unit: Exclude<Unit, 'px' | '%'>) {
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) {
    return null;
  }

  switch (unit) {
    case 'vw':
      return viewport.width;
    case 'vh':
      return viewport.height;
    case 'vmin':
      return Math.min(viewport.width, viewport.height);
    case 'vmax':
      return Math.max(viewport.width, viewport.height);
  }
}
