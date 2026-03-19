import type { CSSProperties, ReactElement } from 'react';
import type {
  DocumentModel,
  DocumentNode,
  NodeId,
  StickyDefinition,
  ViewportMeasurement,
  WrapperNode,
} from '../../model/types';
import { formatValue } from '../../model/units';
import {
  formatNodeLabel,
  getNodeAriaLabel,
} from '../../render/nodePresentation';
import {
  buildWrapperStyle,
  getContentWrapperBaseStyle,
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getNodeHeight,
  hasIntrinsicWidth,
  getNodeWidth,
  DEFAULT_RENDER_VIEWPORT,
  getWrapperBorderStyle,
  type MeshLayout,
  type RenderMeasuredNodeSizes,
} from '../../render/layout';
import { getStickyCssProperties, getStickyEdgeMode, usesSyntheticStickyTrack } from '../../render/sticky';
import type { RenderLeafPlanNode } from '../../render/types';
import {
  getStructuralResizeMinHeight,
  getResizeStartSize,
  numericHeight,
  numericWidth,
} from '../stageMath';
import { isNodeDescendantOf } from '../../editor/selection';
import type {
  RenderWrapperArgs,
  ResizeHandle,
  StageStickyRegistration,
} from '../types';
import { ResizeHandleView, renderOffsetVisual } from './resizeHandles';
import { renderLeaf, renderLeafSpacerOverlay } from './leafRenderer';

const STAGE_STICKY_VIEWPORT_INSET_TOP_PX = 22;
const STAGE_STICKY_VIEWPORT_INSET_BOTTOM_PX = 48;

