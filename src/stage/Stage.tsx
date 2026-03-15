import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { computeStickyState } from '../sticky/stickyCompute';
import { formatValue, resolveUnitValuePx } from '../model/units';
import type { DragState } from '../editor/DragController';
import type { ResizeHandle, ResizeState } from '../editor/ResizeController';

export type StageProps = {
  document: DocumentModel;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  snapEnabled: boolean;
  onStageFocus: () => void;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onReparent: (id: NodeId, parentId: NodeId, x: string, y: string) => void;
  onResize: (id: NodeId, width: string, height: string) => void;
  onResizeStart: (id: NodeId) => void;
  onResizeEnd: (id: NodeId) => void;
};

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;
const MIN_NODE_SIZE = 24;
const SNAP_THRESHOLD_PX = 8;
const DRAG_COMMIT_THRESHOLD_PX = 1;

type SnapGuides = {
  x: number | null;
  y: number | null;
  xSource: 'component' | 'page' | null;
  ySource: 'component' | 'page' | null;
};

type SnapTarget = {
  value: number;
  source: 'component' | 'page';
};

type DragGeometry = {
  rect: DOMRect;
  offsetX: number;
  offsetY: number;
  useVisualOffset: boolean;
  modelShiftX: number;
  modelShiftY: number;
};

type MeasuredNodeSizes = Record<string, { width: number; height: number }>;

function formatNodeLabel(node: Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>) {
  return `${node.role.charAt(0).toUpperCase()}${node.role.slice(1)}`;
}

function getStageNodeAriaLabel(node: Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>) {
  const roleLabel = formatNodeLabel(node);
  return node.name && node.name !== roleLabel ? `${roleLabel}: ${node.name}` : roleLabel;
}

