import type { CSSProperties } from 'react';
import type {
  NodeId,
  ViewportMeasurement,
  WrapperNode,
} from '../../model/types';
import { formatValue } from '../../model/units';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../../render/leafPresentation';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  isBrandMark,
  renderLeafContent,
} from '../../render/nodePresentation';
import {
  getLeafCssHeight,
  getNodeHeight,
  getTrackCssWidth,
  type RenderMeasuredNodeSizes,
  usesIntrinsicHeight,
} from '../../render/layout';
import { getStickyEdgeMode, usesSyntheticStickyTrack } from '../../render/sticky';
import type { RenderLeafPlanNode } from '../../render/types';
import {
  getResizeStartSize,
  numericHeight,
  numericWidth,
  type DragState,
  type ResizeState,
} from '../stageMath';
import type {
  StageSceneLeafNode as LeafNode,
  StageStickyRegistration,
} from '../types';
import { ResizeHandleView, renderOffsetVisual } from './resizeHandles';
import {
  getStageStickyCssProperties,
  getStickyTrackDistances,
  renderStickyTrackShell,
  getAutoStickySpacerDistances,
  getPreviewWrapperBottomLanePx,
} from './wrapperRenderer';

export function renderLeaf({
  plan,
  selectedId,
  selectedIds,
  previewSticky,
  dragState,
  setDragState: _setDragState,
  setResizeState,
  onResizeStart,
  registration,
  measuredNodeSizes,
  viewport,
}: {
  plan: RenderLeafPlanNode;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  previewSticky: boolean;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  registration?: StageStickyRegistration;
  measuredNodeSizes: RenderMeasuredNodeSizes;
  viewport: ViewportMeasurement;
}) {
  const child = plan.node;
  const draggedNodeIds = dragState?.draggedNodeIds ?? (dragState ? [dragState.nodeId] : []);
  const meshPlacement = plan.meshPlacement;
  const isAutoSticky =
    child.sticky?.enabled && child.sticky.target === 'self' && child.sticky.durationMode === 'auto' && registration;
  const isSelfStickyTrack = usesSyntheticStickyTrack(child) && registration;
  const { topDistancePx, bottomDistancePx, bottomFirst } = getStickyTrackDistances(registration, child.sticky);
  const brandMark = isBrandMark(child);
  const leafBaseWidth = formatValue(child.rect.width.base.parsed);
  const leafBaseHeight = getLeafCssHeight(child);
  const intrinsicHeightLeaf = usesIntrinsicHeight(child);
  const trackWidth = getTrackCssWidth(child);
  const leafBody = (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: editor canvas node, not web content
    <div
      key={child.id}
      id={`stage-node-${child.id}`}
      data-node-id={child.id}
      data-node-label={formatNodeLabel(child)}
      className={`stage-leaf role-${child.role} ${brandMark ? 'is-brand-mark' : ''} ${
        selectedIds.includes(child.id) ? 'selected' : ''
      } ${selectedIds.length > 1 && selectedIds.includes(child.id) ? 'selected-multi' : ''} ${selectedIds.length === 1 && selectedId === child.id ? 'selected-primary' : ''} ${draggedNodeIds.includes(child.id) ? 'drag-source' : ''}`}
      aria-label={getNodeAriaLabel(child)}
      style={{
        ...(isSelfStickyTrack
          ? {
              width: leafBaseWidth,
            }
          : {
              ...meshPlacement,
              alignSelf: intrinsicHeightLeaf ? 'start' : meshPlacement?.alignSelf,
              width: leafBaseWidth,
            }),
        height: leafBaseHeight,
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        position: previewSticky && (isSelfStickyTrack || isAutoSticky) ? 'sticky' : 'relative',
        ...(previewSticky && child.sticky?.enabled
          ? getStageStickyCssProperties(child.sticky, { includeZIndex: true })
          : {}),
        ...(selectedIds.includes(child.id) ? { zIndex: 'var(--editor-layer-selection)' } : {}),
      }}
    >
      <div
        className="stage-leaf-body"
        style={child.role === 'image' ? styleRecordToReactStyle(getLeafInlineStyle(child)) : undefined}
      >
        {renderLeafContent(child, {
          contentStyle: child.role === 'image' ? undefined : styleRecordToReactStyle(getLeafInlineStyle(child)),
          imageClassName: 'stage-image',
          imagePlaceholderClassName: 'image-placeholder',
          imageDraggable: false,
          disableTabNavigation: true,
        })}
      </div>
      {selectedIds.length === 1 && selectedId === child.id ? (
        <ResizeHandleView
          onHandleMouseDown={(handle, event) => {
            event.stopPropagation();
            onResizeStart(child.id);
            const fallbackWidth = numericWidth(child.rect.width.base.raw);
            const fallbackHeight = numericHeight(child.rect.height.base.raw);
            const startSize = getResizeStartSize(event.currentTarget, fallbackWidth, fallbackHeight);
            setResizeState({
              nodeId: child.id,
              handle,
              startClientX: event.clientX,
              startClientY: event.clientY,
              originWidth: startSize.width,
              originHeight: startSize.height,
              originX: parseFloat(child.rect.x.base.raw) || 0,
              originY: parseFloat(child.rect.y.base.raw) || 0,
            });
          }}
        />
      ) : null}
    </div>
  );

  if (!isSelfStickyTrack) {
    return leafBody;
  }

  const leafHeightPx = getNodeHeight(child, measuredNodeSizes, viewport);
  const trackHeight =
    isAutoSticky
      ? leafHeightPx
      : leafHeightPx + topDistancePx + bottomDistancePx;
  return renderStickyTrackShell({
    nodeId: child.id,
    dragSourceId: dragState?.nodeId,
    style: {
      ...meshPlacement,
      width: trackWidth,
      minHeight: `${trackHeight}px`,
    },
    bottomFirst,
    topDistancePx,
    bottomDistancePx,
    body: leafBody,
  });
}

