import type { EditorTextField } from '../../api/documentApi';
import type { WrapperStyleField } from '../../api/documentApi';
import type { ShadowStyle } from '../../model/types';
import { offsetsFromDistanceAndAngle } from '../InspectorControls';

const BORDER_WIDTH_RESET_FIELDS: EditorTextField[] = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
const BORDER_COLOR_RESET_FIELDS: EditorTextField[] = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
const BORDER_RADIUS_RESET_FIELDS: EditorTextField[] = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
];

const WRAPPER_BORDER_WIDTH_RESET_FIELDS: WrapperStyleField[] = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
const WRAPPER_BORDER_COLOR_RESET_FIELDS: WrapperStyleField[] = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
const WRAPPER_BORDER_RADIUS_RESET_FIELDS: WrapperStyleField[] = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
];

type PatchSetter<Field extends string> = (field: Field, value: string) => void;

export function applyUnifiedLeafBorderWidth(onChange: PatchSetter<EditorTextField>, value: string) {
  onChange('borderWidth', value);
  for (const field of BORDER_WIDTH_RESET_FIELDS) {
    onChange(field, '');
  }
}

export function applyUnifiedLeafBorderColor(onChange: PatchSetter<EditorTextField>, value: string) {
  onChange('borderColor', value);
  for (const field of BORDER_COLOR_RESET_FIELDS) {
    onChange(field, '');
  }
}

export function applyUnifiedLeafBorderRadius(onChange: PatchSetter<EditorTextField>, value: string) {
  onChange('borderRadius', value);
  for (const field of BORDER_RADIUS_RESET_FIELDS) {
    onChange(field, '');
  }
}

export function applyUnifiedWrapperBorderWidth(onChange: PatchSetter<WrapperStyleField>, value: string) {
  onChange('borderWidth', value);
  for (const field of WRAPPER_BORDER_WIDTH_RESET_FIELDS) {
    onChange(field, '');
  }
}

export function applyUnifiedWrapperBorderColor(onChange: PatchSetter<WrapperStyleField>, value: string) {
  onChange('borderColor', value);
  for (const field of WRAPPER_BORDER_COLOR_RESET_FIELDS) {
    onChange(field, '');
  }
}

export function applyUnifiedWrapperBorderRadius(onChange: PatchSetter<WrapperStyleField>, value: string) {
  onChange('borderRadius', value);
  for (const field of WRAPPER_BORDER_RADIUS_RESET_FIELDS) {
    onChange(field, '');
  }
}

export function applyLeafShadowPatch(
  onChange: PatchSetter<EditorTextField>,
  currentStyle: ShadowStyle | undefined,
  fallback: { color: string; blur: number; spread: number; distance: number; angle: number },
  patch: Partial<{ color: string; blur: number; spread: number; distance: number; angle: number }>,
) {
  applyShadowPatch(onChange, currentStyle, fallback, patch);
}

export function applyWrapperShadowPatch(
  onChange: PatchSetter<WrapperStyleField>,
  currentStyle: ShadowStyle | undefined,
  fallback: { color: string; blur: number; spread: number; distance: number; angle: number },
  patch: Partial<{ color: string; blur: number; spread: number; distance: number; angle: number }>,
) {
  applyShadowPatch(onChange, currentStyle, fallback, patch);
}

function applyShadowPatch<Field extends 'shadowColor' | 'shadowBlur' | 'shadowSpread' | 'shadowOffsetX' | 'shadowOffsetY'>(
  onChange: PatchSetter<Field>,
  currentStyle: ShadowStyle | undefined,
  fallback: { color: string; blur: number; spread: number; distance: number; angle: number },
  patch: Partial<{ color: string; blur: number; spread: number; distance: number; angle: number }>,
) {
  const currentDistance = currentStyle?.shadowOffsetX !== undefined || currentStyle?.shadowOffsetY !== undefined
    ? Math.sqrt((currentStyle?.shadowOffsetX ?? 0) ** 2 + (currentStyle?.shadowOffsetY ?? 0) ** 2)
    : fallback.distance;
  const currentAngle = currentStyle?.shadowOffsetX !== undefined || currentStyle?.shadowOffsetY !== undefined
    ? (Math.atan2(currentStyle?.shadowOffsetY ?? 0, currentStyle?.shadowOffsetX ?? 0) * 180) / Math.PI
    : fallback.angle;
  const next = {
    color: patch.color ?? currentStyle?.shadowColor ?? fallback.color,
    blur: patch.blur ?? currentStyle?.shadowBlur ?? fallback.blur,
    spread: patch.spread ?? currentStyle?.shadowSpread ?? fallback.spread,
    distance: patch.distance ?? currentDistance,
    angle: patch.angle ?? currentAngle,
  };
  const offsets = offsetsFromDistanceAndAngle(next.distance, next.angle);
  onChange('shadowColor' as Field, next.color);
  onChange('shadowBlur' as Field, String(next.blur));
  onChange('shadowSpread' as Field, String(next.spread));
  onChange('shadowOffsetX' as Field, String(offsets.offsetX));
  onChange('shadowOffsetY' as Field, String(offsets.offsetY));
}
