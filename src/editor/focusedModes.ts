import type { FocusedMode } from './types';

export const FOCUSED_MODE_VALUES = ['layout', 'sticky', 'content', 'design'] as const;

export type ActiveFocusedMode = (typeof FOCUSED_MODE_VALUES)[number];

const FOCUSED_MODE_LABELS: Record<ActiveFocusedMode, string> = {
  layout: 'Layout',
  sticky: 'Sticky',
  content: 'Content',
  design: 'Design',
};

export function normalizeFocusedMode(value: unknown): FocusedMode {
  return typeof value === 'string' && isActiveFocusedMode(value) ? value : null;
}

export function resolveFocusedModeUrlOverride(search: string | null | undefined): FocusedMode | undefined {
  if (!search) {
    return undefined;
  }
  const searchParams = new URLSearchParams(search);
  const rawValue = searchParams.get('focus-mode');
  if (rawValue == null) {
    return undefined;
  }
  const normalizedValue = rawValue.trim().toLowerCase();
  if (!normalizedValue || normalizedValue === 'normal' || normalizedValue === 'none') {
    return null;
  }
  return isActiveFocusedMode(normalizedValue) ? normalizedValue : undefined;
}

export function getFocusedModeLabel(mode: ActiveFocusedMode) {
  return FOCUSED_MODE_LABELS[mode];
}

export function getFocusedModeTooltip(mode: ActiveFocusedMode) {
  return `${getFocusedModeLabel(mode)} focus mode`;
}

export function getFocusedModeButtonAriaLabel(mode: ActiveFocusedMode) {
  return `Go to ${getFocusedModeTooltip(mode)}`;
}

export function isActiveFocusedMode(value: string): value is ActiveFocusedMode {
  return (FOCUSED_MODE_VALUES as readonly string[]).includes(value);
}
