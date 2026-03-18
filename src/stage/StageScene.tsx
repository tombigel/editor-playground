import type { CSSProperties, MouseEvent } from 'react';
import type {
  DocumentModel,
  DocumentNode,
  NodeId,
  StickyDefinition,
  ViewportMeasurement,
  WrapperNode,
} from '../model/types';
import { formatValue, resolveSpacingPx, resolveUnitValuePx } from '../model/units';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../render/leafPresentation';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  isBrandMark,
  renderLeafContent,
} from '../render/nodePresentation';
import {
  buildWrapperStyle,
  getContentWrapperBaseStyle,
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getLeafCssHeight,
  getNodeHeight,
  getNodeWidth,
  DEFAULT_RENDER_VIEWPORT,
  getTrackCssWidth,
  getWrapperBorderStyle,
  hasIntrinsicWidth,
  resolveOffsetPx,
  type MeshLayout,
  type RenderMeasuredNodeSizes,
  usesIntrinsicHeight,
} from '../render/layout';
import { buildRenderRootPlan } from '../render/renderPlan';
import { getStickyCssProperties, getStickyEdgeMode, usesSyntheticStickyTrack } from '../render/sticky';
import type { RenderLeafPlanNode } from '../render/types';
import {
  getResizeStartSize,
  numericHeight,
  numericWidth,
  type DragState,
  type ResizeHandle,
  type ResizeState,
  type SnapGuides,
} from './stageMath';
import { isNodeDescendantOf } from '../editor/selection';
import type {
  RenderWrapperArgs,
  StageSceneLeafNode as LeafNode,
  StageSceneProps,
  StageStickyRegistration,
} from './types';
export type { RenderWrapperArgs, StageSceneLeafNode, StageSceneProps, StageStickyRegistration } from './types';

const STAGE_STICKY_VIEWPORT_INSET_TOP_PX = 22;
const STAGE_STICKY_VIEWPORT_INSET_BOTTOM_PX = 48;
const DEFAULT_LAYOUT_FONT_REFERENCE_PX = 16;