export function Stage({
  document,
  selectedId,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  snapEnabled,
  onStageFocus,
  onSelect,
  onMove,
  onReparent,
  onResize,
  onResizeStart,
  onResizeEnd,
}: StageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stickyState = useMemo(() => computeStickyState(document), [document]);
  const [measuredNodeSizes, setMeasuredNodeSizes] = useState<MeasuredNodeSizes>({});
  const [dragState, setDragState] = useState<DragState>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({
    x: null,
    y: null,
    xSource: null,
    ySource: null,
  });
  const [resizeState, setResizeState] = useState<ResizeState>(null);
  const root = document.nodes[document.rootId];
  const wrappers = getChildren(document, root.id).filter((node) => node.type === 'wrapper') as WrapperNode[];
  const header = wrappers.find((node) => node.role === 'header') ?? null;
  const footer = wrappers.find((node) => node.role === 'footer') ?? null;
  const mainWrappers = wrappers.filter((node) => node.role === 'section');

  useLayoutEffect(() => {
    const root = stageRef.current;
    if (!root) {
      return;
    }

    const next = measureStageNodeSizes(root);
    setMeasuredNodeSizes((current) => (areMeasuredNodeSizesEqual(current, next) ? current : next));
  }, [document]);

  return (
    <div
      ref={stageRef}
      className="stage-shell"
      tabIndex={0}
      role="region"
      aria-label="Editor stage"
      aria-activedescendant={selectedId ? `stage-node-${selectedId}` : undefined}
      data-stage-focus-scope="true"
      onFocus={onStageFocus}
      onMouseMove={(event) => {
        if (dragState) {
          const axisLocked = getShiftLockedPointer(dragState, event.clientX, event.clientY, event.shiftKey);
          const shouldSnap = event.altKey ? !snapEnabled : snapEnabled;
          const snapped = shouldSnap
            ? getSnappedDragPosition(dragState, axisLocked.clientX, axisLocked.clientY)
            : {
                clientX: axisLocked.clientX,
                clientY: axisLocked.clientY,
                guideX: null,
                guideXSource: null,
                guideY: null,
                guideYSource: null,
              };
          setDragState({
            ...dragState,
            currentClientX: snapped.clientX,
            currentClientY: snapped.clientY,
          });
          setSnapGuides({
            x: snapped.guideX,
            y: snapped.guideY,
            xSource: snapped.guideXSource,
            ySource: snapped.guideYSource,
          });
        }
        if (resizeState) {
          const frame = computeResizeFrame(resizeState, event.clientX, event.clientY, event.shiftKey);
          const nextWidth = Math.round(frame.width);
          const nextHeight = Math.round(frame.height);
          const nextX = Math.round(frame.x);
          const nextY = Math.round(frame.y);
          const originX = Math.round(resizeState.originX);
          const originY = Math.round(resizeState.originY);
          onResize(resizeState.nodeId, px(nextWidth), px(nextHeight));
          if (nextX !== originX || nextY !== originY) {
            onMove(resizeState.nodeId, px(nextX), px(nextY));
          }
        }
      }}
      onMouseUp={(event) => {
        if (dragState) {
          if (didDragPointerMove(dragState, event.clientX, event.clientY)) {
            const axisLocked = getShiftLockedPointer(dragState, event.clientX, event.clientY, event.shiftKey);
            const shouldSnap = event.altKey ? !snapEnabled : snapEnabled;
            const snapped = shouldSnap
              ? getSnappedDragPosition(dragState, axisLocked.clientX, axisLocked.clientY)
              : {
                  clientX: axisLocked.clientX,
                  clientY: axisLocked.clientY,
                  guideX: null,
                  guideXSource: null,
                  guideY: null,
                  guideYSource: null,
                };
            const drop = findDropWrapper(document, dragState.nodeId, snapped.clientX, snapped.clientY);
            const draggedNode = document.nodes[dragState.nodeId];
            if (drop && draggedNode && draggedNode.type !== 'site') {
              const pointerLocalX =
                snapped.clientX -
                drop.rect.left -
                dragState.grabOffsetX -
                (dragState.useVisualOffset ? dragState.modelShiftX : 0);
              const pointerLocalY =
                snapped.clientY -
                drop.rect.top -
                dragState.grabOffsetY -
                (dragState.useVisualOffset ? dragState.modelShiftY : 0);
              if (draggedNode.parentId !== drop.wrapperId) {
                const localX = Math.max(0, pointerLocalX);
                const localY = Math.max(0, pointerLocalY);
                onReparent(dragState.nodeId, drop.wrapperId, `${localX}px`, `${localY}px`);
              } else {
                const localX = dragState.useVisualOffset
                  ? Math.max(0, pointerLocalX)
                  : Math.max(0, dragState.originX + (snapped.clientX - dragState.startClientX));
                const localY = dragState.useVisualOffset
                  ? Math.max(0, pointerLocalY)
                  : Math.max(0, dragState.originY + (snapped.clientY - dragState.startClientY));
                onMove(dragState.nodeId, `${localX}px`, `${localY}px`);
              }
            }
          }
        }
        if (resizeState) {
          onResizeEnd(resizeState.nodeId);
        }
        setDragState(null);
        setSnapGuides({ x: null, y: null, xSource: null, ySource: null });
        setResizeState(null);
      }}
      onMouseLeave={() => {
        if (resizeState) {
          onResizeEnd(resizeState.nodeId);
        }
        setDragState(null);
        setSnapGuides({ x: null, y: null, xSource: null, ySource: null });
        setResizeState(null);
      }}
    >
      <p className="sr-only">
        Tab selects components in stage order. Arrow keys move the selected component by 1 pixel.
        Shift plus arrow keys move by 10 pixels.
      </p>
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
              stickyMap: stickyState,
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
              stickyMap: stickyState,
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
              stickyMap: stickyState,
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
    </div>
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
  stickyMap: Record<string, ComputedWrapperStickyState>;
  measuredNodeSizes: MeasuredNodeSizes;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  isTopLevel: boolean;
  meshPlacement?: CSSProperties;
  selfRegistration?: ComputedWrapperStickyState['registrations'][number];
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
  stickyMap,
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
  const wrapperStickyState = stickyMap[node.id];
  const registrationMap = new Map(
    (wrapperStickyState?.registrations ?? []).map((registration) => [registration.ownerId, registration]),
  );
  const childWrapperExtraExtentMap = new Map<string, number>();
  for (const child of children) {
    if (child.type !== 'wrapper') {
      continue;
    }
    childWrapperExtraExtentMap.set(child.id, stickyMap[child.id]?.totalExtraExtentPx ?? 0);
  }
  const extraExtent = stickyMap[node.id]?.totalExtraExtentPx ?? 0;
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
            {renderSpacerRanges(document, node, wrapperStickyState, measuredNodeSizes)}
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
                stickyMap,
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
                spacerVisibility,
                onSelect,
                dragState,
                setDragState,
                setResizeState,
                onResizeStart,
                registration: registrationMap.get(child.id),
                meshPlacement: meshLayout.childPlacements[child.id],
                wrapperBottomLanePx: meshLayout.bottomLanePx,
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

type LeafNode = Extract<DocumentModel['nodes'][string], { type: 'leaf' }>;

function renderLeaf({
  child,
  selectedId,
  previewSticky,
  spacerVisibility,
  onSelect,
  dragState,
  setDragState,
  setResizeState,
  onResizeStart,
  registration,
  meshPlacement,
  wrapperBottomLanePx,
  measuredNodeSizes,
}: {
  child: LeafNode;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  onSelect: (id: NodeId) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  registration?: ComputedWrapperStickyState['registrations'][number];
  meshPlacement?: CSSProperties;
  wrapperBottomLanePx: number;
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
  const showLeafSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, child.id);
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
        ...(
          previewSticky && child.sticky?.enabled
            ? getStickyCss(child.sticky, false)
            : {}
        ),
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
  registration?: ComputedWrapperStickyState['registrations'][number];
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
  registration?: ComputedWrapperStickyState['registrations'][number],
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

function numericWidth(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 160;
}

function numericHeight(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 80;
}

function getResizeStartSize(handleElement: HTMLDivElement, fallbackWidth: number, fallbackHeight: number) {
  const nodeElement = handleElement.closest<HTMLElement>('[data-node-id]');
  if (!nodeElement) {
    return { width: fallbackWidth, height: fallbackHeight };
  }

  const rect = nodeElement.getBoundingClientRect();
  return {
    width: rect.width > 0 ? rect.width : fallbackWidth,
    height: rect.height > 0 ? rect.height : fallbackHeight,
  };
}

function px(value: number) {
  return `${Math.round(value)}px`;
}

function getShiftLockedPointer(
  dragState: Exclude<DragState, null>,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
) {
  if (!shiftKey) {
    return { clientX, clientY };
  }

  const deltaX = clientX - dragState.startClientX;
  const deltaY = clientY - dragState.startClientY;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return { clientX, clientY: dragState.startClientY };
  }

  return { clientX: dragState.startClientX, clientY };
}

function computeResizeFrame(
  resizeState: Exclude<ResizeState, null>,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
) {
  const deltaX = clientX - resizeState.startClientX;
  const deltaY = clientY - resizeState.startClientY;

  const isEast = resizeState.handle.includes('e');
  const isWest = resizeState.handle.includes('w');
  const isSouth = resizeState.handle.includes('s');
  const isNorth = resizeState.handle.includes('n');
  const isCornerHandle = (isEast || isWest) && (isSouth || isNorth);
  const ratio = resizeState.originWidth / Math.max(1, resizeState.originHeight);

  let width = resizeState.originWidth;
  let height = resizeState.originHeight;
  let x = resizeState.originX;
  let y = resizeState.originY;

  if (isEast) {
    width = resizeState.originWidth + deltaX;
  } else if (isWest) {
    width = resizeState.originWidth - deltaX;
    x = resizeState.originX + deltaX;
  }

  if (isSouth) {
    height = resizeState.originHeight + deltaY;
  } else if (isNorth) {
    height = resizeState.originHeight - deltaY;
    y = resizeState.originY + deltaY;
  }

  if (shiftKey && isCornerHandle) {
    const widthChange = Math.abs(width - resizeState.originWidth) / Math.max(1, resizeState.originWidth);
    const heightChange = Math.abs(height - resizeState.originHeight) / Math.max(1, resizeState.originHeight);

    if (widthChange >= heightChange) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }

    if (isWest) {
      x = resizeState.originX + (resizeState.originWidth - width);
    }
    if (isNorth) {
      y = resizeState.originY + (resizeState.originHeight - height);
    }
  }

  if (width < MIN_NODE_SIZE) {
    if (isWest) {
      x -= MIN_NODE_SIZE - width;
    }
    width = MIN_NODE_SIZE;
  }

  if (height < MIN_NODE_SIZE) {
    if (isNorth) {
      y -= MIN_NODE_SIZE - height;
    }
    height = MIN_NODE_SIZE;
  }

  if (shiftKey && isCornerHandle) {
    const scale = Math.max(
      1,
      MIN_NODE_SIZE / Math.max(width, 1),
      MIN_NODE_SIZE / Math.max(height, 1),
    );
    if (scale > 1) {
      width *= scale;
      height *= scale;
      if (isWest) {
        x = resizeState.originX + (resizeState.originWidth - width);
      }
      if (isNorth) {
        y = resizeState.originY + (resizeState.originHeight - height);
      }
    }
  }

  return { width, height, x, y };
}

function estimateAutoLeafHeight(node: LeafNode, measuredNodeSizes: MeasuredNodeSizes = {}) {
  if (node.role === 'text') {
    const fontSize =
      node.style?.fontSize && 'unit' in node.style.fontSize.parsed
        ? resolveUnitValuePx(
            node.style.fontSize.parsed,
            {
              width: getNodeWidth(node, measuredNodeSizes),
              height: VIEWPORT_HEIGHT,
              viewportWidth: VIEWPORT_WIDTH,
              viewportHeight: VIEWPORT_HEIGHT,
            },
            'width',
          )
        : 18;
    const widthPx = getNodeWidth(node, measuredNodeSizes);
    const content = node.content || '';
    const charsPerLine = Math.max(10, Math.floor(widthPx / Math.max(fontSize * 0.58, 1)));
    const lineCount = Math.max(
      1,
      content.split('\n').reduce(
        (count, line) => count + Math.max(1, Math.ceil(line.length / charsPerLine)),
        0,
      ),
    );
    return Math.ceil(lineCount * fontSize * 1.24);
  }

  if (node.role === 'link') {
    return 24;
  }

  if (node.role === 'button') {
    return 50;
  }

  return 56;
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
  const height = node.rect.height.base.parsed;
  return !('unit' in height);
}

function createDragState({
  nodeId,
  parentId,
  element,
  clientX,
  clientY,
  originX,
  originY,
}: {
  nodeId: string;
  parentId?: string;
  element: HTMLElement;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
}): Exclude<DragState, null> {
  const dragGeometry = getDragElementRect(element, clientX, clientY, parentId, originX, originY);
  return {
    nodeId,
    startClientX: clientX,
    startClientY: clientY,
    currentClientX: clientX,
    currentClientY: clientY,
    grabOffsetX: dragGeometry.offsetX,
    grabOffsetY: dragGeometry.offsetY,
    useVisualOffset: dragGeometry.useVisualOffset,
    modelShiftX: dragGeometry.modelShiftX,
    modelShiftY: dragGeometry.modelShiftY,
    previewWidth: dragGeometry.rect.width,
    previewHeight: dragGeometry.rect.height,
    originX,
    originY,
  };
}

function getDragElementRect(
  element: HTMLElement,
  clientX: number,
  clientY: number,
  parentId?: string,
  originX?: number,
  originY?: number,
): DragGeometry {
  const rect = element.getBoundingClientRect();
  const visualOffsetX = clientX - rect.left;
  const visualOffsetY = clientY - rect.top;
  if (parentId && Number.isFinite(originX) && Number.isFinite(originY)) {
    const parentElement = findDropWrapperElement(parentId);
    if (parentElement) {
      const parentRect = parentElement.getBoundingClientRect();
      const modelLeft = parentRect.left + (originX ?? 0);
      const modelTop = parentRect.top + (originY ?? 0);
      const stickyVisualShiftX = rect.left - modelLeft;
      const stickyVisualShiftY = rect.top - modelTop;
      const hasStickyVisualShift =
        Math.abs(stickyVisualShiftX) > 1 || Math.abs(stickyVisualShiftY) > 1;
      return {
        rect,
        offsetX: hasStickyVisualShift
          ? visualOffsetX
          : clientX - modelLeft,
        offsetY: hasStickyVisualShift
          ? visualOffsetY
          : clientY - modelTop,
        useVisualOffset: hasStickyVisualShift,
        modelShiftX: hasStickyVisualShift ? stickyVisualShiftX : 0,
        modelShiftY: hasStickyVisualShift ? stickyVisualShiftY : 0,
      };
    }
  }

  return {
    rect,
    offsetX: visualOffsetX,
    offsetY: visualOffsetY,
    useVisualOffset: false,
    modelShiftX: 0,
    modelShiftY: 0,
  };
}

function getSnappedDragPosition(dragState: Exclude<DragState, null>, clientX: number, clientY: number) {
  let left = clientX - dragState.grabOffsetX;
  let top = clientY - dragState.grabOffsetY;
  const width = dragState.previewWidth;
  const height = dragState.previewHeight;
  const pageTargets = collectPageSnapTargets();

  const horizontalTargets: SnapTarget[] = [...pageTargets.horizontal];
  const horizontalSnap = findHorizontalSnap(left, width, horizontalTargets);
  if (horizontalSnap) {
    left += horizontalSnap.delta;
  }

  const verticalTargets = [
    ...collectVerticalSnapTargets(dragState.nodeId),
    ...pageTargets.vertical,
  ];
  const verticalSnap = findVerticalSnap(top, height, verticalTargets);
  if (verticalSnap) {
    top += verticalSnap.delta;
  }

  return {
    clientX: left + dragState.grabOffsetX,
    clientY: top + dragState.grabOffsetY,
    guideX: horizontalSnap?.target ?? null,
    guideXSource: horizontalSnap?.source ?? null,
    guideY: verticalSnap?.target ?? null,
    guideYSource: verticalSnap?.source ?? null,
  };
}

export function didDragPointerMove(
  dragState: Pick<Exclude<DragState, null>, 'startClientX' | 'startClientY'>,
  clientX: number,
  clientY: number,
) {
  return (
    Math.abs(clientX - dragState.startClientX) > DRAG_COMMIT_THRESHOLD_PX ||
    Math.abs(clientY - dragState.startClientY) > DRAG_COMMIT_THRESHOLD_PX
  );
}

function collectVerticalSnapTargets(draggedId: string) {
  const targets: SnapTarget[] = [];
  const nodes = document.querySelectorAll<HTMLElement>('.stage-canvas [data-node-id]');
  for (const element of nodes) {
    if (element.dataset.nodeId === draggedId) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.height < 1 || rect.width < 1) {
      continue;
    }
    targets.push(
      { value: rect.top, source: 'component' },
      { value: rect.top + rect.height / 2, source: 'component' },
      { value: rect.bottom, source: 'component' },
    );
  }
  return targets;
}

