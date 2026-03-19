import {
  convertRenderedPxToBorderRadiusUnit,
  convertRenderedPxToFontRelativeUnit,
  convertRenderedPxToGeometryUnit,
  convertRenderedPxToSpacingUnit,
  formatDisplayValue,
} from '../../model/conversion';
import type { BorderStyle, ShadowStyle, ViewportMeasurement } from '../../model/types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../../api/documentApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SizeFieldAxis = 'x' | 'y' | 'width' | 'height';
export type SizeFieldMode =
  | 'px'
  | '%'
  | 'vw'
  | 'vh'
  | 'vmin'
  | 'vmax'
  | 'fit-content'
  | 'min-content'
  | 'max-content'
  | 'auto'
  | 'aspect-ratio';
export type NumericSizeFieldMode = Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>;
export type FontSizeMode = 'px' | 'em' | 'rem';
export type SpacingMode = 'px' | 'em' | 'rem';
export type SpacingAxis = 'block' | 'inline' | 'top' | 'right' | 'bottom' | 'left';
export type SizeFieldDescriptor =
  | { kind: 'numeric'; mode: NumericSizeFieldMode; input: string }
  | { kind: 'keyword'; mode: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content' | 'auto'>; input: '' }
  | { kind: 'aspect-ratio'; mode: 'aspect-ratio'; input: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WIDTH_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content'>[] = [
  'fit-content',
  'min-content',
  'max-content',
];
export const HEIGHT_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'auto' | 'aspect-ratio'>[] = ['auto', 'aspect-ratio'];
export const FONT_SIZE_UNIT_OPTIONS: FontSizeMode[] = ['px', 'em', 'rem'];
export const FONT_SIZE_SUGGESTIONS_BY_UNIT: Record<FontSizeMode, number[]> = {
  px: [12, 14, 16, 18, 20, 24, 30, 36, 48, 64, 72],
  em: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4],
  rem: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4],
};

// ---------------------------------------------------------------------------
// Number / field formatting helpers
// ---------------------------------------------------------------------------

export function formatNumericFieldInput(value: number) {
  return formatFieldNumber(value);
}

export function clampFieldNumber(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatFieldNumber(value: number) {
  return formatDisplayValue(value);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function validateNumberInputDraft(draft: string, min: number, max: number) {
  if (draft.trim() === '') {
    return { isValid: false, nextValue: null };
  }

  const nextValue = Number.parseFloat(draft);
  if (!Number.isFinite(nextValue) || nextValue < min || nextValue > max) {
    return { isValid: false, nextValue: null };
  }

  return { isValid: true, nextValue };
}

// ---------------------------------------------------------------------------
// Size field descriptor helpers
// ---------------------------------------------------------------------------

export function describeSizeFieldValue(value: string, axis: SizeFieldAxis): SizeFieldDescriptor {
  const parsed =
    axis === 'width'
      ? parseWidthValue(value)
      : axis === 'height'
        ? parseHeightValue(value)
        : parseUnitValue(value);
  if ('unit' in parsed.parsed) {
    return {
      kind: 'numeric',
      mode: parsed.parsed.unit,
      input: formatNumericFieldInput(parsed.parsed.value),
    };
  }
  if (parsed.parsed.keyword === 'aspect-ratio') {
    return {
      kind: 'aspect-ratio',
      mode: 'aspect-ratio',
      input: extractAspectRatioExpression(parsed.raw),
    };
  }
  return {
    kind: 'keyword',
    mode: parsed.parsed.keyword,
    input: '',
  };
}

export function buildSizeFieldValue(
  axis: SizeFieldAxis,
  mode: SizeFieldMode,
  input: string,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const allowedNumericModes = getAllowedNumericSizeModes(axis, isSectionHeight);

  if (axis === 'x' || axis === 'y') {
    if (mode !== 'px') {
      return null;
    }
    const numeric = input.trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
      return null;
    }
    const nextRaw = `${numeric}${mode}`;
    try {
      parseUnitValue(nextRaw);
      return nextRaw;
    } catch {
      return null;
    }
  }

  if (isNumericSizeFieldMode(mode) && !allowedNumericModes.includes(mode)) {
    return null;
  }

  if (mode === 'fit-content' || mode === 'min-content' || mode === 'max-content') {
    return axis === 'width' ? mode : null;
  }
  if (mode === 'auto') {
    return axis === 'height' ? mode : null;
  }
  if (mode === 'aspect-ratio') {
    if (axis !== 'height') {
      return null;
    }
    const normalized = normalizeAspectRatioExpression(input);
    return normalized ? `aspect-ratio(${normalized})` : null;
  }

  const numeric = input.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
    return null;
  }
  const numericValue = Number.parseFloat(numeric);
  if ((axis === 'width' || axis === 'height') && numericValue < 0) {
    return null;
  }
  const nextRaw = `${numeric}${mode}`;
  try {
    if (axis === 'width') {
      parseWidthValue(nextRaw);
    } else {
      parseHeightValue(nextRaw);
    }
    return nextRaw;
  } catch {
    return null;
  }
}

