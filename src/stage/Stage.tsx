import { useMemo, useState } from 'react';
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

type Props = {
  document: DocumentModel;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onReparent: (id: NodeId, parentId: NodeId, x: string, y: string) => void;
  onResize: (id: NodeId, width: string, height: string) => void;
};

function formatNodeLabel(node: Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>) {
  return `${node.role.charAt(0).toUpperCase()}${node.role.slice(1)}`;
}

export function Stage({
  document,
  selectedId,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  onSelect,
  onMove,
  onReparent,
  onResize,
}: Props) {
  const stickyState = useMemo(() => computeStickyState(document), [document]);
  const [dragState, setDragState] = useState<DragState>(null);
  const [resizeState, setResizeState] = useState<ResizeState>(null);
  const root = document.nodes[document.rootId];
  const wrappers = getChildren(document, root.id).filter((node) => node.type === 'wrapper') as WrapperNode[];
  const header = wrappers.find((node) => node.role === 'header') ?? null;
  const footer = wrappers.find((node) => node.role === 'footer') ?? null;
  const mainWrappers = wrappers.filter((node) => node.role === 'section');

  return (
    <div
      className="stage-shell"
      onMouseMove={(event) => {
        if (dragState) {
          setDragState({
            ...dragState,
            currentClientX: event.clientX,
            currentClientY: event.clientY,
          });
        }
        if (resizeState) {
          const deltaX = event.clientX - resizeState.startClientX;
          const deltaY = event.clientY - resizeState.startClientY;
          const nextWidth = Math.max(24, resizeState.originWidth + deltaX);
          const nextHeight = Math.max(24, resizeState.originHeight + deltaY);
          onResize(resizeState.nodeId, `${nextWidth}px`, `${nextHeight}px`);
        }
      }}
      onMouseUp={(event) => {
        if (dragState) {
          const drop = findDropWrapper(event.clientX, event.clientY);
          const draggedNode = document.nodes[dragState.nodeId];
          if (drop && draggedNode && draggedNode.type !== 'site') {
            const localX = Math.max(0, event.clientX - drop.rect.left - dragState.grabOffsetX);
            const localY = Math.max(0, event.clientY - drop.rect.top - dragState.grabOffsetY);
            if (draggedNode.parentId !== drop.wrapperId) {
              onReparent(dragState.nodeId, drop.wrapperId, `${localX}px`, `${localY}px`);
            } else {
              onMove(dragState.nodeId, `${localX}px`, `${localY}px`);
            }
          }
        }
        setDragState(null);
        setResizeState(null);
      }}
      onMouseLeave={() => {
        setDragState(null);
        setResizeState(null);
      }}
    >
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
              dragState,
              setDragState,
              resizeState,
              setResizeState,
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
              dragState,
              setDragState,
              resizeState,
              setResizeState,
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
              dragState,
              setDragState,
              resizeState,
              setResizeState,
              isTopLevel: true,
            })
          : <EmptySlot label="Footer slot" />}
        </div>
      </div>
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
          }}
        >
          <div className="drag-preview-wrapper-label">{node.name}</div>
          <div
            className="drag-preview-content-wrapper"
            style={{
              background: node.style.background,
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
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  isTopLevel: boolean;
  meshPlacement?: CSSProperties;
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
  dragState,
  setDragState,
  setResizeState,
  isTopLevel,
  meshPlacement,
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
  const extraExtent = stickyMap[node.id]?.totalExtraExtentPx ?? 0;
  const meshLayout = computeMeshLayout(children, node, registrationMap);
  const wrapperStyle = buildWrapperStyle(node, isTopLevel);
  const showWrapperSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, node.id);
  const isStickyContentWrapper = node.sticky?.enabled && node.sticky.target === 'contentWrapper';
  const wrapperStickyCss =
    previewSticky && node.sticky?.enabled && node.sticky.target === 'self'
      ? getStickyCss(node.sticky, isTopLevel, node)
      : undefined;
  const contentWrapperStyle: CSSProperties = isStickyContentWrapper
    ? {
        width: '100%',
        ...getContentWrapperBaseStyle(node),
        background: node.style.background,
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
        ...(previewSticky ? getStickyCss(node.sticky!, true, node) : {}),
      }
    : {
        ...getContentWrapperBaseStyle(node),
        background: node.style.background,
        display: 'grid',
        gridTemplateColumns: meshLayout.columnTemplate,
        gridTemplateRows: meshLayout.rowTemplate,
      };

  return (
    <Tag
      key={node.id}
      data-node-id={node.id}
      data-node-label={formatNodeLabel(node)}
      className={`stage-wrapper role-${node.role} ${selectedId === node.id ? 'selected' : ''} ${
        dragState?.nodeId === node.id ? 'drag-source' : ''
      }`}
      style={{
        ...wrapperStyle,
        ...meshPlacement,
        borderColor: node.style.borderColor,
        borderWidth: node.style.borderWidth ? formatValue(node.style.borderWidth.parsed) : '1px',
        ...wrapperStickyCss,
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(node.id);
        if (!isTopLevel) {
          const dragGeometry = getDragElementRect(event.currentTarget, event.clientX, event.clientY);
          setDragState({
            nodeId: node.id,
            currentClientX: event.clientX,
            currentClientY: event.clientY,
            grabOffsetX: dragGeometry.offsetX,
            grabOffsetY: dragGeometry.offsetY,
            previewWidth: dragGeometry.rect.width,
            previewHeight: dragGeometry.rect.height,
            originX: parseFloat(node.rect.x.base.raw) || 0,
            originY: parseFloat(node.rect.y.base.raw) || 0,
          });
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
        {showWrapperSpacerVisuals ? renderOffsetVisual(node.sticky, node) : null}
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
              }),
            )}
          {showWrapperSpacerVisuals ? renderSpacerRanges(document, node, wrapperStickyState) : null}
        </div>
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
                dragState,
                setDragState,
                resizeState: null,
                setResizeState,
                isTopLevel: false,
                meshPlacement: meshLayout.childPlacements[child.id],
              })
            : renderLeaf({
                child,
                selectedId,
                previewSticky,
                spacerVisibility,
                onSelect,
                onMove,
                dragState,
                setDragState,
                setResizeState,
                registration: registrationMap.get(child.id),
                meshPlacement: meshLayout.childPlacements[child.id],
                wrapperBottomLanePx: meshLayout.bottomLanePx,
              }),
        )}
        {selectedId === node.id && !isTopLevel ? (
          <ResizeHandleView
            onHandleMouseDown={(handle, event) => {
              event.stopPropagation();
              setResizeState({
                nodeId: node.id,
                handle,
                startClientX: event.clientX,
                startClientY: event.clientY,
                originWidth: numericWidth(node.rect.width.base.raw),
                originHeight: numericHeight(node.rect.height.base.raw),
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
}

type LeafNode = Extract<DocumentModel['nodes'][string], { type: 'leaf' }>;

function renderLeaf({
  child,
  selectedId,
  previewSticky,
  spacerVisibility,
  onSelect,
  onMove: _onMove,
  dragState,
  setDragState,
  setResizeState,
  registration,
  meshPlacement,
  wrapperBottomLanePx,
}: {
  child: LeafNode;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setResizeState: (state: ResizeState) => void;
  registration?: ComputedWrapperStickyState['registrations'][number];
  meshPlacement?: CSSProperties;
  wrapperBottomLanePx: number;
}) {
  const isAutoSticky =
    child.sticky?.enabled && child.sticky.target === 'self' && child.sticky.durationMode === 'auto' && registration;
  const isSelfStickyTrack =
    child.sticky?.enabled &&
    child.sticky.target === 'self' &&
    child.sticky.durationMode !== 'auto' &&
    registration;
  const showLeafSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, child.id);
  const isBrandMark = child.role === 'image' && child.name === 'Brand Mark';
  const leafBaseWidth = formatValue(child.rect.width.base.parsed);
  const leafBaseHeight = getLeafCssHeight(child);
  const trackWidth = getTrackCssWidth(child);
  const leafBody = (
    <div
      key={child.id}
      data-node-id={child.id}
      data-node-label={formatNodeLabel(child)}
      className={`stage-leaf role-${child.role} ${isBrandMark ? 'is-brand-mark' : ''} ${
        selectedId === child.id ? 'selected' : ''
      } ${dragState?.nodeId === child.id ? 'drag-source' : ''}`}
      style={{
        ...(isSelfStickyTrack
          ? {
              width: '100%',
            }
          : {
              ...meshPlacement,
              width: '100%',
            }),
        height: leafBaseHeight,
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        position: previewSticky && (isSelfStickyTrack || isAutoSticky) ? 'sticky' : 'relative',
        ...(
          previewSticky && child.sticky?.enabled
            ? getStickyCss(child.sticky, false, child)
            : {}
        ),
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(child.id);
        const dragGeometry = getDragElementRect(event.currentTarget, event.clientX, event.clientY);
        setDragState({
          nodeId: child.id,
          currentClientX: event.clientX,
          currentClientY: event.clientY,
          grabOffsetX: dragGeometry.offsetX,
          grabOffsetY: dragGeometry.offsetY,
          previewWidth: dragGeometry.rect.width,
          previewHeight: dragGeometry.rect.height,
          originX: parseFloat(child.rect.x.base.raw) || 0,
          originY: parseFloat(child.rect.y.base.raw) || 0,
        });
      }}
    >
      <div className="stage-leaf-body">{renderLeafContent(child)}</div>
      {selectedId === child.id ? (
        <ResizeHandleView
          onHandleMouseDown={(handle, event) => {
            event.stopPropagation();
            setResizeState({
              nodeId: child.id,
              handle,
              startClientX: event.clientX,
              startClientY: event.clientY,
              originWidth: numericWidth(child.rect.width.base.raw),
              originHeight: numericHeight(child.rect.height.base.raw),
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

  const leafHeightPx = getNodeHeight(child);
  const trackHeight = isAutoSticky ? leafHeightPx : leafHeightPx + registration.durationPx;
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
      {leafBody}
      <div
        className="sticky-track-spacer"
        style={{
          height: `${registration.durationPx}px`,
        }}
      />
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
}: {
  child: LeafNode;
  registration?: ComputedWrapperStickyState['registrations'][number];
  meshPlacement?: CSSProperties;
  wrapperBottomLanePx: number;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  selectedId: NodeId | null;
}) {
  if (!registration || !child.sticky?.enabled || child.sticky.target !== 'self') {
    return null;
  }

  const showLeafSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedId, child.id);
  if (!showLeafSpacerVisuals) {
    return null;
  }

  const leafHeightPx = getNodeHeight(child);

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
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        ...(previewSticky ? getStickyCss(child.sticky, false, child) : {}),
      }}
    >
      {renderOffsetVisual(child.sticky, child)}
      {child.sticky.durationMode === 'auto' ? (
        <div
          className="sticky-auto-spacer"
          style={{
            height: `${Math.max(0, wrapperBottomLanePx - registration.startPx)}px`,
          }}
        >
          <span className="sticky-spacer-label sticky-spacer-label-auto">Distance: auto</span>
        </div>
      ) : (
        <div
          className="sticky-distance-spacer-visual"
          style={{
            height: `${registration.durationPx}px`,
          }}
        >
          <span className="sticky-spacer-label">{`Distance · ${Math.round(registration.durationPx)}px`}</span>
        </div>
      )}
    </div>
  );
}

function renderLeafContent(node: LeafNode) {
  switch (node.role) {
    case 'text':
      return (
        <p
          style={{
            color: node.style?.color ?? '#16202a',
            fontSize: node.style?.fontSize
              ? formatValue(node.style.fontSize.parsed)
              : '18px',
            fontWeight: node.style?.fontWeight ?? 'normal',
            fontStyle: node.style?.fontStyle ?? 'normal',
            lineHeight: node.style?.lineHeight ?? 1.24,
            textAlign: node.style?.textAlign ?? 'left',
          }}
        >
          {node.content}
        </p>
      );
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

function estimateAutoLeafHeight(node: LeafNode) {
  if (node.role === 'text') {
    const fontSize =
      node.style?.fontSize && 'unit' in node.style.fontSize.parsed
        ? resolveUnitValuePx(
            node.style.fontSize.parsed,
            {
              width: getNodeWidth(node),
              height: 900,
              viewportWidth: 1440,
              viewportHeight: 900,
            },
            'width',
          )
        : 18;
    const widthPx = getNodeWidth(node);
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
  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return formatValue(width);
  }
  return 'min-content';
}

function getDragElementRect(element: HTMLElement, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect();
  return {
    rect,
    offsetX: clientX - rect.left,
    offsetY: clientY - rect.top,
  };
}

function findDropWrapper(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const dropElement = target?.closest('[data-drop-wrapper-id]') as HTMLElement | null;
  if (!dropElement) {
    return null;
  }

  const wrapperId = dropElement.dataset.dropWrapperId;
  if (!wrapperId) {
    return null;
  }

  return {
    wrapperId,
    rect: dropElement.getBoundingClientRect(),
  };
}

function resolveOffsetPx(
  offset: NonNullable<StickyDefinition['offsetTop']>,
  node: Exclude<DocumentNode, { type: 'site' }>,
) {
  return resolveUnitValuePx(
    offset.parsed,
    {
      width: getNodeWidth(node),
      height: getNodeHeight(node),
      viewportWidth: 1440,
      viewportHeight: 900,
    },
    'height',
  );
}

function defaultStickyOffset(node: Exclude<DocumentNode, { type: 'site' }>) {
  return node.type === 'wrapper' ? '0px' : '0px';
}

function getNodeWidth(node: Exclude<DocumentNode, { type: 'site' }>) {
  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return width.unit === 'px' ? width.value : width.unit === 'vw'
      ? (width.value / 100) * 1440
      : width.unit === 'vh'
        ? (width.value / 100) * 900
        : (width.value / 100) * 960;
  }
  return 240;
}

function getNodeHeight(node: Exclude<DocumentNode, { type: 'site' }>) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.unit === 'px' ? height.value : height.unit === 'vh'
      ? (height.value / 100) * 900
      : height.unit === 'vw'
        ? (height.value / 100) * 1440
        : (height.value / 100) * 480;
  }
  if (height.keyword === 'aspect-ratio') {
    return getNodeWidth(node) / height.ratio;
  }
  if (node.type === 'wrapper') {
    return node.role === 'header' || node.role === 'footer' ? 0 : 480;
  }
  return estimateAutoLeafHeight(node);
}

function formatHeight(node: WrapperNode) {
  const parsed = node.rect.height.base.parsed;
  if ('unit' in parsed) {
    return formatValue(parsed);
  }
  return parsed.keyword;
}

function getStickyCss(
  sticky: NonNullable<Exclude<DocumentNode, { type: 'site' }>['sticky']>,
  allowStickyPosition: boolean,
  node: Exclude<DocumentNode, { type: 'site' }>,
): CSSProperties {
  if (!sticky.enabled) {
    return {};
  }

  const style: CSSProperties = {};
  if (allowStickyPosition) {
    style.position = 'sticky';
  }

  const topActive = sticky.edges.top ?? !sticky.edges.bottom;
  const bottomActive = sticky.edges.bottom ?? false;

  if (topActive) {
    style.top = sticky.offsetTop?.raw ?? defaultStickyOffset(node);
  }
  if (bottomActive) {
    style.bottom = sticky.offsetBottom?.raw ?? defaultStickyOffset(node);
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
) {
  if (!sticky?.enabled) {
    return null;
  }

  const offset = sticky.offsetTop ?? sticky.offsetBottom;
  const offsetPx = offset ? resolveOffsetPx(offset, node) : 0;
  if (offsetPx <= 0) {
    return null;
  }

  return (
    <div className="sticky-offset-visual" style={{ height: `${offsetPx}px`, top: `${-offsetPx}px` }}>
      <span className="sticky-offset-label">Offset · {Math.round(offsetPx)}px</span>
    </div>
  );
}

function renderSpacerRanges(
  document: DocumentModel,
  wrapper: WrapperNode,
  stickyState?: ComputedWrapperStickyState,
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

    const style = getSpacerRangeStyle(owner, registration, wrapper);
    return (
      <div
        key={registration.ownerId}
        className={`sticky-spacer-range ${owner.sticky?.durationMode === 'auto' ? 'sticky-spacer-range-auto' : ''}`}
        style={style}
      >
        <span className="sticky-spacer-label">
          {owner.sticky?.durationMode === 'auto'
            ? 'Distance: auto'
            : `Distance · ${Math.round(registration.durationPx)}px`}
        </span>
      </div>
    );
    });
}

function getSpacerRangeStyle(
  owner: Exclude<DocumentNode, { type: 'site' }>,
  registration: ComputedWrapperStickyState['registrations'][number],
  wrapper: WrapperNode,
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
  const width = formatValue(owner.rect.width.base.parsed);

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
): MeshLayout {
  const width = getNodeWidth(wrapper);
  const baseHeight = getNodeHeight(wrapper);
  const xLines = new Set<number>([0, width]);
  const yLines = new Set<number>([0, baseHeight]);

  for (const child of children) {
    const childX = resolveCoordinatePx(child.rect.x.base.parsed, width, baseHeight, 'x');
    const childY = resolveCoordinatePx(child.rect.y.base.parsed, width, baseHeight, 'y');
    const childWidth = getNodeWidth(child);
    const childHeight = getMeshNodeHeight(child, registrations.get(child.id));
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
    const childWidth = getNodeWidth(child);
    const childHeight = getMeshNodeHeight(child, registrations.get(child.id));
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
) {
  const baseHeight = getNodeHeight(node);
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
      viewportWidth: 1440,
      viewportHeight: 900,
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
