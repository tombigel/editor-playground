import type { CSSProperties, ReactElement } from 'react';
import type {
  ContainerNode,
  DocumentModel,
  DocumentNode,
  NodeId,
  StickyDefinition,
  ViewportMeasurement,
} from '../../model/types';
import { isContainerNode } from '../../model/types';
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
  getContentWrapperTextClipBackgroundStyle,
  getNodeHeight,
  hasIntrinsicWidth,
  getNodeWidth,
  DEFAULT_RENDER_VIEWPORT,
  getWrapperBorderStyle,
  type MeshLayout,
  type RenderMeasuredNodeSizes,
} from '../../render/layout';
import { getStickyCssProperties, getStickyEdgeMode, resolveStickyIsElevated, usesSyntheticStickyTrack } from '../../render/sticky';
import { STICKY_LAYER_Z_INDEX } from '../../render/layers';
import type { RenderLeafPlanNode } from '../../render/types';
import { isNodeDescendantOf } from '../../editor/selection';
import type {
  RenderWrapperArgs,
  ResizeHandle,
  StageStickyRegistration,
} from '../types';
import { renderOffsetVisual } from './resizeHandles';
import { renderLeaf, renderLeafSpacerOverlay } from './leafRenderer';

const STAGE_STICKY_VIEWPORT_INSET_TOP_PX = 22;
const STAGE_STICKY_VIEWPORT_INSET_BOTTOM_PX = 48;

export function renderContainer({
  document,
  plan,
  selectedId,
  selectedIds,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  measuredNodeSizes,
  viewport,
  dragSourceIds,
  highlightedDropId,
  registerDraggableNode,
  registerDropTarget,
  selfRegistration,
  ownerWrapper,
  ownerBottomLanePx,
  interactKeys,
}: RenderWrapperArgs): ReactElement {
  const node = plan.node;
  const Tag = plan.tag;
  const hiddenStyle = getStageHiddenStyle(plan.hiddenState);
  const meshLayout = plan.meshLayout;
  const wrapperStyle = buildWrapperStyle(node, plan.isTopLevel);
  const hasSelectedDescendant = selectedIds.some((selectedId) =>
    isNodeDescendantOf(document, selectedId, node.id),
  );
  const showWrapperSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedIds, node.id);
  const isHighlightedDropTarget = highlightedDropId === node.id;
  const showSectionSelectionContext = node.subtype === 'section' && !selectedIds.includes(node.id) && hasSelectedDescendant;
  const isStickyContentWrapper = plan.contentSticky;
  const isSelfStickyTrack = Boolean(
    selfRegistration &&
    usesSyntheticStickyTrack(node, { isTopLevel: plan.isTopLevel }),
  );
  const siteNode = document.nodes[document.rootId];
  const globalStickyElevation = siteNode.contentType === 'site' ? (siteNode.stickyElevation ?? true) : true;
  const isElevated = node.sticky?.enabled
    ? resolveStickyIsElevated(node.sticky, globalStickyElevation)
    : true;
  const { topDistancePx, bottomDistancePx, bottomFirst } = getStickyTrackDistances(selfRegistration, node.sticky);
  const wrapperStickyCss =
    previewSticky && node.sticky?.enabled && node.sticky.target === 'self'
      ? getStageStickyCssProperties(node.sticky, { includePosition: true, includeZIndex: true })
      : undefined;
  const showPaddingVisual =
    shouldShowWrapperPaddingVisual(document, node, selectedIds) ||
    shouldShowDropTargetPaddingVisual(node, isHighlightedDropTarget);
  const groupContentPlacement = node.subtype === 'group' && !isSelfStickyTrack ? plan.meshPlacement : {};
  const contentWrapperStyle: CSSProperties = isStickyContentWrapper
    ? {
        width: '100%',
        ...getContentWrapperBaseStyle(node),
        ...groupContentPlacement,
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
        ...groupContentPlacement,
        ...getContentWrapperPaddingStyle(node),
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
      };

  const wrapperBody = (
    <Tag
      key={node.id}
      id={`stage-node-${node.id}`}
      ref={(element) => registerDraggableNode(node.id, element)}
      data-node-id={node.id}
      data-node-label={formatNodeLabel(node)}
      {...(interactKeys?.has(node.id) ? { 'data-interact-key': node.id } : {})}
      className={`stage-wrapper subtype-${node.subtype} ${selectedIds.includes(node.id) ? 'selected' : ''} ${
        selectedIds.length > 1 && selectedIds.includes(node.id) ? 'selected-multi' : ''
      } ${
        selectedIds.length === 1 && selectedId === node.id ? 'selected-primary' : ''
      } ${
        dragSourceIds.includes(node.id) ? 'drag-source' : ''
      } ${isHighlightedDropTarget ? 'drop-target' : ''} ${
        plan.hiddenState.isEffectivelyHidden ? 'is-effectively-hidden' : ''
      } ${plan.hiddenState.isGhostVisible ? 'is-hidden-ghost' : ''} ${
        plan.hiddenState.isHiddenSelected ? 'is-hidden-selected' : ''
      } ${showSectionSelectionContext ? 'selected-context' : ''
      }`}
      data-hidden={plan.hiddenState.isEffectivelyHidden ? 'true' : 'false'}
      data-ghost-visible={plan.hiddenState.isGhostVisible ? 'true' : 'false'}
      data-selection-context={showSectionSelectionContext ? 'descendant' : undefined}
      aria-label={getNodeAriaLabel(node)}
      style={{
        ...wrapperStyle,
        ...(isSelfStickyTrack || node.subtype === 'group' ? {} : plan.meshPlacement),
        ...getWrapperBorderStyle(node),
        ...wrapperStickyCss,
        ...hiddenStyle,
      }}
    >
      <div
        className={`content-wrapper${node.style?.backgroundClipText ? ' sp-clip-text' : ''}`}
        ref={(element) => registerDropTarget(node.id, element)}
        data-content-wrapper-for={node.id}
        data-drop-wrapper-id={node.id}
        // The content-wrapper is the box that actually contains the leaf children,
        // so the clip-text gradient must live here (not on the decorative surface
        // underlay or the spacer-only grid) for clip-text to work in edit mode.
        style={{ ...contentWrapperStyle, ...getContentWrapperTextClipBackgroundStyle(node) }}
      >
        <div className="content-wrapper-surface" aria-hidden="true" style={getContentWrapperSurfaceStyle(node, { includeClipBackground: false })} />
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
              isElevated,
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
                document,
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
            ? renderContainer({
                document,
                plan: child,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragSourceIds,
                highlightedDropId,
                registerDraggableNode,
                registerDropTarget,
                resizeState: null,
                selfRegistration: plan.registrationMap.get(child.node.id),
                ownerWrapper: node,
                ownerBottomLanePx: getPreviewWrapperBottomLanePx(node, meshLayout.bottomLanePx, measuredNodeSizes, viewport),
                interactKeys,
              })
            : renderLeaf({
                document,
                plan: child,
                selectedId,
                selectedIds,
                previewSticky,
                dragSourceIds,
                registerDraggableNode,
                registration: plan.registrationMap.get(child.node.id),
                measuredNodeSizes,
                viewport,
                interactKeys,
              }),
        )}
      </div>
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
    dragSourceIds,
    style: {
      ...plan.meshPlacement,
      width: '100%',
      minHeight: `${trackHeight}px`,
      ...(isElevated ? { zIndex: STICKY_LAYER_Z_INDEX } : {}),
    },
    bottomFirst,
    topDistancePx,
    bottomDistancePx,
    body: wrapperBody,
  });
}