export function normalizeAspectRatioExpression(input: string) {
  const trimmed = input.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) > 0 ? trimmed : null;
  }

  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!fractionMatch) {
    return null;
  }

  const left = Number(fractionMatch[1]);
  const right = Number(fractionMatch[2]);
  if (left <= 0 || right <= 0) {
    return null;
  }

  return `${fractionMatch[1]}/${fractionMatch[2]}`;
}

export function extractAspectRatioExpression(raw: string) {
  const match = raw.trim().match(/^aspect-ratio\(\s*(.+?)\s*\)$/);
  return match?.[1] ?? '16/9';
}

// ---------------------------------------------------------------------------
// Size mode helpers
// ---------------------------------------------------------------------------

export function getSizeModeOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const scalarUnits: NumericSizeFieldMode[] = axis === 'x' || axis === 'y' ? ['px'] : ['px', '%'];
  const viewportUnits: NumericSizeFieldMode[] = axis === 'height' && isSectionHeight ? ['vh', 'vmin', 'vmax'] : [];
  const keywords =
    axis === 'width'
      ? WIDTH_KEYWORD_OPTIONS
      : axis === 'height'
        ? HEIGHT_KEYWORD_OPTIONS
        : null;
  const selectableModes: SizeFieldMode[] = [...scalarUnits, ...(keywords ?? []), ...viewportUnits];

  return {
    scalarUnits,
    viewportUnits,
    keywords,
    selectableModes,
  };
}

export function isNumericSizeFieldMode(mode: SizeFieldMode): mode is NumericSizeFieldMode {
  return mode === 'px' || mode === '%' || mode === 'vw' || mode === 'vh' || mode === 'vmin' || mode === 'vmax';
}

export function getAllowedNumericSizeModes(axis: SizeFieldAxis, isSectionHeight: boolean): NumericSizeFieldMode[] {
  const { scalarUnits, viewportUnits } = getSizeModeOptions(axis, { isSectionHeight });
  return [...scalarUnits, ...viewportUnits];
}

export function getDefaultNumericMode(axis: SizeFieldAxis, isSectionHeight: boolean): NumericSizeFieldMode {
  return getAllowedNumericSizeModes(axis, isSectionHeight)[0] ?? 'px';
}

export function resolveSizeFieldMode(descriptor: SizeFieldDescriptor, axis: SizeFieldAxis, isSectionHeight: boolean): SizeFieldMode {
  if (descriptor.kind !== 'numeric') {
    return descriptor.mode;
  }
  return getAllowedNumericSizeModes(axis, isSectionHeight).includes(descriptor.mode)
    ? descriptor.mode
    : getDefaultNumericMode(axis, isSectionHeight);
}

export function getInitialSizeFieldMode(value: string, axis: SizeFieldAxis, isSectionHeight: boolean) {
  return resolveSizeFieldMode(describeSizeFieldValue(value, axis), axis, isSectionHeight);
}