function collectPageSnapTargets() {
  const frame = window.document.querySelector<HTMLElement>('.stage-frame');
  if (!frame) {
    return {
      horizontal: [
        { value: 0, source: 'page' as const },
        { value: window.innerWidth / 2, source: 'page' as const },
        { value: window.innerWidth, source: 'page' as const },
      ],
      vertical: [
        { value: 0, source: 'page' as const },
        { value: window.innerHeight / 2, source: 'page' as const },
        { value: window.innerHeight, source: 'page' as const },
      ],
    };
  }

  const rect = frame.getBoundingClientRect();
  return {
    horizontal: [
      { value: rect.left, source: 'page' as const },
      { value: rect.left + rect.width / 2, source: 'page' as const },
      { value: rect.right, source: 'page' as const },
    ],
    vertical: [
      { value: rect.top, source: 'page' as const },
      { value: rect.top + rect.height / 2, source: 'page' as const },
      { value: rect.bottom, source: 'page' as const },
    ],
  };
}

function findHorizontalSnap(left: number, width: number, targets: SnapTarget[]) {
  const anchors = [left, left + width / 2, left + width];
  let best: { delta: number; distance: number; target: number; source: 'component' | 'page' } | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { delta, distance, target: target.value, source: target.source };
      }
    }
  }

  return best;
}