function getStageHiddenStyle(hiddenState: RenderWrapperArgs['plan']['hiddenState']): CSSProperties | undefined {
  if (!hiddenState.isEffectivelyHidden || hiddenState.isGhostVisible) {
    return undefined;
  }

  return {
    visibility: 'hidden',
    pointerEvents: 'none',
  };
}

// Keep renderWrapper as alias for backward compat during the transition
export const renderWrapper = renderContainer;

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
  sticky: ContainerNode['sticky'] | import('../types').StageSceneLeafNode['sticky'] | undefined,
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
  _wrapper: ContainerNode,
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
  dragSourceIds,
  style,
  bottomFirst,
  topDistancePx,
  bottomDistancePx,
  body,
}: {
  nodeId: string;
  dragSourceIds: string[];
  style: CSSProperties;
  bottomFirst: boolean;
  topDistancePx: number;
  bottomDistancePx: number;
  body: ReactElement;
}) {
  return (
    <div
      key={`${nodeId}-track`}
      className={`sticky-track ${dragSourceIds.includes(nodeId) ? 'drag-source' : ''}`}
      style={style}
    >
      {bottomFirst ? renderTrackSpacer(bottomDistancePx) : null}
      {body}
      {bottomFirst ? null : renderTrackSpacer(topDistancePx)}
    </div>
  );
}

