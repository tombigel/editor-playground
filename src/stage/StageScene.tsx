import type { CSSProperties, MouseEvent } from 'react';
import type {
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  NodeId,
  StickyDefinition,
  WrapperNode,
} from '../model/types';
import { getChildren } from '../model/selectors';
import { resolveWrapperStickyState } from '../sticky/resolve';
import { formatValue, resolveUnitValuePx } from '../model/units';
import {
  createDragState,
  getNodeHeight,
  getNodeWidth,
  getResizeStartSize,
  hasIntrinsicWidth,
  numericHeight,
  numericWidth,
  resolveOffsetPx,
  type DragState,
  type MeasuredNodeSizes,
  type ResizeHandle,
  type ResizeState,
  type SnapGuides,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
} from './stageMath';

type StageStickyRegistration = ComputedWrapperStickyState['registrations'][number];
type LeafNode = Extract<DocumentModel['nodes'][string], { type: 'leaf' }>;

type StageSceneProps = {
  document: DocumentModel;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onResizeStart: (id: NodeId) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  snapGuides: SnapGuides;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  measuredNodeSizes: MeasuredNodeSizes;
};

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
  const root = document.nodes[document.rootId];
  const wrappers = getChildren(document, root.id).filter((node) => node.type === 'wrapper') as WrapperNode[];
  const header = wrappers.find((node) => node.role === 'header') ?? null;
  const footer = wrappers.find((node) => node.role === 'footer') ?? null;
  const mainWrappers = wrappers.filter((node) => node.role === 'section');

  return (
    <>
      <div className="stage-frame">
        <div className="stage-canvas">
          {header
            ? renderWrapper({
                document,
                node: header,
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
                isTopLevel: true,
              })
            : <EmptySlot label="Header slot" />}
          <main className="site-main">
            {mainWrappers.map((wrapper) =>
              renderWrapper({
                document,
                node: wrapper,
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
                isTopLevel: true,
              }),
            )}
          </main>
          {footer
            ? renderWrapper({
                document,
                node: footer,
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
                isTopLevel: true,
              })
            : <EmptySlot label="Footer slot" />}
        </div>
      </div>
      {dragState ? renderSnapGuides(snapGuides) : null}
      {dragState ? renderDragPreview(document, dragState) : null}
    </>
  );
}

function formatNodeLabel(node: Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>) {
  return `${node.role.charAt(0).toUpperCase()}${node.role.slice(1)}`;
}