function findVerticalSnap(top: number, height: number, targets: SnapTarget[]) {
  const anchors = [top, top + height / 2, top + height];
  let best: { delta: number; distance: number; target: number; source: 'component' | 'page' } | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { delta, distance, target: target.value, source: target.source };
      }
    }
  }

  return best;
}

function findDropWrapper(
  model: DocumentModel,
  draggedId: NodeId,
  clientX: number,
  clientY: number,
) {
  const target = window.document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const draggedNode = model.nodes[draggedId];
  if (!target || !draggedNode || draggedNode.type === 'site' || !draggedNode.parentId) {
    return null;
  }

  const visited = new Set<string>();
  let current: HTMLElement | null = target;
  while (current) {
    const wrapperId = current.dataset.dropWrapperId;
    if (wrapperId && !visited.has(wrapperId)) {
      visited.add(wrapperId);
      const candidate = model.nodes[wrapperId];
      if (
        candidate &&
        candidate.type === 'wrapper' &&
        isValidDropParent(model, draggedNode, candidate)
      ) {
        return {
          wrapperId,
          rect: current.getBoundingClientRect(),
        };
      }
    }
    current = current.parentElement;
  }

  const fallback = findDropWrapperElement(draggedNode.parentId);
  if (!fallback) {
    return null;
  }

  return {
    wrapperId: draggedNode.parentId,
    rect: fallback.getBoundingClientRect(),
  };
}