export function isStructuralTopLevelWrapper(node: ContainerNode, isTopLevel: boolean) {
  return isTopLevel && (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer');
}

export function getContainerResizeHandles(node: ContainerNode, isTopLevel: boolean): ResizeHandle[] {
  if (node.subtype === 'group') {
    return [];
  }
  if (isStructuralTopLevelWrapper(node, isTopLevel)) {
    return usesAspectRatioHeight(node) ? [] : ['s'];
  }

  return isTopLevel ? [] : ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
}

// Keep old name as alias for backward compat during transition
export const getWrapperResizeHandles = getContainerResizeHandles;

function usesAspectRatioHeight(node: ContainerNode) {
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
  node: ContainerNode,
  registration?: StageStickyRegistration,
  ownerBottomLanePx?: number,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
  isElevated = true,
) {
  if (!registration || !node.sticky?.enabled || node.sticky.target !== 'self') {
    return null;
  }

  const edgeMode = getStickyEdgeMode(node.sticky);
  const isBottomOnlySticky = edgeMode === 'bottom';
  const isBothSticky = edgeMode === 'both';
  const isTopLevelAutoOnly = node.subtype !== 'container' && node.sticky.target === 'self';
  const isAuto = isTopLevelAutoOnly || (node.sticky.durationMode ?? 'auto') === 'auto';
  const nodeHeightPx = getNodeHeight(node, measuredNodeSizes, viewport);
  const elevationClass = isElevated ? 'sticky-spacer-label-elevated' : 'sticky-spacer-label-grounded';
  if (isTopLevelAutoOnly) {
    return (
      <>
        {isBottomOnlySticky || isBothSticky ? (
          <div className="sticky-auto-indicator sticky-auto-indicator-bottom">
            <span className={`sticky-spacer-label sticky-spacer-label-auto ${elevationClass}`}>
              {isBothSticky ? 'Bottom Distance: auto' : 'Distance: auto'}
            </span>
          </div>
        ) : null}
        {!isBottomOnlySticky ? (
          <div className="sticky-auto-indicator sticky-auto-indicator-top">
            <span className={`sticky-spacer-label sticky-spacer-label-auto ${elevationClass}`}>
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
          <span className={`sticky-spacer-label ${isAuto ? 'sticky-spacer-label-auto' : ''} ${elevationClass}`}>
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
          <span className={`sticky-spacer-label ${isAuto ? 'sticky-spacer-label-auto' : ''} ${elevationClass}`}>
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
  wrapper: ContainerNode,
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
      if (!owner || owner.contentType === 'site') {
        return null;
      }

      const style = getSpacerRangeStyle(owner, registration, wrapper, measuredNodeSizes, viewport);
      const siteNode = document.nodes[document.rootId];
      const globalElev = siteNode.contentType === 'site' ? (siteNode.stickyElevation ?? true) : true;
      const ownerIsElevated = owner.sticky?.enabled
        ? resolveStickyIsElevated(owner.sticky, globalElev)
        : true;
      const ownerElevationClass = ownerIsElevated ? 'sticky-spacer-label-elevated' : 'sticky-spacer-label-grounded';
      return (
        <div
          key={registration.ownerId}
          className={`sticky-spacer-range ${owner.sticky?.durationMode === 'auto' ? 'sticky-spacer-range-auto' : ''}`}
          style={style}
        >
          {owner.sticky?.durationMode === 'auto' ? (
            <span className={`sticky-spacer-label sticky-spacer-label-auto ${ownerElevationClass}`}>
              Distance: auto
            </span>
          ) : (
            <span className={`sticky-spacer-label ${ownerElevationClass}`}>
              {`Distance · ${Math.round(registration.durationPx)}px`}
            </span>
          )}
        </div>
      );
    });
}

function getSpacerRangeStyle(
  owner: Exclude<DocumentNode, { contentType: 'site' }>,
  registration: StageStickyRegistration,
  wrapper: ContainerNode,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
): CSSProperties {
  if (isContainerNode(owner) && owner.id === wrapper.id) {
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
  node: ContainerNode,
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

function renderWrapperPaddingOverlay(node: ContainerNode) {
  return (
    <div className="wrapper-padding-overlay" aria-hidden="true">
      <div
        className="wrapper-padding-overlay-boundary"
        style={getWrapperPaddingInsetStyle(node)}
      />
    </div>
  );
}

function getWrapperPaddingInsetStyle(node: ContainerNode): CSSProperties {
  return {
    top: node.style?.paddingTop ? formatValue(node.style.paddingTop.parsed) : '0px',
    right: node.style?.paddingRight ? formatValue(node.style.paddingRight.parsed) : '0px',
    bottom: node.style?.paddingBottom ? formatValue(node.style.paddingBottom.parsed) : '0px',
    left: node.style?.paddingLeft ? formatValue(node.style.paddingLeft.parsed) : '0px',
  };
}

function shouldShowWrapperPaddingVisual(
  document: DocumentModel,
  node: ContainerNode,
  selectedIds: NodeId[],
) {
  if (selectedIds.length === 0) {
    return false;
  }
  if (!supportsPaddingVisuals(node.subtype)) {
    return false;
  }
  if (!hasNonZeroWrapperPadding(node)) {
    return false;
  }
  return selectedIds.includes(node.id) || selectedIds.some((selectedId) => isNodeDescendantOf(document, selectedId, node.id));
}

function hasNonZeroWrapperPadding(node: ContainerNode) {
  return [node.style?.paddingTop, node.style?.paddingRight, node.style?.paddingBottom, node.style?.paddingLeft].some((value) => {
    if (!value) {
      return false;
    }
    return value.parsed.value !== 0;
  });
}

function shouldShowDropTargetPaddingVisual(
  node: ContainerNode,
  isHighlightedDropTarget: boolean,
) {
  if (!isHighlightedDropTarget) {
    return false;
  }
  if (!supportsPaddingVisuals(node.subtype)) {
    return false;
  }
  return hasNonZeroWrapperPadding(node);
}

function supportsPaddingVisuals(subtype: ContainerNode['subtype']) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer' || subtype === 'container' || subtype === 'nav' || subtype === 'aside' || subtype === 'article';
}
