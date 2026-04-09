export type RichToolbarPlacement = 'above' | 'below';

export type RichToolbarOffset = {
  x: number;
  y: number;
};

type ToolbarViewportArgs = {
  rootRect: DOMRect;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  offset?: Partial<RichToolbarOffset> | null;
};

type ClampToolbarOffsetArgs = ToolbarViewportArgs & {
  deltaX: number;
  deltaY: number;
};

export const RICH_TOOLBAR_EDGE_GAP_PX = 16;
export const RICH_TOOLBAR_TOPBAR_HEIGHT_PX = 56;
export const RICH_TOOLBAR_TOPBAR_GAP_PX = 8;
export const RICH_TOOLBAR_ANCHOR_GAP_PX = 10;
export const RICH_TOOLBAR_SESSION_KEY = 'sticky-playground.rich-toolbar-offset.v1';
export const DEFAULT_RICH_TOOLBAR_OFFSET: RichToolbarOffset = { x: 0, y: 0 };

export function normalizeRichToolbarOffset(value: Partial<RichToolbarOffset> | null | undefined): RichToolbarOffset {
  return {
    x: normalizeOffsetAxis(value?.x),
    y: normalizeOffsetAxis(value?.y),
  };
}

export function getRichToolbarViewportPosition({
  rootRect,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
  offset,
}: ToolbarViewportArgs) {
  const placement = getRichToolbarPlacement({ rootRect, panelHeight });
  const normalizedOffset = normalizeRichToolbarOffset(offset);
  const anchorLeft = rootRect.left;
  const anchorTop =
    placement === 'above'
      ? rootRect.top - panelHeight - RICH_TOOLBAR_ANCHOR_GAP_PX
      : rootRect.bottom + RICH_TOOLBAR_ANCHOR_GAP_PX;

  const minTop = RICH_TOOLBAR_TOPBAR_HEIGHT_PX + RICH_TOOLBAR_TOPBAR_GAP_PX;
  const maxTop = Math.max(minTop, viewportHeight - panelHeight - RICH_TOOLBAR_EDGE_GAP_PX);
  const maxLeft = Math.max(RICH_TOOLBAR_EDGE_GAP_PX, viewportWidth - panelWidth - RICH_TOOLBAR_EDGE_GAP_PX);

  return {
    placement,
    anchorLeft,
    anchorTop,
    left: clampNumber(anchorLeft + normalizedOffset.x, RICH_TOOLBAR_EDGE_GAP_PX, maxLeft),
    top: clampNumber(anchorTop + normalizedOffset.y, minTop, maxTop),
  };
}

export function clampRichToolbarOffset({
  rootRect,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
  offset,
  deltaX,
  deltaY,
}: ClampToolbarOffsetArgs): RichToolbarOffset {
  const normalizedOffset = normalizeRichToolbarOffset(offset);
  const current = getRichToolbarViewportPosition({
    rootRect,
    panelWidth,
    panelHeight,
    viewportWidth,
    viewportHeight,
    offset: normalizedOffset,
  });
  const minTop = RICH_TOOLBAR_TOPBAR_HEIGHT_PX + RICH_TOOLBAR_TOPBAR_GAP_PX;
  const maxTop = Math.max(minTop, viewportHeight - panelHeight - RICH_TOOLBAR_EDGE_GAP_PX);
  const maxLeft = Math.max(RICH_TOOLBAR_EDGE_GAP_PX, viewportWidth - panelWidth - RICH_TOOLBAR_EDGE_GAP_PX);
  const nextLeft = clampNumber(current.left + deltaX, RICH_TOOLBAR_EDGE_GAP_PX, maxLeft);
  const nextTop = clampNumber(current.top + deltaY, minTop, maxTop);

  return {
    x: Math.round(nextLeft - current.anchorLeft),
    y: Math.round(nextTop - current.anchorTop),
  };
}

export function readRichToolbarSessionOffset() {
  if (typeof window === 'undefined') {
    return DEFAULT_RICH_TOOLBAR_OFFSET;
  }

  try {
    const raw = window.sessionStorage.getItem(RICH_TOOLBAR_SESSION_KEY);
    if (!raw) {
      return DEFAULT_RICH_TOOLBAR_OFFSET;
    }
    return normalizeRichToolbarOffset(JSON.parse(raw) as Partial<RichToolbarOffset>);
  } catch {
    return DEFAULT_RICH_TOOLBAR_OFFSET;
  }
}

export function persistRichToolbarSessionOffset(offset: Partial<RichToolbarOffset> | null | undefined) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RICH_TOOLBAR_SESSION_KEY,
      JSON.stringify(normalizeRichToolbarOffset(offset)),
    );
  } catch {}
}

function getRichToolbarPlacement({
  rootRect,
  panelHeight,
}: {
  rootRect: DOMRect;
  panelHeight: number;
}): RichToolbarPlacement {
  const topThreshold =
    RICH_TOOLBAR_TOPBAR_HEIGHT_PX +
    RICH_TOOLBAR_TOPBAR_GAP_PX +
    panelHeight +
    RICH_TOOLBAR_ANCHOR_GAP_PX;
  return rootRect.top < topThreshold ? 'below' : 'above';
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