export function renderWrapper({
  document,
  plan,
  selectedId,
  selectedIds,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  measuredNodeSizes,
  viewport,
  dragState,
  setDragState,
  setResizeState,
  onResizeStart,
  selfRegistration,
  ownerWrapper,
  ownerBottomLanePx,
}: RenderWrapperArgs): ReactElement {
  const node = plan.node;
  const draggedNodeIds = dragState?.draggedNodeIds ?? (dragState ? [dragState.nodeId] : []);
  const Tag = plan.tag;
  const meshLayout = plan.meshLayout;
  const wrapperResizeHandles = getWrapperResizeHandles(node, plan.isTopLevel);
  const wrapperStyle = buildWrapperStyle(node, plan.isTopLevel);
  const showWrapperSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedIds, node.id);
  const isStickyContentWrapper = plan.contentSticky;
  const isSelfStickyTrack = Boolean(
    selfRegistration &&
    usesSyntheticStickyTrack(node, { isTopLevel: plan.isTopLevel }),
  );
  const { topDistancePx, bottomDistancePx, bottomFirst } = getStickyTrackDistances(selfRegistration, node.sticky);
  const wrapperStickyCss =
    previewSticky && node.sticky?.enabled && node.sticky.target === 'self'
      ? getStageStickyCssProperties(node.sticky, { includePosition: true, includeZIndex: true })
      : undefined;
  const wrapperLayerStyle = selectedIds.includes(node.id) ? { zIndex: 'var(--editor-layer-selection)' } : undefined;
  const showPaddingVisual = shouldShowWrapperPaddingVisual(document, node, selectedIds);
  const contentWrapperStyle: CSSProperties = isStickyContentWrapper
    ? {
        width: '100%',
        ...getContentWrapperBaseStyle(node),
        ...getContentWrapperPaddingStyle(node),
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
        ...(previewSticky
          ? getStageStickyCssProperties(node.sticky as StickyDefinition, { includePosition: true, includeZIndex: true })
          : {}),
      }
    : {
        ...getContentWrapperBaseStyle(node),
        ...getContentWrapperPaddingStyle(node),
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
      };

  const wrapperBody = (
    <Tag
      key={node.id}
      id={`stage-node-${node.id}`}
      data-node-id={node.id}
      data-node-label={formatNodeLabel(node)}
      className={`stage-wrapper role-${node.role} ${selectedIds.includes(node.id) ? 'selected' : ''} ${
        selectedIds.length > 1 && selectedIds.includes(node.id) ? 'selected-multi' : ''
      } ${
        selectedIds.length === 1 && selectedId === node.id ? 'selected-primary' : ''
      } ${
        draggedNodeIds.includes(node.id) ? 'drag-source' : ''
      }`}
      aria-label={getNodeAriaLabel(node)}
      style={{
        ...wrapperStyle,
        ...(isSelfStickyTrack ? {} : plan.meshPlacement),
        ...getWrapperBorderStyle(node),
        ...wrapperStickyCss,
        ...wrapperLayerStyle,
      }}
    >
      <div
        className="content-wrapper"
        data-content-wrapper-for={node.id}
        data-drop-wrapper-id={node.id}
        style={contentWrapperStyle}
      >
        <div className="content-wrapper-surface" aria-hidden="true" style={getContentWrapperSurfaceStyle(node)} />
        {showGridLanes ? renderGridLaneOverlay(meshLayout, node, measuredNodeSizes, viewport) : null}
        {showPaddingVisual ? renderWrapperPaddingOverlay(node) : null}
        {showWrapperSpacerVisuals ? renderOffsetVisual(node.sticky, node, measuredNodeSizes, viewport, ownerWrapper) : null}
        {showWrapperSpacerVisuals
          ? renderWrapperSelfDistanceVisual(
              node,
              selfRegistration,
              ownerBottomLanePx,
              measuredNodeSizes,
              viewport,
            )
          : null}
        <div
          className="sticky-spacer-layer"
          style={{
            boxSizing: 'border-box',
            ...getContentWrapperPaddingStyle(node),
            display: 'grid',
            gridTemplateColumns: meshLayout.columnTemplate,
            gridTemplateRows: meshLayout.rowTemplate,
          }}
        >
          {plan.children
            .filter((child): child is RenderLeafPlanNode => child.kind === 'leaf')
            .map((child) =>
              renderLeafSpacerOverlay({
                child: child.node,
                owner: node,
                registration: plan.registrationMap.get(child.node.id),
                meshPlacement: child.meshPlacement,
                wrapperBottomLanePx: meshLayout.bottomLanePx,
                previewSticky,
                spacerVisibility,
                selectedId,
                selectedIds,
                measuredNodeSizes,
                viewport,
              }),
            )}
        </div>
        {showWrapperSpacerVisuals ? (
          <div
            className="sticky-spacer-range-layer"
            style={{
              boxSizing: 'border-box',
              ...getContentWrapperPaddingStyle(node),
            }}
          >
            {renderSpacerRanges(document, node, plan.stickyState.registrations, measuredNodeSizes, viewport)}
          </div>
        ) : null}
        {plan.children.map((child) =>
          child.kind === 'wrapper'
            ? renderWrapper({
                document,
                plan: child,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragState,
                setDragState,
                resizeState: null,
                setResizeState,
                onResizeStart,
                selfRegistration: plan.registrationMap.get(child.node.id),
                ownerWrapper: node,
                ownerBottomLanePx: getPreviewWrapperBottomLanePx(node, meshLayout.bottomLanePx, measuredNodeSizes, viewport),
              })
            : renderLeaf({
                plan: child,
                selectedId,
                selectedIds,
                previewSticky,
                dragState,
                setDragState,
                setResizeState,
                onResizeStart,
                registration: plan.registrationMap.get(child.node.id),
                measuredNodeSizes,
                viewport,
              }),
        )}
      </div>
      {selectedIds.length === 1 && selectedId === node.id && wrapperResizeHandles.length > 0 ? (
        <ResizeHandleView
          handles={wrapperResizeHandles}
          wideSouthHandle={isStructuralTopLevelWrapper(node, plan.isTopLevel)}
          onHandleMouseDown={(handle, event) => {
            event.stopPropagation();
            onResizeStart(node.id);
            const fallbackWidth = numericWidth(node.rect.width.base.raw);
            const fallbackHeight = numericHeight(node.rect.height.base.raw);
            const startSize = getResizeStartSize(event.currentTarget, fallbackWidth, fallbackHeight);
            setResizeState({
              nodeId: node.id,
              handle,
              startClientX: event.clientX,
              startClientY: event.clientY,
              originWidth: startSize.width,
              originHeight: startSize.height,
              originX: parseFloat(node.rect.x.base.raw) || 0,
              originY: parseFloat(node.rect.y.base.raw) || 0,
              minHeight: isStructuralTopLevelWrapper(node, plan.isTopLevel)
                ? getStructuralResizeMinHeight(event.currentTarget, startSize.height)
                : undefined,
            });
          }}
        />
      ) : null}
      {plan.extraExtent > 0 ? (
        <div
          className={`sticky-flow-spacer ${showWrapperSpacerVisuals ? '' : 'spacer-visual-hidden'}`}
          style={{ height: `${plan.extraExtent}px` }}
        />
      ) : null}
    </Tag>
  );

  if (!isSelfStickyTrack || !selfRegistration) {
    return wrapperBody;
  }

  const wrapperBaseHeightPx = getNodeHeight(node, measuredNodeSizes, viewport);
  const trackHeight = wrapperBaseHeightPx + topDistancePx + bottomDistancePx;
  return renderStickyTrackShell({
    nodeId: node.id,
    dragSourceId: dragState?.nodeId,
    style: {
      ...plan.meshPlacement,
      width: '100%',
      minHeight: `${trackHeight}px`,
    },
    bottomFirst,
    topDistancePx,
    bottomDistancePx,
    body: wrapperBody,
  });
}

