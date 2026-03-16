import type { CSSProperties, MouseEvent } from 'react';
import type {
  DocumentModel,
  DocumentNode,
  NodeId,
  StickyDefinition,
  WrapperNode,
} from '../model/types';
import { formatValue } from '../model/units';
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
  getLeafCssHeight,
  getNodeHeight,
  getNodeWidth,
  getTrackCssWidth,
  hasIntrinsicWidth,
  resolveOffsetPx,
  type MeshLayout,
  type RenderMeasuredNodeSizes,
  usesIntrinsicHeight,
} from '../render/layout';
import { getStickyCssProperties, getStickyEdgeMode } from '../render/sticky';
import { buildSiteRootPlan, type SiteLeafPlan } from '../site/sitePlan';
import {
  createDragState,
  getResizeStartSize,
  numericHeight,
  numericWidth,
  type DragState,
  type ResizeHandle,
  type ResizeState,
  type SnapGuides,
} from './stageMath';
import type {
  RenderWrapperArgs,
  StageSceneLeafNode as LeafNode,
  StageSceneProps,
  StageStickyRegistration,
} from './types';
export type { RenderWrapperArgs, StageSceneLeafNode, StageSceneProps, StageStickyRegistration } from './types';

export function StageScene({
  document,
  selectedId,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  onSelect,
  onMove,
  onResizeStart,
  dragState,
  setDragState,
  snapGuides,
  resizeState,
  setResizeState,
  measuredNodeSizes,
}: StageSceneProps) {
  const plan = buildSiteRootPlan(document, previewSticky, measuredNodeSizes);

  return (
    <>
      <div className="stage-frame">
        <div className="stage-canvas">
          {plan.header
            ? renderWrapper({
                document,
                plan: plan.header,
                selectedId,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                onSelect,
                onMove,
                measuredNodeSizes,
                dragState,
                setDragState,
                resizeState,
                setResizeState,
                onResizeStart,
              })
            : <EmptySlot label="Header slot" />}
          <main className="site-main">
            {plan.main.map((wrapper) =>
              renderWrapper({
                document,
                plan: wrapper,
                selectedId,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                onSelect,
                onMove,
                measuredNodeSizes,
                dragState,
                setDragState,
                resizeState,
                setResizeState,
                onResizeStart,
              }),
            )}
          </main>
          {plan.footer
            ? renderWrapper({
                document,
                plan: plan.footer,
                selectedId,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                onSelect,
                onMove,
                measuredNodeSizes,
                dragState,
                setDragState,
                resizeState,
                setResizeState,
                onResizeStart,
              })
            : <EmptySlot label="Footer slot" />}
        </div>
      </div>
      {dragState ? renderSnapGuides(snapGuides) : null}
      {dragState ? renderDragPreview(document, dragState) : null}
    </>
  );
}

function EmptySlot({ label }: { label: string }) {
  return <div className="empty-slot">{label}</div>;
}

