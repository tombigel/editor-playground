import type { MouseEvent } from 'react';
import type {
  DocumentNode,
  StickyDefinition,
  ViewportMeasurement,
  WrapperNode,
} from '../../model/types';
import {
  resolveOffsetPx,
  DEFAULT_RENDER_VIEWPORT,
  type RenderMeasuredNodeSizes,
} from '../../render/layout';
import { getStickyEdgeMode } from '../../render/sticky';
import { resolveSpacingPx } from '../../model/units';
import type { ResizeHandle } from '../types';

const DEFAULT_LAYOUT_FONT_REFERENCE_PX = 16;

export function ResizeHandleView({
  handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
  wideSouthHandle = false,
  onHandleMouseDown,
}: {
  handles?: ResizeHandle[];
  wideSouthHandle?: boolean;
  onHandleMouseDown: (handle: ResizeHandle, event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      {handles.map((handle) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: editor resize handle, mouse-only interaction
        <div
          key={handle}
          className={`resize-handle handle-${handle}${handle === 's' && wideSouthHandle ? ' resize-handle-structural-s' : ''}`}
          data-stage-resize-handle="true"
          onMouseDown={(event) => onHandleMouseDown(handle, event)}
        />
      ))}
    </>
  );
}

export function renderOffsetVisual(
  sticky: StickyDefinition | undefined,
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
  ownerWrapper?: WrapperNode,
) {
  if (!sticky?.enabled) {
    return null;
  }

  const topPaddingPx = ownerWrapper ? resolveWrapperPaddingPx(ownerWrapper, 'top', measuredNodeSizes, viewport) : 0;
  const bottomPaddingPx = ownerWrapper
    ? resolveWrapperPaddingPx(ownerWrapper, 'bottom', measuredNodeSizes, viewport)
    : 0;

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'both') {
    const topOffsetPx = resolveStickyOffsetPx(sticky, node, 'top', measuredNodeSizes, viewport);
    const bottomOffsetPx = resolveStickyOffsetPx(sticky, node, 'bottom', measuredNodeSizes, viewport);
    if (topOffsetPx <= 0 && bottomOffsetPx <= 0) {
      return null;
    }
    return (
      <>
        {topOffsetPx > 0 ? renderOffsetVisualForEdge(topOffsetPx, 'top', true, topPaddingPx) : null}
        {bottomOffsetPx > 0 ? renderOffsetVisualForEdge(bottomOffsetPx, 'bottom', true, bottomPaddingPx) : null}
      </>
    );
  }

  const offsetPx = resolveStickyOffsetPx(sticky, node, edgeMode, measuredNodeSizes, viewport);
  if (offsetPx <= 0) {
    return null;
  }

  return renderOffsetVisualForEdge(
    offsetPx,
    edgeMode,
    false,
    edgeMode === 'top' ? topPaddingPx : bottomPaddingPx,
  );
}

function resolveStickyOffsetPx(
  sticky: StickyDefinition,
  node: Exclude<DocumentNode, { type: 'site' }>,
  edge: 'top' | 'bottom',
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  const offset =
    edge === 'top'
      ? sticky.offsetTop ?? sticky.offsetBottom
      : sticky.offsetBottom ?? sticky.offsetTop;
  return offset ? resolveOffsetPx(offset, node, measuredNodeSizes, viewport) : 0;
}

function renderOffsetVisualForEdge(
  offsetPx: number,
  edge: 'top' | 'bottom',
  showEdgeLabel: boolean,
  paddingPx = 0,
) {
  const paddingSegmentPx = Math.max(0, paddingPx);
  const mainSegmentPx = Math.max(0, offsetPx);
  const totalGuidePx = mainSegmentPx + paddingSegmentPx;
  const paddingBoundaryPx = edge === 'top' ? paddingSegmentPx : mainSegmentPx;
  const positionStyle =
    edge === 'bottom'
      ? { top: 'auto', bottom: `${-totalGuidePx}px` }
      : { top: `${-totalGuidePx}px`, bottom: 'auto' };
  const labelText = showEdgeLabel
    ? `${edge === 'top' ? 'Top' : 'Bottom'} Offset · ${Math.round(offsetPx)}px`
    : `Offset · ${Math.round(offsetPx)}px`;

  return (
    <div
      className={`sticky-offset-visual ${
        edge === 'bottom' ? 'sticky-offset-visual-bottom' : 'sticky-offset-visual-top'
      } ${showEdgeLabel ? 'sticky-guide-dual' : ''}`}
      style={{ height: `${totalGuidePx}px`, ...positionStyle }}
    >
      <div className="sticky-offset-track" aria-hidden="true">
        {mainSegmentPx > 0 ? (
          <div
            className={`sticky-offset-main-segment sticky-offset-main-segment-${edge}`}
            style={{ height: `${mainSegmentPx}px` }}
          >
            <span className="sticky-offset-label">
              {labelText}
            </span>
          </div>
        ) : null}
        {paddingSegmentPx > 0 ? (
          <div
            className={`sticky-offset-padding-segment sticky-offset-padding-segment-${edge}`}
            style={{ height: `${paddingSegmentPx}px` }}
          />
        ) : null}
        {paddingSegmentPx > 0 ? (
          <span
            className="sticky-offset-label sticky-offset-label-padding"
            style={{ top: `${paddingBoundaryPx}px` }}
          >
            {`Padding · ${Math.round(paddingPx)}px`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function resolveWrapperPaddingPx(
  wrapper: WrapperNode,
  edge: 'top' | 'right' | 'bottom' | 'left',
  _measuredNodeSizes: RenderMeasuredNodeSizes = {},
  _viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  const padding =
    edge === 'top'
      ? wrapper.style.paddingTop
      : edge === 'right'
        ? wrapper.style.paddingRight
        : edge === 'bottom'
          ? wrapper.style.paddingBottom
          : wrapper.style.paddingLeft;
  if (!padding) {
    return 0;
  }

  return resolveSpacingPx(padding.parsed, {
    rootFontSizePx: DEFAULT_LAYOUT_FONT_REFERENCE_PX,
    inheritedFontSizePx: DEFAULT_LAYOUT_FONT_REFERENCE_PX,
  });
}