export function getStageStickyCssProperties(
  sticky: StickyDefinition | undefined,
  options?: { includePosition?: boolean; includeZIndex?: boolean },
) {
  const style = getStickyCssProperties(sticky, options);

  if (!sticky?.enabled) {
    return style;
  }

  if (style.top != null) {
    style.top = toStageStickyInset(sticky.offsetTop?.raw ?? '0px', STAGE_STICKY_VIEWPORT_INSET_TOP_PX);
  }

  if (style.bottom != null) {
    style.bottom = toStageStickyInset(sticky.offsetBottom?.raw ?? '0px', STAGE_STICKY_VIEWPORT_INSET_BOTTOM_PX);
  }

  return style;
}

function toStageStickyInset(offset: string, stageInsetPx: number) {
  return `calc(${offset} + ${stageInsetPx}px)`;
}

export function getStickyTrackDistances(
  registration: StageStickyRegistration | undefined,
  sticky: WrapperNode['sticky'] | import('../types').StageSceneLeafNode['sticky'] | undefined,
) {
  const edgeMode = sticky ? getStickyEdgeMode(sticky) : 'top';
  if (!registration || !sticky?.enabled || sticky.target !== 'self' || sticky.durationMode === 'auto') {
    return {
      edgeMode,
      topDistancePx: 0,
      bottomDistancePx: 0,
      bottomFirst: false,
    };
  }

  const topDistancePx =
    edgeMode === 'both'
      ? registration.topDurationPx ?? registration.durationPx
      : edgeMode === 'top'
        ? registration.durationPx
        : 0;
  const bottomDistancePx =
    edgeMode === 'both'
      ? registration.bottomDurationPx ?? registration.durationPx
      : edgeMode === 'bottom'
        ? registration.durationPx
        : 0;

  return {
    edgeMode,
    topDistancePx,
    bottomDistancePx,
    bottomFirst: edgeMode === 'bottom' || edgeMode === 'both',
  };
}

export function getPreviewWrapperBottomLanePx(
  _wrapper: WrapperNode,
  bottomLanePx: number,
  _measuredNodeSizes: RenderMeasuredNodeSizes = {},
  _viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  return bottomLanePx;
}

export function getAutoStickySpacerDistances({
  edgeMode,
  ownerBottomLanePx,
  startPx,
  nodeHeightPx,
}: {
  edgeMode: 'top' | 'bottom' | 'both';
  ownerBottomLanePx: number;
  startPx: number;
  nodeHeightPx: number;
}) {
  const bottomDistancePx = Math.max(0, startPx - nodeHeightPx);
  const topDistancePx = Math.max(0, ownerBottomLanePx - startPx);

  if (edgeMode === 'bottom') {
    return {
      topDistancePx: 0,
      bottomDistancePx,
    };
  }

  if (edgeMode === 'both') {
    return {
      topDistancePx,
      bottomDistancePx,
    };
  }

  return {
    topDistancePx,
    bottomDistancePx: 0,
  };
}

function renderTrackSpacer(heightPx: number) {
  if (heightPx <= 0) {
    return null;
  }

  return (
    <div
      className="sticky-track-spacer"
      style={{
        height: `${heightPx}px`,
      }}
    />
  );
}

export function renderStickyTrackShell({
  nodeId,
  dragSourceId,
  style,
  bottomFirst,
  topDistancePx,
  bottomDistancePx,
  body,
}: {
  nodeId: string;
  dragSourceId: string | undefined;
  style: CSSProperties;
  bottomFirst: boolean;
  topDistancePx: number;
  bottomDistancePx: number;
  body: ReactElement;
}) {
  return (
    <div
      key={`${nodeId}-track`}
      className={`sticky-track ${dragSourceId === nodeId ? 'drag-source' : ''}`}
      style={style}
    >
      {bottomFirst ? renderTrackSpacer(bottomDistancePx) : null}
      {body}
      {bottomFirst ? null : renderTrackSpacer(topDistancePx)}
    </div>
  );
}