function findDropWrapperElement(wrapperId: string) {
  const wrappers = window.document.querySelectorAll<HTMLElement>('[data-drop-wrapper-id]');
  for (const wrapper of wrappers) {
    if (wrapper.dataset.dropWrapperId === wrapperId) {
      return wrapper;
    }
  }
  return null;
}

function isValidDropParent(
  model: DocumentModel,
  draggedNode: Exclude<DocumentNode, { type: 'site' }>,
  candidate: WrapperNode,
) {
  if (candidate.id === draggedNode.id) {
    return false;
  }

  if (isDescendant(model, candidate.id, draggedNode.id)) {
    return false;
  }

  if (draggedNode.type === 'leaf') {
    return true;
  }

  if (draggedNode.role !== 'container') {
    return false;
  }

  if (candidate.role === 'container') {
    return true;
  }

  return candidate.role === 'section' || candidate.role === 'header' || candidate.role === 'footer';
}

function isDescendant(model: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  let current: DocumentNode | undefined = model.nodes[candidateId];
  while (current && current.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = model.nodes[current.parentId];
  }
  return false;
}

function resolveOffsetPx(
  offset: NonNullable<StickyDefinition['offsetTop']>,
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: MeasuredNodeSizes = {},
) {
  return resolveUnitValuePx(
    offset.parsed,
    {
      width: getNodeWidth(node, measuredNodeSizes),
      height: getNodeHeight(node, measuredNodeSizes),
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    },
    'height',
  );
}