export function getInitialNumericDraft(
  value: string,
  axis: SizeFieldAxis,
  nodeId: string,
  isSectionHeight: boolean,
) {
  const descriptor = describeSizeFieldValue(value, axis);
  if (descriptor.kind !== 'numeric') {
    return getDefaultNumericDraft(axis);
  }
  if (getAllowedNumericSizeModes(axis, isSectionHeight).includes(descriptor.mode)) {
    return descriptor.input;
  }
  if (typeof document === 'undefined') {
    return descriptor.input;
  }
  const fallbackMode = getDefaultNumericMode(axis, isSectionHeight);
  return convertStageMeasurementToInput(nodeId, axis, fallbackMode, document) ?? descriptor.input;
}

export function getInitialAspectDraft(value: string) {
  try {
    const descriptor = describeSizeFieldValue(value, 'height');
    return descriptor.kind === 'aspect-ratio' ? descriptor.input : '16/9';
  } catch {
    return '16/9';
  }
}

export function getDefaultNumericDraft(axis: SizeFieldAxis) {
  if (axis === 'width') {
    return '240';
  }
  if (axis === 'height') {
    return '120';
  }
  return '0';
}

// ---------------------------------------------------------------------------
// Stage measurement conversion
// ---------------------------------------------------------------------------

export function convertRenderedPxToUnitValue(
  px: number,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  parentSizePx?: number,
  viewportSizePx?: number,
) {
  const viewport =
    mode === 'vw'
      ? { width: viewportSizePx ?? 0, height: 1 }
      : mode === 'vh'
        ? { width: 1, height: viewportSizePx ?? 0 }
        : mode === 'vmin' || mode === 'vmax'
          ? { width: viewportSizePx ?? 0, height: viewportSizePx ?? 0 }
          : null;
  return convertRenderedPxToGeometryUnit(px, axis, mode, {
    referenceSizePx: parentSizePx,
    viewport,
  });
}