export function renderLeafSpacerOverlay({
  child,
  owner,
  registration,
  meshPlacement,
  wrapperBottomLanePx,
  previewSticky,
  spacerVisibility,
  selectedId: _selectedId,
  selectedIds,
  measuredNodeSizes,
  viewport,
}: {
  child: LeafNode;
  owner: WrapperNode;
  registration?: StageStickyRegistration;
  meshPlacement?: CSSProperties;
  wrapperBottomLanePx: number;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  measuredNodeSizes: RenderMeasuredNodeSizes;
  viewport: ViewportMeasurement;
}) {
  if (!registration || !child.sticky?.enabled || child.sticky.target !== 'self') {
    return null;
  }

  const showLeafSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedIds, child.id);
  if (!showLeafSpacerVisuals) {
    return null;
  }

  const edgeMode = getStickyEdgeMode(child.sticky);
  const isBottomOnlySticky = edgeMode === 'bottom';
  const isBothSticky = edgeMode === 'both';
  const leafHeightPx = getNodeHeight(child, measuredNodeSizes, viewport);
  const autoDistances = getAutoStickySpacerDistances({
    edgeMode,
    ownerBottomLanePx: getPreviewWrapperBottomLanePx(owner, wrapperBottomLanePx, measuredNodeSizes, viewport),
    startPx: registration.startPx,
    nodeHeightPx: leafHeightPx,
  });
  const topDistancePx =
    child.sticky.durationMode === 'auto'
      ? edgeMode === 'both'
        ? autoDistances.topDistancePx
        : isBottomOnlySticky
          ? 0
          : autoDistances.topDistancePx
      : edgeMode === 'both'
        ? Math.max(0, registration.topDurationPx ?? registration.durationPx)
        : isBottomOnlySticky
          ? 0
          : Math.max(0, registration.durationPx);
  const bottomDistancePx =
    child.sticky.durationMode === 'auto'
      ? edgeMode === 'both'
        ? autoDistances.bottomDistancePx
        : isBottomOnlySticky
          ? autoDistances.bottomDistancePx
          : 0
      : edgeMode === 'both'
        ? Math.max(0, registration.bottomDurationPx ?? registration.durationPx)
        : isBottomOnlySticky
          ? Math.max(0, registration.durationPx)
          : 0;
  const trackOffsetPx =
    (isBottomOnlySticky || isBothSticky) && child.sticky.durationMode !== 'auto'
      ? bottomDistancePx
      : 0;
  const topSpacerAnchorStyle = { top: '100%', bottom: 'auto' };
  const bottomSpacerAnchorStyle = { top: 'auto', bottom: '100%' };

  return (
    <div
      key={`${child.id}-overlay`}
      className="leaf-spacer-overlay"
      style={{
        ...meshPlacement,
        position: previewSticky ? 'sticky' : 'relative',
        width: '100%',
        height: `${leafHeightPx}px`,
        minHeight: `${leafHeightPx}px`,
        alignSelf: 'start',
        marginTop: trackOffsetPx > 0 ? `${trackOffsetPx}px` : undefined,
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        ...(previewSticky ? getStageStickyCssProperties(child.sticky) : {}),
      }}
    >
      {renderOffsetVisual(child.sticky, child, measuredNodeSizes, viewport, owner)}
      {child.sticky.durationMode === 'auto' ? (
        <>
          {bottomDistancePx > 0 ? (
            <div
              className={`sticky-auto-spacer sticky-auto-spacer-bottom ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...bottomSpacerAnchorStyle,
                height: `${bottomDistancePx}px`,
              }}
            >
              <span className="sticky-spacer-label sticky-spacer-label-auto">
                {isBothSticky ? 'Bottom Distance: auto' : 'Distance: auto'}
              </span>
            </div>
          ) : null}
          {topDistancePx > 0 ? (
            <div
              className={`sticky-auto-spacer sticky-auto-spacer-top ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...topSpacerAnchorStyle,
                height: `${topDistancePx}px`,
              }}
            >
              <span className="sticky-spacer-label sticky-spacer-label-auto">
                {isBothSticky ? 'Top Distance: auto' : 'Distance: auto'}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {bottomDistancePx > 0 ? (
            <div
              className={`sticky-distance-spacer-visual sticky-distance-spacer-visual-bottom ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...bottomSpacerAnchorStyle,
                height: `${bottomDistancePx}px`,
              }}
            >
              <span className="sticky-spacer-label">
                {isBothSticky
                  ? `Bottom Distance · ${Math.round(bottomDistancePx)}px`
                  : `Distance · ${Math.round(bottomDistancePx)}px`}
              </span>
            </div>
          ) : null}
          {topDistancePx > 0 ? (
            <div
              className={`sticky-distance-spacer-visual sticky-distance-spacer-visual-top ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...topSpacerAnchorStyle,
                height: `${topDistancePx}px`,
              }}
            >
              <span className="sticky-spacer-label">
                {isBothSticky
                  ? `Top Distance · ${Math.round(topDistancePx)}px`
                  : `Distance · ${Math.round(topDistancePx)}px`}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function shouldShowSpacerVisuals(
  spacerVisibility: 'selected' | 'all',
  selectedIds: NodeId[],
  ownerId: NodeId,
) {
  return spacerVisibility === 'all' || selectedIds.includes(ownerId);
}