function defaultStickyOffset() {
  return '0px';
}

function hasIntrinsicWidth(node: Exclude<DocumentNode, { type: 'site' }>) {
  return !('unit' in node.rect.width.base.parsed);
}

function measureStageNodeSizes(root: HTMLElement): MeasuredNodeSizes {
  const next: MeasuredNodeSizes = {};
  const elements = root.querySelectorAll<HTMLElement>('[data-node-id]');

  for (const element of elements) {
    const nodeId = element.dataset.nodeId;
    if (!nodeId) {
      continue;
    }

    const measured = measureStageNodeElement(element);
    if (!measured) {
      continue;
    }

    next[nodeId] = measured;
  }

  return next;
}

export function measureStageNodeElement(
  element: Pick<HTMLElement, 'dataset' | 'classList' | 'getBoundingClientRect' | 'querySelector'>,
) {
  const nodeId = element.dataset.nodeId;
  if (!nodeId) {
    return null;
  }

  const contentWrapper =
    element.classList.contains('stage-wrapper')
      ? element.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
      : null;
  const rect = (contentWrapper ?? element).getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    width: rect.width,
    height: rect.height,
  };
}

function areMeasuredNodeSizesEqual(current: MeasuredNodeSizes, next: MeasuredNodeSizes) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of nextKeys) {
    const currentSize = current[key];
    const nextSize = next[key];
    if (!currentSize || !nextSize) {
      return false;
    }

    if (Math.abs(currentSize.width - nextSize.width) > 0.5 || Math.abs(currentSize.height - nextSize.height) > 0.5) {
      return false;
    }
  }

  return true;
}

