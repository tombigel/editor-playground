import type { FocusedPanelOffset } from './types';

export const FOCUSED_PANEL_TOP_OFFSET_PX = 20;
export const FOCUSED_PANEL_RIGHT_OFFSET_PX = 20;
export const FOCUSED_PANEL_EDGE_GAP_PX = 20;
export const DEFAULT_FOCUSED_PANEL_OFFSET: FocusedPanelOffset = { x: 0, y: 0 };

type ClampFocusedPanelOffsetArgs = {
  offset: FocusedPanelOffset;
  deltaX: number;
  deltaY: number;
  containerWidth: number;
  containerHeight: number;
  panelWidth: number;
  panelHeight: number;
  rightOffset?: number;
};

export function normalizeFocusedPanelOffset(value: Partial<FocusedPanelOffset> | null | undefined): FocusedPanelOffset {
  return {
    x: normalizeOffsetAxis(value?.x),
    y: normalizeOffsetAxis(value?.y),
  };
}

export function clampFocusedPanelOffset({
  offset,
  deltaX,
  deltaY,
  containerWidth,
  containerHeight,
  panelWidth,
  panelHeight,
  rightOffset = FOCUSED_PANEL_RIGHT_OFFSET_PX,
}: ClampFocusedPanelOffsetArgs): FocusedPanelOffset {
  const normalized = normalizeFocusedPanelOffset(offset);
  const defaultLeft = Math.max(
    FOCUSED_PANEL_EDGE_GAP_PX,
    containerWidth - panelWidth - rightOffset,
  );
  const maxLeft = Math.max(
    FOCUSED_PANEL_EDGE_GAP_PX,
    containerWidth - panelWidth - FOCUSED_PANEL_EDGE_GAP_PX,
  );
  const currentLeft = defaultLeft + normalized.x;
  const nextLeft = clampNumber(currentLeft + deltaX, FOCUSED_PANEL_EDGE_GAP_PX, maxLeft);

  const maxTop = Math.max(
    FOCUSED_PANEL_TOP_OFFSET_PX,
    containerHeight - panelHeight - FOCUSED_PANEL_EDGE_GAP_PX,
  );
  const currentTop = FOCUSED_PANEL_TOP_OFFSET_PX + normalized.y;
  const nextTop = clampNumber(currentTop + deltaY, FOCUSED_PANEL_TOP_OFFSET_PX, maxTop);

  return {
    x: Math.round(nextLeft - defaultLeft),
    y: Math.round(nextTop - FOCUSED_PANEL_TOP_OFFSET_PX),
  };
}

function normalizeOffsetAxis(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