function getStageNodeAriaLabel(node: Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>) {
  const roleLabel = formatNodeLabel(node);
  return node.name && node.name !== roleLabel ? `${roleLabel}: ${node.name}` : roleLabel;
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
          className={`drag-preview-inner stage-leaf role-${node.role} ${node.role === 'image' && node.name === 'Brand Mark' ? 'is-brand-mark' : ''}`}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <div className="stage-leaf-body">{renderLeafContent(node)}</div>
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

type RenderWrapperArgs = {
  document: DocumentModel;
  node: WrapperNode;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  measuredNodeSizes: MeasuredNodeSizes;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  isTopLevel: boolean;
  meshPlacement?: CSSProperties;
  selfRegistration?: StageStickyRegistration;
  ownerBottomLanePx?: number;
};

function renderWrapper({
  document,
  node,
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
  isTopLevel,
  meshPlacement,
  selfRegistration,
  ownerBottomLanePx,
}: RenderWrapperArgs): JSX.Element {
  const Tag =
    node.role === 'header'
      ? 'header'
      : node.role === 'footer'
        ? 'footer'
        : node.role === 'section'
          ? 'section'
          : 'div';

  const children = getChildren(document, node.id).filter(
    (child): child is Exclude<DocumentNode, { type: 'site' }> => child.type !== 'site',
  );
  const stickyGeometry = {
    nodeSizes: measuredNodeSizes,
    viewportWidth: VIEWPORT_WIDTH,
    viewportHeight: VIEWPORT_HEIGHT,
  };
  const wrapperStickyState = resolveWrapperStickyState(node, children, stickyGeometry);
  const registrationMap = new Map(
    (wrapperStickyState?.registrations ?? []).map((registration) => [registration.ownerId, registration]),
  );
  const childWrapperExtraExtentMap = new Map<string, number>();
  for (const child of children) {
    if (child.type !== 'wrapper') {
      continue;
    }
    const childChildren = getChildren(document, child.id).filter(
      (candidate): candidate is Exclude<DocumentNode, { type: 'site' }> => candidate.type !== 'site',
    );
    childWrapperExtraExtentMap.set(
      child.id,
      resolveWrapperStickyState(child, childChildren, stickyGeometry).totalExtraExtentPx,
    );
  }
  const extraExtent = wrapperStickyState.totalExtraExtentPx;
  const meshLayout = computeMeshLayout(children, node, registrationMap, childWrapperExtraExtentMap, measuredNodeSizes);
  const wrapperStyle = buildWrapperStyle(node, isTopLevel);
  const showWrapperSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, node.id);
  const isStickyContentWrapper = node.sticky?.enabled && node.sticky.target === 'contentWrapper';
  const stickyEdgeMode = node.sticky ? getStickyEdgeMode(node.sticky) : 'top';
  const isSelfStickyTrack = Boolean(
    selfRegistration &&
    node.sticky?.enabled &&
    node.sticky.target === 'self' &&
    node.sticky.durationMode !== 'auto',
  );
  const isBottomOnlySticky = isSelfStickyTrack && stickyEdgeMode === 'bottom';
  const isBothSticky = isSelfStickyTrack && stickyEdgeMode === 'both';
  const topTrackDistancePx =
    isSelfStickyTrack && selfRegistration
      ? stickyEdgeMode === 'both'
        ? selfRegistration.topDurationPx ?? selfRegistration.durationPx
        : stickyEdgeMode === 'top'
          ? selfRegistration.durationPx
          : 0
      : 0;
  const bottomTrackDistancePx =
    isSelfStickyTrack && selfRegistration
      ? stickyEdgeMode === 'both'
        ? selfRegistration.bottomDurationPx ?? selfRegistration.durationPx
        : stickyEdgeMode === 'bottom'
          ? selfRegistration.durationPx
          : 0
      : 0;
  const wrapperStickyCss =
    previewSticky && node.sticky?.enabled && node.sticky.target === 'self'
      ? getStickyCss(node.sticky, true)
      : undefined;
  const shouldLayerStickySelf =
    previewSticky && node.sticky?.enabled && node.sticky.target === 'self';
  const contentWrapperStyle: CSSProperties = isStickyContentWrapper
    ? {
        width: '100%',
        ...getContentWrapperBaseStyle(node),
        background: node.style.background,
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
        ...(previewSticky ? getStickyCss(node.sticky!, true) : {}),
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
      aria-label={getStageNodeAriaLabel(node)}
      style={{
        ...wrapperStyle,
        ...(isSelfStickyTrack ? {} : meshPlacement),
        borderColor: node.style.borderColor,
        borderWidth: node.style.borderWidth ? formatValue(node.style.borderWidth.parsed) : '1px',
        zIndex: shouldLayerStickySelf ? 14 : undefined,
        ...wrapperStickyCss,
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(node.id);
        if (!isTopLevel) {
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
          {children
            .filter((child): child is LeafNode => child.type === 'leaf')
            .map((child) =>
              renderLeafSpacerOverlay({
                child,
                registration: registrationMap.get(child.id),
                meshPlacement: meshLayout.childPlacements[child.id],
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
            {renderSpacerRanges(document, node, wrapperStickyState.registrations, measuredNodeSizes)}
          </div>
        ) : null}
        {children.map((child) =>
          child.type === 'wrapper'
            ? renderWrapper({
                document,
                node: child,
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
                isTopLevel: false,
                meshPlacement: meshLayout.childPlacements[child.id],
                selfRegistration: registrationMap.get(child.id),
                ownerBottomLanePx: meshLayout.bottomLanePx,
              })
            : renderLeaf({
                child,
                selectedId,
                previewSticky,
                onSelect,
                dragState,
                setDragState,
                setResizeState,
                onResizeStart,
                registration: registrationMap.get(child.id),
                meshPlacement: meshLayout.childPlacements[child.id],
                measuredNodeSizes,
              }),
        )}
        {selectedId === node.id && !isTopLevel ? (
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
      {extraExtent > 0 ? (
        <div
          className={`sticky-flow-spacer ${showWrapperSpacerVisuals ? '' : 'spacer-visual-hidden'}`}
          style={{ height: `${extraExtent}px` }}
        />
      ) : null}
    </Tag>
  );

  if (!isSelfStickyTrack || !selfRegistration) {
    return wrapperBody;
  }

  const wrapperBaseHeightPx = getNodeHeight(node, measuredNodeSizes);
  const trackHeight = wrapperBaseHeightPx + topTrackDistancePx + bottomTrackDistancePx;
  const topStickyTrackSpacer =
    topTrackDistancePx > 0 ? (
      <div
        className="sticky-track-spacer"
        style={{
          height: `${topTrackDistancePx}px`,
        }}
      />
    ) : null;
  const bottomStickyTrackSpacer =
    bottomTrackDistancePx > 0 ? (
      <div
        className="sticky-track-spacer"
        style={{
          height: `${bottomTrackDistancePx}px`,
        }}
      />
    ) : null;

  return (
    <div
      key={`${node.id}-track`}
      className={`sticky-track ${dragState?.nodeId === node.id ? 'drag-source' : ''}`}
      style={{
        ...meshPlacement,
        width: '100%',
        minHeight: `${trackHeight}px`,
      }}
    >
      {isBottomOnlySticky || isBothSticky ? bottomStickyTrackSpacer : null}
      {wrapperBody}
      {isBottomOnlySticky ? null : topStickyTrackSpacer}
    </div>
  );
}

function renderLeaf({
  child,
  selectedId,
  previewSticky,
  onSelect,
  dragState,
  setDragState,
  setResizeState,
  onResizeStart,
  registration,
  meshPlacement,
  measuredNodeSizes,
}: {
  child: LeafNode;
  selectedId: NodeId | null;
  previewSticky: boolean;
  onSelect: (id: NodeId) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  registration?: StageStickyRegistration;
  meshPlacement?: CSSProperties;
  measuredNodeSizes: MeasuredNodeSizes;
}) {
  const isAutoSticky =
    child.sticky?.enabled && child.sticky.target === 'self' && child.sticky.durationMode === 'auto' && registration;
  const isSelfStickyTrack =
    child.sticky?.enabled &&
    child.sticky.target === 'self' &&
    child.sticky.durationMode !== 'auto' &&
    registration;
  const stickyEdgeMode = child.sticky ? getStickyEdgeMode(child.sticky) : 'top';
  const isBottomOnlySticky = Boolean(isSelfStickyTrack && stickyEdgeMode === 'bottom');
  const isBothSticky = Boolean(isSelfStickyTrack && stickyEdgeMode === 'both');
  const isBrandMark = child.role === 'image' && child.name === 'Brand Mark';
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
      className={`stage-leaf role-${child.role} ${isBrandMark ? 'is-brand-mark' : ''} ${
        selectedId === child.id ? 'selected' : ''
      } ${dragState?.nodeId === child.id ? 'drag-source' : ''}`}
      aria-label={getStageNodeAriaLabel(child)}
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
        zIndex:
          previewSticky && child.sticky?.enabled && child.sticky.target === 'self'
            ? 14
            : undefined,
        ...(previewSticky && child.sticky?.enabled ? getStickyCss(child.sticky, false) : {}),
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
      <div className="stage-leaf-body">{renderLeafContent(child)}</div>
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
  const topTrackDistancePx =
    stickyEdgeMode === 'both'
      ? registration.topDurationPx ?? registration.durationPx
      : stickyEdgeMode === 'top'
        ? registration.durationPx
        : 0;
  const bottomTrackDistancePx =
    stickyEdgeMode === 'both'
      ? registration.bottomDurationPx ?? registration.durationPx
      : stickyEdgeMode === 'bottom'
        ? registration.durationPx
        : 0;
  const trackHeight =
    isAutoSticky
      ? leafHeightPx
      : leafHeightPx + topTrackDistancePx + bottomTrackDistancePx;
  const topStickyTrackSpacer =
    topTrackDistancePx > 0 ? (
      <div
        className="sticky-track-spacer"
        style={{
          height: `${topTrackDistancePx}px`,
        }}
      />
    ) : null;
  const bottomStickyTrackSpacer =
    bottomTrackDistancePx > 0 ? (
      <div
        className="sticky-track-spacer"
        style={{
          height: `${bottomTrackDistancePx}px`,
        }}
      />
    ) : null;
  return (
    <div
      key={`${child.id}-track`}
      className={`sticky-track ${dragState?.nodeId === child.id ? 'drag-source' : ''}`}
      style={{
        ...meshPlacement,
        width: trackWidth,
        minHeight: `${trackHeight}px`,
      }}
    >
      {isBottomOnlySticky || isBothSticky ? bottomStickyTrackSpacer : null}
      {leafBody}
      {isBottomOnlySticky ? null : topStickyTrackSpacer}
    </div>
  );
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
  measuredNodeSizes: MeasuredNodeSizes;
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
      ? autoDistancePx
      : edgeMode === 'both'
        ? Math.max(0, registration.topDurationPx ?? registration.durationPx)
        : isBottomOnlySticky
          ? 0
          : Math.max(0, registration.durationPx);
  const bottomDistancePx =
    child.sticky.durationMode === 'auto'
      ? autoDistancePx
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
        ...(previewSticky ? getStickyCss(child.sticky, false) : {}),
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
  measuredNodeSizes: MeasuredNodeSizes = {},
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

function renderLeafContent(node: LeafNode) {
  switch (node.role) {
    case 'text': {
      const Tag = node.htmlTag;
      return (
        <Tag
          style={{
            margin: 0,
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
            color: node.style?.color ?? '#16202a',
            fontSize: node.style?.fontSize
              ? formatValue(node.style.fontSize.parsed)
              : '18px',
            fontWeight: node.style?.fontWeight ?? '500',
            fontStyle: node.style?.fontStyle ?? 'normal',
            letterSpacing: '-0.02em',
            textDecorationLine: node.style?.textDecorationLine ?? 'none',
            lineHeight: node.style?.lineHeight ?? 1.24,
            direction: node.style?.direction ?? 'ltr',
            textAlign: node.style?.textAlign ?? 'left',
          }}
        >
          {node.content}
        </Tag>
      );
    }
    case 'image':
      return node.src ? (
        <img className="stage-image" src={node.src} alt={node.alt || 'Image'} draggable={false} />
      ) : (
        <div className="image-placeholder">{node.alt || 'Image'}</div>
      );
    case 'link':
      return (
        <a href={node.href} tabIndex={-1}>
          {node.label}
        </a>
      );
    case 'button':
      return (
        <button type="button" tabIndex={-1}>
          {node.label}
        </button>
      );
  }
}

type MeshLayout = {
  columnTemplate: string;
  rowTemplate: string;
  childPlacements: Record<string, CSSProperties>;
  columnLines: number[];
  rowLines: number[];
  bottomLanePx: number;
};

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

function getLeafCssHeight(node: LeafNode) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return formatValue(height);
  }
  if (height.keyword === 'aspect-ratio') {
    return 'auto';
  }
  return 'auto';
}

function getTrackCssWidth(node: LeafNode) {
  return formatValue(node.rect.width.base.parsed);
}

function usesIntrinsicHeight(node: LeafNode) {
  return !('unit' in node.rect.height.base.parsed);
}

function defaultStickyOffset() {
  return '0px';
}

function getStickyEdgeMode(sticky: StickyDefinition): 'top' | 'bottom' | 'both' {
  const bottom = sticky.edges.bottom ?? false;
  const top = sticky.edges.top ?? !bottom;
  if (top && bottom) {
    return 'both';
  }
  return bottom ? 'bottom' : 'top';
}

function getStickyCss(
  sticky: NonNullable<Exclude<DocumentNode, { type: 'site' }>['sticky']>,
  allowStickyPosition: boolean,
): CSSProperties {
  if (!sticky.enabled) {
    return {};
  }

  const style: CSSProperties = {};
  if (allowStickyPosition) {
    style.position = 'sticky';
  }

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'bottom') {
    style.bottom = sticky.offsetBottom?.raw ?? defaultStickyOffset();
  } else if (edgeMode === 'both') {
    style.top = sticky.offsetTop?.raw ?? defaultStickyOffset();
    style.bottom = sticky.offsetBottom?.raw ?? defaultStickyOffset();
  } else {
    style.top = sticky.offsetTop?.raw ?? defaultStickyOffset();
  }

  return style;
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
  measuredNodeSizes: MeasuredNodeSizes = {},
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
  measuredNodeSizes: MeasuredNodeSizes = {},
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
  measuredNodeSizes: MeasuredNodeSizes = {},
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
  measuredNodeSizes: MeasuredNodeSizes = {},
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

function buildWrapperStyle(node: WrapperNode, isTopLevel: boolean): CSSProperties {
  return {
    width: formatValue(node.rect.width.base.parsed),
    ...(isTopLevel ? {} : { position: 'relative' }),
  };
}

function getContentWrapperBaseStyle(node: WrapperNode): CSSProperties {
  const height = node.rect.height.base.parsed;
  const base: CSSProperties = {
    width: '100%',
  };

  if ('unit' in height) {
    base.minHeight = formatValue(height);
    return base;
  }

  if (height.keyword === 'aspect-ratio') {
    base.aspectRatio = String(height.ratio);
    return base;
  }

  base.minHeight = '120px';
  return base;
}

function computeMeshLayout(
  children: Exclude<DocumentNode, { type: 'site' }>[],
  wrapper: WrapperNode,
  registrations: Map<string, StageStickyRegistration>,
  childWrapperExtraExtents: Map<string, number>,
  measuredNodeSizes: MeasuredNodeSizes = {},
): MeshLayout {
  const width = getNodeWidth(wrapper, measuredNodeSizes);
  const baseHeight = getNodeHeight(wrapper, measuredNodeSizes);
  const xLines = new Set<number>([0, width]);
  const yLines = new Set<number>([0, baseHeight]);

  for (const child of children) {
    const childX = resolveCoordinatePx(child.rect.x.base.parsed, width, baseHeight, 'x');
    const childY = resolveCoordinatePx(child.rect.y.base.parsed, width, baseHeight, 'y');
    const childWidth = getNodeWidth(child, measuredNodeSizes);
    const childHeight = getMeshNodeHeight(
      child,
      registrations.get(child.id),
      childWrapperExtraExtents.get(child.id) ?? 0,
      measuredNodeSizes,
    );
    xLines.add(clampLine(childX, width));
    xLines.add(clampLine(childX + childWidth, width));
    yLines.add(Math.max(0, childY));
    yLines.add(Math.max(0, childY + childHeight));
  }

  const columns = sortedLines(xLines);
  const rows = sortedLines(yLines);
  const childPlacements: Record<string, CSSProperties> = {};

  for (const child of children) {
    const childX = resolveCoordinatePx(child.rect.x.base.parsed, width, baseHeight, 'x');
    const childY = resolveCoordinatePx(child.rect.y.base.parsed, width, baseHeight, 'y');
    const childWidth = getNodeWidth(child, measuredNodeSizes);
    const childHeight = getMeshNodeHeight(
      child,
      registrations.get(child.id),
      childWrapperExtraExtents.get(child.id) ?? 0,
      measuredNodeSizes,
    );
    const colStart = lineIndex(columns, clampLine(childX, width));
    const colEnd = lineIndex(columns, clampLine(childX + childWidth, width));
    const rowStart = lineIndex(rows, Math.max(0, childY));
    const rowEnd = lineIndex(rows, Math.max(0, childY + childHeight));

    childPlacements[child.id] = {
      gridColumn: `${colStart} / ${Math.max(colStart + 1, colEnd)}`,
      gridRow: `${rowStart} / ${Math.max(rowStart + 1, rowEnd)}`,
      justifySelf: 'stretch',
      alignSelf: 'stretch',
      minWidth: 0,
      minHeight: 0,
    };
  }

  return {
    columnTemplate: templateFromLines(columns),
    rowTemplate: templateFromLines(rows),
    childPlacements,
    columnLines: columns,
    rowLines: rows,
    bottomLanePx: rows[rows.length - 1] ?? baseHeight,
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

function getMeshNodeHeight(
  node: Exclude<DocumentNode, { type: 'site' }>,
  registration?: StageStickyRegistration,
  childWrapperExtraExtentPx = 0,
  measuredNodeSizes: MeasuredNodeSizes = {},
) {
  let baseHeight = getNodeHeight(node, measuredNodeSizes);
  if (node.type === 'wrapper' && childWrapperExtraExtentPx > 0) {
    baseHeight += childWrapperExtraExtentPx;
  }
  if (
    registration &&
    node.sticky?.enabled &&
    node.sticky.target === 'self' &&
    node.sticky.durationMode !== 'auto' &&
    registration.target === 'self'
  ) {
    return baseHeight + registration.durationPx;
  }
  return baseHeight;
}

function resolveCoordinatePx(
  value: WrapperNode['rect']['x']['base']['parsed'],
  width: number,
  height: number,
  axis: 'x' | 'y',
) {
  return resolveUnitValuePx(
    value,
    {
      width,
      height,
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    },
    axis,
  );
}

function clampLine(value: number, max: number) {
  return Math.min(Math.max(0, value), Math.max(max, value));
}

function sortedLines(values: Set<number>) {
  return Array.from(values).sort((a, b) => a - b);
}

function templateFromLines(lines: number[]) {
  if (lines.length < 2) {
    return '1fr';
  }
  return lines
    .slice(0, -1)
    .map((line, index) => `${Math.max(1, lines[index + 1] - line)}px`)
    .join(' ');
}

function lineIndex(lines: number[], value: number) {
  const index = lines.findIndex((line) => Math.abs(line - value) < 0.5);
  return (index === -1 ? 0 : index) + 1;
}