function getStickyEdgeMode(sticky: StickyDefinition): 'top' | 'bottom' | 'both' {
  const bottom = sticky.edges.bottom ?? false;
  const top = sticky.edges.top ?? !bottom;
  if (top && bottom) {
    return 'both';
  }
  return bottom ? 'bottom' : 'top';
}

export function getNodeWidth(node: Exclude<DocumentNode, { type: 'site' }>, measuredNodeSizes: MeasuredNodeSizes = {}) {
  const measured = measuredNodeSizes[node.id];
  if (measured?.width && measured.width > 0) {
    return measured.width;
  }

  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return width.unit === 'px' ? width.value : width.unit === 'vw'
      ? (width.value / 100) * VIEWPORT_WIDTH
      : width.unit === 'vh'
        ? (width.value / 100) * VIEWPORT_HEIGHT
        : (width.value / 100) * 960;
  }
  return 240;
}

export function getNodeHeight(node: Exclude<DocumentNode, { type: 'site' }>, measuredNodeSizes: MeasuredNodeSizes = {}) {
  const measured = measuredNodeSizes[node.id];
  if (measured?.height && measured.height > 0) {
    return measured.height;
  }

  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.unit === 'px' ? height.value : height.unit === 'vh'
      ? (height.value / 100) * VIEWPORT_HEIGHT
      : height.unit === 'vw'
        ? (height.value / 100) * VIEWPORT_WIDTH
        : (height.value / 100) * 480;
  }
  if (height.keyword === 'aspect-ratio') {
    return getNodeWidth(node, measuredNodeSizes) / height.ratio;
  }
  if (node.type === 'wrapper') {
    return node.role === 'header' || node.role === 'footer' ? 0 : 480;
  }
  return estimateAutoLeafHeight(node, measuredNodeSizes);
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

function renderOffsetVisualForEdge(
  offsetPx: number,
  edge: 'top' | 'bottom',
  showEdgeLabel: boolean,
) {
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
  stickyState?: ComputedWrapperStickyState,
  measuredNodeSizes: MeasuredNodeSizes = {},
) {
  if (!stickyState || stickyState.registrations.length === 0) {
    return null;
  }

  return stickyState.registrations
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
  registration: ComputedWrapperStickyState['registrations'][number],
  wrapper: WrapperNode,
  measuredNodeSizes: MeasuredNodeSizes = {},
): CSSProperties {
  if (owner.type === 'wrapper' && owner.id === wrapper.id) {
    if (owner.sticky?.target === 'contentWrapper') {
      return {
        left: 0,
        top: `${registration.startPx}px`,
        width: '100%',
        height: `${registration.durationPx}px`,
      };
    }

    return {
      left: 0,
      top: `${registration.startPx}px`,
      width: '100%',
      height: `${registration.durationPx}px`,
    };
  }

  const left = owner.rect.x.base.raw;
  const top = `${registration.startPx}px`;
  const width = hasIntrinsicWidth(owner)
    ? `${getNodeWidth(owner, measuredNodeSizes)}px`
    : formatValue(owner.rect.width.base.parsed);

  return {
    left,
    top,
    width,
    height: `${registration.durationPx}px`,
  };
}

function buildWrapperStyle(node: WrapperNode, isTopLevel: boolean): CSSProperties {
  const width = formatValue(node.rect.width.base.parsed);
  return {
    width,
    ...(isTopLevel
      ? {}
      : {
          position: 'relative',
        }),
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
  registrations: Map<string, ComputedWrapperStickyState['registrations'][number]>,
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
  const columnTemplate = templateFromLines(columns);
  const rowTemplate = templateFromLines(rows);
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
    columnTemplate,
    rowTemplate,
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
  registration?: ComputedWrapperStickyState['registrations'][number],
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