export function convertStageMeasurementToInput(
  nodeId: string,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  ownerDocument: Document = document,
) {
  const measurement = measureStageGeometry(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const px =
    axis === 'x'
      ? measurement.offsetX
      : axis === 'y'
        ? measurement.offsetY
        : axis === 'width'
          ? measurement.width
          : measurement.height;
  const parentSize =
    axis === 'width'
      ? measurement.parentWidth
      : axis === 'height'
        ? measurement.parentHeightReliable
          ? measurement.parentHeight
          : undefined
        : undefined;
  const viewportSize =
    mode === 'vw'
      ? measurement.viewport?.width
      : mode === 'vh'
        ? measurement.viewport?.height
        : mode === 'vmin'
          ? measurement.viewport
            ? Math.min(measurement.viewport.width, measurement.viewport.height)
            : undefined
          : mode === 'vmax'
            ? measurement.viewport
              ? Math.max(measurement.viewport.width, measurement.viewport.height)
              : undefined
            : undefined;

  const converted = convertRenderedPxToUnitValue(px, axis, mode, parentSize, viewportSize);
  return converted == null ? null : formatNumericFieldInput(converted);
}

export function convertRenderedPxToFontSizeValue(
  px: number,
  mode: FontSizeMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  return convertRenderedPxToFontRelativeUnit(px, mode, reference);
}

export function convertStageFontSizeToInput(
  nodeId: string,
  mode: FontSizeMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageFontSize(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToFontSizeValue(measurement.fontSizePx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.inheritedFontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

export function convertRenderedPxToSpacingValue(
  px: number,
  mode: SpacingMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  return convertRenderedPxToSpacingUnit(px, mode, reference);
}

export function convertStageSpacingToInput(
  nodeId: string,
  axis: SpacingAxis,
  mode: SpacingMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageSpacing(nodeId, axis, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToSpacingValue(measurement.spacingPx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.fontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

export function convertRenderedPxToBorderRadiusValue(
  px: number,
  mode: 'px' | '%',
  box: { width: number; height: number },
) {
  return convertRenderedPxToBorderRadiusUnit(px, mode, box);
}

export function convertStageBorderRadiusToValue(
  nodeId: string,
  mode: 'px' | '%',
  ownerDocument: Document = document,
) {
  const measurement = measureStageBorderRadius(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToBorderRadiusValue(measurement.radiusPx, mode, measurement.box);
  return converted == null ? null : `${formatFieldNumber(converted)}${mode}`;
}

// ---------------------------------------------------------------------------
// Border / shadow read helpers
// ---------------------------------------------------------------------------

export function readUnifiedBorderColor(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderColor) {
    return style.borderColor;
  }
  const values = [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor].filter(
    (value): value is string => Boolean(value),
  );
  return values.length === 4 && values.every((value) => value === values[0]) ? values[0] : '';
}

export function readUnifiedBorderWidth(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderWidth) {
    return style.borderWidth.raw;
  }
  return readUnifiedParsedValue([
    style.borderTopWidth?.raw,
    style.borderRightWidth?.raw,
    style.borderBottomWidth?.raw,
    style.borderLeftWidth?.raw,
  ]);
}

export function readUnifiedBorderRadius(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderRadius) {
    return style.borderRadius.raw;
  }
  return readUnifiedParsedValue([
    style.borderTopLeftRadius?.raw,
    style.borderTopRightRadius?.raw,
    style.borderBottomRightRadius?.raw,
    style.borderBottomLeftRadius?.raw,
  ]);
}

export function readShadowFieldValues(
  style: ShadowStyle | undefined,
  fallback: { color: string; blur: number; spread: number; distance: number; angle: number },
) {
  const fallbackVector = offsetsFromDistanceAndAngle(fallback.distance, fallback.angle);
  const offsetX = style?.shadowOffsetX ?? fallbackVector.offsetX;
  const offsetY = style?.shadowOffsetY ?? fallbackVector.offsetY;

  return {
    color: style?.shadowColor ?? fallback.color,
    blur: style?.shadowBlur ?? fallback.blur,
    spread: style?.shadowSpread ?? fallback.spread,
    distance: roundShadowNumber(Math.sqrt(offsetX ** 2 + offsetY ** 2)),
    angle: roundShadowNumber(normalizeShadowAngle((Math.atan2(offsetY, offsetX) * 180) / Math.PI)),
  };
}

export function offsetsFromDistanceAndAngle(distance: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    offsetX: Math.cos(radians) * distance,
    offsetY: Math.sin(radians) * distance,
  };
}

// ---------------------------------------------------------------------------
// Private measurement helpers
// ---------------------------------------------------------------------------

function measureStageGeometry(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const element = getStageGeometryMeasurementTarget(nodeId, ownerDocument) ?? root;
  const rect = element.getBoundingClientRect();
  const parentContent =
    element.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    root.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    element.parentElement ??
    root.parentElement;
  const parentRect = parentContent?.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    offsetX: parentRect ? rect.left - parentRect.left : rect.left,
    offsetY: parentRect ? rect.top - parentRect.top : rect.top,
    parentWidth: parentRect?.width,
    parentHeight: parentRect?.height,
    parentHeightReliable: isReliablePercentHeightReference(parentContent),
    viewport: measureEditorViewport(ownerDocument),
  };
}

function measureStageFontSize(nodeId: string, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const parentComputed = defaultView.getComputedStyle(element.parentElement ?? element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const inheritedFontSizePx = Number.parseFloat(parentComputed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  if (!Number.isFinite(fontSizePx) || !Number.isFinite(inheritedFontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    fontSizePx,
    inheritedFontSizePx,
    rootFontSizePx,
  };
}

function measureStageSpacing(nodeId: string, axis: SpacingAxis, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const top = Number.parseFloat(computed.paddingTop);
  const bottom = Number.parseFloat(computed.paddingBottom);
  const left = Number.parseFloat(computed.paddingLeft);
  const right = Number.parseFloat(computed.paddingRight);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  const spacingPx =
    axis === 'block'
      ? Number.isFinite(top) && Number.isFinite(bottom) && top > 0 && bottom > 0
        ? (top + bottom) / 2
        : Number.isFinite(top) && top > 0
          ? top
          : Number.isFinite(bottom) && bottom > 0
            ? bottom
            : null
      : axis === 'inline'
        ? Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0
          ? (left + right) / 2
          : Number.isFinite(left) && left > 0
            ? left
            : Number.isFinite(right) && right > 0
              ? right
              : null
        : axis === 'top'
          ? Number.isFinite(top)
            ? top
            : null
          : axis === 'right'
            ? Number.isFinite(right)
              ? right
              : null
            : axis === 'bottom'
              ? Number.isFinite(bottom)
                ? bottom
                : null
              : Number.isFinite(left)
                ? left
                : null;

  if (spacingPx == null || !Number.isFinite(fontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    spacingPx,
    fontSizePx,
    rootFontSizePx,
  };
}

function measureStageBorderRadius(nodeId: string, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const radiusPx = parseComputedBorderRadiusPx(computed.borderTopLeftRadius, {
    width: rect.width,
    height: rect.height,
  });
  if (radiusPx == null) {
    return null;
  }

  return {
    radiusPx,
    box: {
      width: rect.width,
      height: rect.height,
    },
  };
}

function measureEditorViewport(ownerDocument: Document): ViewportMeasurement | null {
  const stageShell = ownerDocument.querySelector
    ? ownerDocument.querySelector<HTMLElement>('.stage-shell')
    : null;
  const defaultView = ownerDocument.defaultView;
  if (!stageShell || !defaultView) {
    return null;
  }

  const rawWidth = stageShell.clientWidth || stageShell.getBoundingClientRect().width;
  const rawHeight = stageShell.clientHeight || stageShell.getBoundingClientRect().height;
  if (rawWidth <= 0 || rawHeight <= 0) {
    return null;
  }

  const computed = defaultView.getComputedStyle(stageShell);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const width = rawWidth - paddingLeft - paddingRight;
  const height = rawHeight - paddingTop - paddingBottom;

  return width > 0 && height > 0 ? { width, height } : null;
}

function isReliablePercentHeightReference(parentContent: Element | null | undefined) {
  const wrapper = parentContent?.parentElement;
  if (!wrapper?.classList) {
    return true;
  }
  return !(
    wrapper.classList.contains('role-section') ||
    wrapper.classList.contains('role-header') ||
    wrapper.classList.contains('role-footer')
  );
}

function getStageStyleMeasurementTarget(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const contentWrapper = 'querySelector' in root
    ? root.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
    : null;
  if (contentWrapper) {
    return contentWrapper;
  }

  const leafContent = 'querySelector' in root
    ? root.querySelector<HTMLElement>('.stage-leaf-body > *')
    : null;
  return leafContent ?? root;
}

function getStageGeometryMeasurementTarget(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const contentWrapper = 'querySelector' in root
    ? root.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
    : null;
  return contentWrapper ?? root;
}

function parseComputedBorderRadiusPx(
  raw: string,
  box: { width: number; height: number },
) {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  const [horizontalRaw, verticalRaw = horizontalRaw] = normalized.split(/\s+/);
  const horizontal = resolveComputedRadiusSegmentPx(horizontalRaw, box.width, box);
  const vertical = resolveComputedRadiusSegmentPx(verticalRaw, box.height, box);
  if (horizontal == null || vertical == null) {
    return null;
  }
  return (horizontal + vertical) / 2;
}

function resolveComputedRadiusSegmentPx(
  raw: string,
  axisSize: number,
  box: { width: number; height: number },
) {
  if (raw.endsWith('px')) {
    const px = Number.parseFloat(raw);
    return Number.isFinite(px) ? px : null;
  }
  if (raw.endsWith('%')) {
    const percent = Number.parseFloat(raw);
    if (!Number.isFinite(percent)) {
      return null;
    }
    const basis = raw === `${percent}%` && box.width !== box.height ? axisSize : (box.width + box.height) / 2;
    return (percent / 100) * basis;
  }
  return null;
}

function readUnifiedParsedValue(values: Array<string | undefined>) {
  const defined = values.filter((value): value is string => Boolean(value));
  return defined.length === values.length && defined.every((value) => value === defined[0]) ? defined[0] : '';
}

function roundShadowNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeShadowAngle(angle: number) {
  const normalized = ((angle % 360) + 360) % 360;
  return normalized === 0 ? 0 : normalized;
}