function isStructuralTopLevelWrapper(node: WrapperNode, isTopLevel: boolean) {
  return isTopLevel && (node.role === 'section' || node.role === 'header' || node.role === 'footer');
}

function getWrapperResizeHandles(node: WrapperNode, isTopLevel: boolean): ResizeHandle[] {
  if (isStructuralTopLevelWrapper(node, isTopLevel)) {
    return usesAspectRatioHeight(node) ? [] : ['s'];
  }

  return isTopLevel ? [] : ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
}

function usesAspectRatioHeight(node: WrapperNode) {
  return !('unit' in node.rect.height.base.parsed) && node.rect.height.base.parsed.keyword === 'aspect-ratio';
}

function shouldShowSpacerVisuals(
  spacerVisibility: 'selected' | 'all',
  selectedIds: NodeId[],
  ownerId: NodeId,
) {
  return spacerVisibility === 'all' || selectedIds.includes(ownerId);
}

function renderWrapperSelfDistanceVisual(
  node: WrapperNode,
  registration?: StageStickyRegistration,
  ownerBottomLanePx?: number,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  if (!registration || !node.sticky?.enabled || node.sticky.target !== 'self') {
    return null;
  }

  const edgeMode = getStickyEdgeMode(node.sticky);
  const isBottomOnlySticky = edgeMode === 'bottom';
  const isBothSticky = edgeMode === 'both';
  const isTopLevelAutoOnly = node.role !== 'container' && node.sticky.target === 'self';
  const isAuto = isTopLevelAutoOnly || (node.sticky.durationMode ?? 'auto') === 'auto';
  const nodeHeightPx = getNodeHeight(node, measuredNodeSizes, viewport);
  if (isTopLevelAutoOnly) {
    return (
      <>
        {isBottomOnlySticky || isBothSticky ? (
          <div className="sticky-auto-indicator sticky-auto-indicator-bottom">
            <span className="sticky-spacer-label sticky-spacer-label-auto">
              {isBothSticky ? 'Bottom Distance: auto' : 'Distance: auto'}
            </span>
          </div>
        ) : null}
        {!isBottomOnlySticky ? (
          <div className="sticky-auto-indicator sticky-auto-indicator-top">
            <span className="sticky-spacer-label sticky-spacer-label-auto">
              {isBothSticky ? 'Top Distance: auto' : 'Distance: auto'}
            </span>
          </div>
        ) : null}
      </>
    );
  }

  const autoDistances = getAutoStickySpacerDistances({
    edgeMode,
    ownerBottomLanePx: ownerBottomLanePx ?? nodeHeightPx,
    startPx: registration.startPx,
    nodeHeightPx,
  });
  const topDistancePx = isAuto
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
  const bottomDistancePx = isAuto
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
  const topSpacerAnchorStyle = { top: '100%', bottom: 'auto' } as const;
  const bottomSpacerAnchorStyle = { top: 'auto', bottom: '100%' } as const;

  return (
    <>
      {bottomDistancePx > 0 ? (
        <div
          className={
            isAuto
              ? 'sticky-auto-spacer sticky-auto-spacer-bottom'
              : 'sticky-distance-spacer-visual sticky-distance-spacer-visual-bottom'
          }
          style={{
            ...bottomSpacerAnchorStyle,
            height: `${bottomDistancePx}px`,
          }}
        >
          <span className={`sticky-spacer-label ${isAuto ? 'sticky-spacer-label-auto' : ''}`}>
            {isAuto
              ? isBothSticky
                ? 'Bottom Distance: auto'
                : 'Distance: auto'
              : isBothSticky
                ? `Bottom Distance · ${Math.round(bottomDistancePx)}px`
                : `Distance · ${Math.round(bottomDistancePx)}px`}
          </span>
        </div>
      ) : null}
      {topDistancePx > 0 ? (
        <div
          className={
            isAuto
              ? 'sticky-auto-spacer sticky-auto-spacer-top'
              : 'sticky-distance-spacer-visual sticky-distance-spacer-visual-top'
          }
          style={{
            ...topSpacerAnchorStyle,
            height: `${topDistancePx}px`,
          }}
        >
          <span className={`sticky-spacer-label ${isAuto ? 'sticky-spacer-label-auto' : ''}`}>
            {isAuto
              ? isBothSticky
                ? 'Top Distance: auto'
                : 'Distance: auto'
              : isBothSticky
                ? `Top Distance · ${Math.round(topDistancePx)}px`
                : `Distance · ${Math.round(topDistancePx)}px`}
          </span>
        </div>
      ) : null}
    </>
  );
}