export function StageScene({
  document,
  selectedId,
  selectedIds = selectedId ? [selectedId] : [],
  multiSelectionBounds = null,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  onResizeStart,
  dragState,
  setDragState,
  snapGuides,
  resizeState,
  setResizeState,
  measuredNodeSizes,
  viewport,
}: StageSceneProps) {
  const plan = buildRenderRootPlan(document, previewSticky, measuredNodeSizes, viewport);

  return (
    <>
      <div className="stage-frame">
        <div className="stage-canvas">
          {plan.header
            ? renderWrapper({
                document,
                plan: plan.header,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragState,
                setDragState,
                resizeState,
                setResizeState,
                onResizeStart,
                selfRegistration: plan.header.registrationMap.get(plan.header.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: plan.header.meshLayout.bottomLanePx,
              })
            : <EmptySlot label="Header slot" />}
          <main className="site-main">
            {plan.main.map((wrapper) =>
              renderWrapper({
                document,
                plan: wrapper,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragState,
                setDragState,
                resizeState,
                setResizeState,
                onResizeStart,
                selfRegistration: wrapper.registrationMap.get(wrapper.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: wrapper.meshLayout.bottomLanePx,
              }),
            )}
          </main>
          {plan.footer
            ? renderWrapper({
                document,
                plan: plan.footer,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragState,
                setDragState,
                resizeState,
                setResizeState,
                onResizeStart,
                selfRegistration: plan.footer.registrationMap.get(plan.footer.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: plan.footer.meshLayout.bottomLanePx,
              })
            : <EmptySlot label="Footer slot" />}
        </div>
        {multiSelectionBounds ? <MultiSelectionOutline bounds={multiSelectionBounds} /> : null}
      </div>
      {dragState ? renderSnapGuides(snapGuides) : null}
      {dragState ? renderDragPreview(document, dragState) : null}
    </>
  );
}

function MultiSelectionOutline({ bounds }: { bounds: NonNullable<StageSceneProps['multiSelectionBounds']> }) {
  return (
    <div
      className="stage-multi-selection-outline"
      style={{
        left: `${bounds.left - 1}px`,
        top: `${bounds.top - 1}px`,
        width: `${bounds.width + 2}px`,
        height: `${bounds.height + 2}px`,
      }}
    />
  );
}

function EmptySlot({ label }: { label: string }) {
  return <div className="empty-slot">{label}</div>;
}

function renderDragPreview(document: DocumentModel, dragState: Exclude<DragState, null>) {
  const previewItems = dragState.previewItems ?? [
    {
      nodeId: dragState.nodeId,
      offsetX: 0,
      offsetY: 0,
      width: dragState.previewWidth,
      height: dragState.previewHeight,
    },
  ];
  const baseLeft = dragState.currentClientX - dragState.grabOffsetX;
  const baseTop = dragState.currentClientY - dragState.grabOffsetY;

  return previewItems.map((item) => {
    const node = document.nodes[item.nodeId];
    if (!node || node.type === 'site') {
      return null;
    }

    const style: CSSProperties = {
      left: `${baseLeft + item.offsetX}px`,
      top: `${baseTop + item.offsetY}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
    };

    return (
      <div key={item.nodeId} className="drag-preview" style={style}>
        {renderDragPreviewNode(node)}
      </div>
    );
  });
}

function renderDragPreviewNode(node: Exclude<DocumentNode, { type: 'site' }>) {
  if (node.type === 'wrapper') {
    return (
      <div
        className={`drag-preview-inner drag-preview-wrapper role-${node.role}`}
        style={{
          ...getWrapperBorderStyle(node),
        }}
      >
        <div
          className="drag-preview-content-wrapper content-wrapper"
          style={{
            width: '100%',
            height: '100%',
            ...getContentWrapperPaddingStyle(node),
          }}
        >
          <div className="content-wrapper-surface" aria-hidden="true" style={getContentWrapperSurfaceStyle(node)} />
        </div>
      </div>
    );
  }

  return (
    <div
      data-node-id={node.id}
      className={`drag-preview-inner stage-leaf role-${node.role} ${isBrandMark(node) ? 'is-brand-mark' : ''}`}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <div
        className="stage-leaf-body"
        style={node.role === 'image' ? styleRecordToReactStyle(getLeafInlineStyle(node)) : undefined}
      >
        {renderLeafContent(node, {
          contentStyle: node.role === 'image' ? undefined : styleRecordToReactStyle(getLeafInlineStyle(node)),
          imageClassName: 'stage-image',
          imagePlaceholderClassName: 'image-placeholder',
          imageDraggable: false,
          disableTabNavigation: true,
        })}
      </div>
    </div>
  );
}

function renderSnapGuides(guides: SnapGuides) {
  return (
    <>
      {guides.x !== null ? (
        <div
          className={`snap-guide snap-guide-vertical ${guides.xSource === 'page' ? 'snap-guide-page' : 'snap-guide-component'}`}
          style={{ left: `${guides.x}px` }}
        />
      ) : null}
      {guides.y !== null ? (
        <div
          className={`snap-guide snap-guide-horizontal ${guides.ySource === 'page' ? 'snap-guide-page' : 'snap-guide-component'}`}
          style={{ top: `${guides.y}px` }}
        />
      ) : null}
    </>
  );
}

function renderWrapper({
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
}: RenderWrapperArgs): JSX.Element {
  const node = plan.node;
  const draggedNodeIds = dragState?.draggedNodeIds ?? (dragState ? [dragState.nodeId] : []);
  const Tag = plan.tag;
  const meshLayout = plan.meshLayout;
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
          ? getStageStickyCssProperties(node.sticky!, { includePosition: true, includeZIndex: true })
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
      {selectedIds.length === 1 && selectedId === node.id && !plan.isTopLevel ? (
        <ResizeHandleView
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

function renderLeaf({
  plan,
  selectedId,
  selectedIds,
  previewSticky,
  dragState,
  setDragState,
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

function renderLeafSpacerOverlay({
  child,
  owner,
  registration,
  meshPlacement,
  wrapperBottomLanePx,
  previewSticky,
  spacerVisibility,
  selectedId,
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

function getStageStickyCssProperties(
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

function getStickyTrackDistances(
  registration: StageStickyRegistration | undefined,
  sticky: WrapperNode['sticky'] | LeafNode['sticky'] | undefined,
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

function getPreviewWrapperBottomLanePx(
  wrapper: WrapperNode,
  bottomLanePx: number,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
) {
  return bottomLanePx;
}

function resolveWrapperPaddingPx(
  wrapper: WrapperNode,
  edge: 'top' | 'right' | 'bottom' | 'left',
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
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

function getAutoStickySpacerDistances({
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

function renderStickyTrackShell({
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
  body: JSX.Element;
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

function ResizeHandleView({
  onHandleMouseDown,
}: {
  onHandleMouseDown: (handle: ResizeHandle, event: MouseEvent<HTMLDivElement>) => void;
}) {
  const handles: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  return (
    <>
      {handles.map((handle) => (
        <div
          key={handle}
          className={`resize-handle handle-${handle}`}
          data-stage-resize-handle="true"
          onMouseDown={(event) => onHandleMouseDown(handle, event)}
        />
      ))}
    </>
  );
}

function shouldShowSpacerVisuals(
  spacerVisibility: 'selected' | 'all',
  selectedIds: NodeId[],
  ownerId: NodeId,
) {
  return spacerVisibility === 'all' || selectedIds.includes(ownerId);
}

function renderOffsetVisual(
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
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_RENDER_VIEWPORT,
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