function renderDragPreview(document: DocumentModel, dragState: Exclude<DragState, null>) {
  const node = document.nodes[dragState.nodeId];
  if (!node || node.type === 'site') {
    return null;
  }

  const style: CSSProperties = {
    left: `${dragState.currentClientX - dragState.grabOffsetX}px`,
    top: `${dragState.currentClientY - dragState.grabOffsetY}px`,
    width: `${dragState.previewWidth}px`,
    height: `${dragState.previewHeight}px`,
  };

  return (
    <div className="drag-preview" style={style}>
      {node.type === 'wrapper' ? (
        <div
          className={`drag-preview-inner drag-preview-wrapper role-${node.role}`}
          style={{
            borderColor: node.style.borderColor,
            borderWidth: node.style.borderWidth ? formatValue(node.style.borderWidth.parsed) : '1px',
            borderStyle: 'solid',
          }}
        >
          <div
            className="drag-preview-content-wrapper"
            style={{
              background: node.style.background ?? '#fff',
            }}
          />
        </div>
      ) : (
        <div
          data-node-id={node.id}
          className={`drag-preview-inner stage-leaf role-${node.role} ${isBrandMark(node) ? 'is-brand-mark' : ''}`}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <div className="stage-leaf-body">
            {renderLeafContent(node, {
              textStyle: styleRecordToReactStyle(getLeafInlineStyle(node)),
              imageClassName: 'stage-image',
              imagePlaceholderClassName: 'image-placeholder',
              imageDraggable: false,
              disableTabNavigation: true,
            })}
          </div>
        </div>
      )}
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
  previewSticky,
  spacerVisibility,
  showGridLanes,
  onSelect,
  onMove,
  measuredNodeSizes,
  dragState,
  setDragState,
  setResizeState,
  onResizeStart,
  selfRegistration,
  ownerBottomLanePx,
}: RenderWrapperArgs): JSX.Element {
  const node = plan.node;
  const Tag = plan.tag;
  const meshLayout = plan.meshLayout;
  const wrapperStyle = buildWrapperStyle(node, plan.isTopLevel);
  const showWrapperSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, node.id);
  const isStickyContentWrapper = plan.contentSticky;
  const isSelfStickyTrack = Boolean(
    selfRegistration &&
    node.sticky?.enabled &&
    node.sticky.target === 'self' &&
    node.sticky.durationMode !== 'auto',
  );
  const { topDistancePx, bottomDistancePx, bottomFirst } = getStickyTrackDistances(selfRegistration, node.sticky);
  const wrapperStickyCss =
    previewSticky && node.sticky?.enabled && node.sticky.target === 'self'
      ? getStickyCssProperties(node.sticky, { includePosition: true, includeZIndex: true })
      : undefined;
  const contentWrapperStyle: CSSProperties = isStickyContentWrapper
    ? {
        width: '100%',
        ...getContentWrapperBaseStyle(node),
        background: node.style.background,
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
        ...(previewSticky ? getStickyCssProperties(node.sticky!, { includePosition: true, includeZIndex: true }) : {}),
      }
    : {
        ...getContentWrapperBaseStyle(node),
        background: node.style.background,
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
      className={`stage-wrapper role-${node.role} ${selectedId === node.id ? 'selected' : ''} ${
        dragState?.nodeId === node.id ? 'drag-source' : ''
      }`}
      aria-label={getNodeAriaLabel(node)}
      style={{
        ...wrapperStyle,
        ...(isSelfStickyTrack ? {} : plan.meshPlacement),
        borderColor: node.style.borderColor,
        borderWidth: node.style.borderWidth ? formatValue(node.style.borderWidth.parsed) : '1px',
        ...wrapperStickyCss,
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(node.id);
        if (!plan.isTopLevel) {
          setDragState(
            createDragState({
              nodeId: node.id,
              parentId: node.parentId ?? undefined,
              element: event.currentTarget,
              clientX: event.clientX,
              clientY: event.clientY,
              originX: parseFloat(node.rect.x.base.raw) || 0,
              originY: parseFloat(node.rect.y.base.raw) || 0,
            }),
          );
        }
      }}
    >
      <div
        className="content-wrapper"
        data-content-wrapper-for={node.id}
        data-drop-wrapper-id={node.id}
        style={contentWrapperStyle}
      >
        {showGridLanes ? renderGridLaneOverlay(meshLayout) : null}
        {showWrapperSpacerVisuals ? renderOffsetVisual(node.sticky, node, measuredNodeSizes) : null}
        {showWrapperSpacerVisuals
          ? renderWrapperSelfDistanceVisual(node, selfRegistration, ownerBottomLanePx, measuredNodeSizes)
          : null}
        <div
          className="sticky-spacer-layer"
          style={{
            display: 'grid',
            gridTemplateColumns: meshLayout.columnTemplate,
            gridTemplateRows: meshLayout.rowTemplate,
          }}
        >
          {plan.children
            .filter((child): child is SiteLeafPlan => child.kind === 'leaf')
            .map((child) =>
              renderLeafSpacerOverlay({
                child: child.node,
                registration: plan.registrationMap.get(child.node.id),
                meshPlacement: child.meshPlacement,
                wrapperBottomLanePx: meshLayout.bottomLanePx,
                previewSticky,
                spacerVisibility,
                selectedId,
                measuredNodeSizes,
              }),
            )}
        </div>
        {showWrapperSpacerVisuals ? (
          <div className="sticky-spacer-range-layer">
            {renderSpacerRanges(document, node, plan.stickyState.registrations, measuredNodeSizes)}
          </div>
        ) : null}
        {plan.children.map((child) =>
          child.kind === 'wrapper'
            ? renderWrapper({
                document,
                plan: child,
                selectedId,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                onSelect,
                onMove,
                measuredNodeSizes,
                dragState,
                setDragState,
                resizeState: null,
                setResizeState,
                onResizeStart,
                selfRegistration: plan.registrationMap.get(child.node.id),
                ownerBottomLanePx: meshLayout.bottomLanePx,
              })
            : renderLeaf({
                plan: child,
                selectedId,
                previewSticky,
                onSelect,
                dragState,
                setDragState,
                setResizeState,
                onResizeStart,
                registration: plan.registrationMap.get(child.node.id),
                measuredNodeSizes,
              }),
        )}
        {selectedId === node.id && !plan.isTopLevel ? (
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

  const wrapperBaseHeightPx = getNodeHeight(node, measuredNodeSizes);
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
  previewSticky,
  onSelect,
  dragState,
  setDragState,
  setResizeState,
  onResizeStart,
  registration,
  measuredNodeSizes,
}: {
  plan: SiteLeafPlan;
  selectedId: NodeId | null;
  previewSticky: boolean;
  onSelect: (id: NodeId) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  registration?: StageStickyRegistration;
  measuredNodeSizes: RenderMeasuredNodeSizes;
}) {
  const child = plan.node;
  const meshPlacement = plan.meshPlacement;
  const isAutoSticky =
    child.sticky?.enabled && child.sticky.target === 'self' && child.sticky.durationMode === 'auto' && registration;
  const isSelfStickyTrack =
    child.sticky?.enabled &&
    child.sticky.target === 'self' &&
    child.sticky.durationMode !== 'auto' &&
    registration;
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
        selectedId === child.id ? 'selected' : ''
      } ${dragState?.nodeId === child.id ? 'drag-source' : ''}`}
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
          ? getStickyCssProperties(child.sticky, { includeZIndex: true })
          : {}),
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(child.id);
        setDragState(
          createDragState({
            nodeId: child.id,
            parentId: child.parentId ?? undefined,
            element: event.currentTarget,
            clientX: event.clientX,
            clientY: event.clientY,
            originX: parseFloat(child.rect.x.base.raw) || 0,
            originY: parseFloat(child.rect.y.base.raw) || 0,
          }),
        );
      }}
    >
      <div className="stage-leaf-body">
        {renderLeafContent(child, {
          textStyle: styleRecordToReactStyle(getLeafInlineStyle(child)),
          imageClassName: 'stage-image',
          imagePlaceholderClassName: 'image-placeholder',
          imageDraggable: false,
          disableTabNavigation: true,
        })}
      </div>
      {selectedId === child.id ? (
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

  const leafHeightPx = getNodeHeight(child, measuredNodeSizes);
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
  registration,
  meshPlacement,
  wrapperBottomLanePx,
  previewSticky,
  spacerVisibility,
  selectedId,
  measuredNodeSizes,
}: {
  child: LeafNode;
  registration?: StageStickyRegistration;
  meshPlacement?: CSSProperties;
  wrapperBottomLanePx: number;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  selectedId: NodeId | null;
  measuredNodeSizes: RenderMeasuredNodeSizes;
}) {
  if (!registration || !child.sticky?.enabled || child.sticky.target !== 'self') {
    return null;
  }

  const showLeafSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, child.id);
  if (!showLeafSpacerVisuals) {
    return null;
  }

  const edgeMode = getStickyEdgeMode(child.sticky);
  const isBottomOnlySticky = edgeMode === 'bottom';
  const isBothSticky = edgeMode === 'both';
  const leafHeightPx = getNodeHeight(child, measuredNodeSizes);
  const autoDistancePx = Math.max(0, wrapperBottomLanePx - registration.startPx);
  const topDistancePx =
    child.sticky.durationMode === 'auto'
      ? edgeMode === 'both'
        ? autoDistancePx
        : isBottomOnlySticky
          ? 0
          : autoDistancePx
      : edgeMode === 'both'
        ? Math.max(0, registration.topDurationPx ?? registration.durationPx)
        : isBottomOnlySticky
          ? 0
          : Math.max(0, registration.durationPx);
  const bottomDistancePx =
    child.sticky.durationMode === 'auto'
      ? edgeMode === 'both'
        ? autoDistancePx
        : isBottomOnlySticky
          ? autoDistancePx
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
        ...(previewSticky ? getStickyCssProperties(child.sticky) : {}),
      }}
    >
      {renderOffsetVisual(child.sticky, child, measuredNodeSizes)}
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

function renderWrapperSelfDistanceVisual(
  node: WrapperNode,
  registration?: StageStickyRegistration,
  ownerBottomLanePx?: number,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
) {
  if (!registration || !node.sticky?.enabled || node.sticky.target !== 'self') {
    return null;
  }

  const edgeMode = getStickyEdgeMode(node.sticky);
  const isBottomOnlySticky = edgeMode === 'bottom';
  const isBothSticky = edgeMode === 'both';
  const isAuto = (node.sticky.durationMode ?? 'auto') === 'auto';
  const autoDistancePx = Math.max(
    0,
    (ownerBottomLanePx ?? getNodeHeight(node, measuredNodeSizes)) - registration.startPx,
  );
  const topDistancePx = isAuto
    ? edgeMode === 'both'
      ? autoDistancePx
      : isBottomOnlySticky
        ? 0
        : autoDistancePx
    : edgeMode === 'both'
      ? Math.max(0, registration.topDurationPx ?? registration.durationPx)
      : isBottomOnlySticky
        ? 0
        : Math.max(0, registration.durationPx);
  const bottomDistancePx = isAuto
    ? edgeMode === 'both'
      ? autoDistancePx
      : isBottomOnlySticky
        ? autoDistancePx
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
          onMouseDown={(event) => onHandleMouseDown(handle, event)}
        />
      ))}
    </>
  );
}

function shouldShowSpacerVisuals(
  spacerVisibility: 'selected' | 'all',
  selectedId: NodeId | null,
  ownerId: NodeId,
) {
  return spacerVisibility === 'all' || selectedId === ownerId;
}

function renderOffsetVisual(
  sticky: StickyDefinition | undefined,
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
) {
  if (!sticky?.enabled) {
    return null;
  }

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'both') {
    const topOffsetPx = resolveStickyOffsetPx(sticky, node, 'top', measuredNodeSizes);
    const bottomOffsetPx = resolveStickyOffsetPx(sticky, node, 'bottom', measuredNodeSizes);
    if (topOffsetPx <= 0 && bottomOffsetPx <= 0) {
      return null;
    }
    return (
      <>
        {topOffsetPx > 0 ? renderOffsetVisualForEdge(topOffsetPx, 'top', true) : null}
        {bottomOffsetPx > 0 ? renderOffsetVisualForEdge(bottomOffsetPx, 'bottom', true) : null}
      </>
    );
  }

  const offsetPx = resolveStickyOffsetPx(sticky, node, edgeMode, measuredNodeSizes);
  if (offsetPx <= 0) {
    return null;
  }

  return renderOffsetVisualForEdge(offsetPx, edgeMode, false);
}

function resolveStickyOffsetPx(
  sticky: StickyDefinition,
  node: Exclude<DocumentNode, { type: 'site' }>,
  edge: 'top' | 'bottom',
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
) {
  const offset =
    edge === 'top'
      ? sticky.offsetTop ?? sticky.offsetBottom
      : sticky.offsetBottom ?? sticky.offsetTop;
  return offset ? resolveOffsetPx(offset, node, measuredNodeSizes) : 0;
}

function renderOffsetVisualForEdge(offsetPx: number, edge: 'top' | 'bottom', showEdgeLabel: boolean) {
  const positionStyle =
    edge === 'bottom'
      ? { top: 'auto', bottom: `${-offsetPx}px` }
      : { top: `${-offsetPx}px`, bottom: 'auto' };
  const labelText = showEdgeLabel
    ? `${edge === 'top' ? 'Top' : 'Bottom'} Offset · ${Math.round(offsetPx)}px`
    : `Offset · ${Math.round(offsetPx)}px`;

  return (
    <div
      className={`sticky-offset-visual ${
        edge === 'bottom' ? 'sticky-offset-visual-bottom' : 'sticky-offset-visual-top'
      } ${showEdgeLabel ? 'sticky-guide-dual' : ''}`}
      style={{ height: `${offsetPx}px`, ...positionStyle }}
    >
      <span className="sticky-offset-label">{labelText}</span>
    </div>
  );
}

function renderSpacerRanges(
  document: DocumentModel,
  wrapper: WrapperNode,
  registrations: StageStickyRegistration[],
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
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

      const style = getSpacerRangeStyle(owner, registration, wrapper, measuredNodeSizes);
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
    ? `${getNodeWidth(owner, measuredNodeSizes)}px`
    : formatValue(owner.rect.width.base.parsed);

  return {
    left: owner.rect.x.base.raw,
    top: `${registration.startPx}px`,
    width,
    height: `${registration.durationPx}px`,
  };
}

function renderGridLaneOverlay(meshLayout: MeshLayout) {
  const verticalLines = meshLayout.columnLines.slice(1, -1);
  const horizontalLines = meshLayout.rowLines.slice(1, -1);

  if (verticalLines.length === 0 && horizontalLines.length === 0) {
    return null;
  }

  return (
    <div className="grid-lane-overlay" aria-hidden="true">
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