function renderSpacerRanges(
  document: DocumentModel,
  wrapper: WrapperNode,
  registrations: StageStickyRegistration[],
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  if (registrations.length === 0) {
    return null;
  }

  return registrations
    .filter((registration) => registration.target === 'contentWrapper')
    .map((registration) => {
      const owner = document.nodes[registration.ownerId];
      if (!owner || owner.type === 'site') {
        return null;
      }

      const style = getSpacerRangeStyle(owner, registration, wrapper, measuredNodeSizes, viewport);
      return (
        <div
          key={registration.ownerId}
          className={`sticky-spacer-range ${owner.sticky?.durationMode === 'auto' ? 'sticky-spacer-range-auto' : ''}`}
          style={style}
        >
          {owner.sticky?.durationMode === 'auto' ? (
            <span className="sticky-spacer-label sticky-spacer-label-auto">Distance: auto</span>
          ) : (
            <span className="sticky-spacer-label">{`Distance · ${Math.round(registration.durationPx)}px`}</span>
          )}
        </div>
      );
    });
}

function getSpacerRangeStyle(
  owner: Exclude<DocumentNode, { type: 'site' }>,
  registration: StageStickyRegistration,
  wrapper: WrapperNode,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
): CSSProperties {
  if (owner.type === 'wrapper' && owner.id === wrapper.id) {
    return {
      left: 0,
      top: `${registration.startPx}px`,
      width: '100%',
      height: `${registration.durationPx}px`,
    };
  }

  const width = hasIntrinsicWidth(owner)
    ? `${getNodeWidth(owner, measuredNodeSizes, viewport)}px`
    : formatValue(owner.rect.width.base.parsed);

  return {
    left: owner.rect.x.base.raw,
    top: `${registration.startPx}px`,
    width,
    height: `${registration.durationPx}px`,
  };
}

function renderGridLaneOverlay(
  meshLayout: MeshLayout,
  node: WrapperNode,
  _measuredNodeSizes: RenderMeasuredNodeSizes = {},
  _viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  const verticalLines = meshLayout.columnLines.slice(1, -1);
  const horizontalLines = meshLayout.rowLines.slice(1, -1);

  if (verticalLines.length === 0 && horizontalLines.length === 0) {
    return null;
  }

  return (
    <div
      className="grid-lane-overlay"
      aria-hidden="true"
      style={{
        boxSizing: 'border-box',
        ...getContentWrapperPaddingStyle(node),
      }}
    >
      {verticalLines.map((line) => (
        <div
          key={`v-${line}`}
          className="grid-lane grid-lane-vertical"
          style={{ left: `${line}px` }}
        />
      ))}
      {horizontalLines.map((line) => (
        <div
          key={`h-${line}`}
          className="grid-lane grid-lane-horizontal"
          style={{ top: `${line}px` }}
        />
      ))}
    </div>
  );
}

function renderWrapperPaddingOverlay(node: WrapperNode) {
  return (
    <div className="wrapper-padding-overlay" aria-hidden="true">
      <div
        className="wrapper-padding-overlay-boundary"
        style={getWrapperPaddingInsetStyle(node)}
      />
    </div>
  );
}

function getWrapperPaddingInsetStyle(node: WrapperNode): CSSProperties {
  return {
    top: node.style.paddingTop ? formatValue(node.style.paddingTop.parsed) : '0px',
    right: node.style.paddingRight ? formatValue(node.style.paddingRight.parsed) : '0px',
    bottom: node.style.paddingBottom ? formatValue(node.style.paddingBottom.parsed) : '0px',
    left: node.style.paddingLeft ? formatValue(node.style.paddingLeft.parsed) : '0px',
  };
}

function shouldShowWrapperPaddingVisual(
  document: DocumentModel,
  node: WrapperNode,
  selectedIds: NodeId[],
) {
  if (selectedIds.length === 0) {
    return false;
  }
  if (node.role !== 'section' && node.role !== 'header' && node.role !== 'footer' && node.role !== 'container') {
    return false;
  }
  if (!hasNonZeroWrapperPadding(node)) {
    return false;
  }
  return selectedIds.includes(node.id) || selectedIds.some((selectedId) => isNodeDescendantOf(document, selectedId, node.id));
}

function hasNonZeroWrapperPadding(node: WrapperNode) {
  return [node.style.paddingTop, node.style.paddingRight, node.style.paddingBottom, node.style.paddingLeft].some((value) => {
    if (!value) {
      return false;
    }
    return value.parsed.value !== 0;
  });
}
