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
  showSpacers: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onReparent: (id: NodeId, parentId: NodeId, x: string, y: string) => void;
  onResize: (id: NodeId, width: string, height: string) => void;
};

export function Stage({
  document,
  selectedId,
  previewSticky,
  showSpacers,
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
      <div className="stage-canvas">
        {header
          ? renderWrapper({
              document,
              node: header,
              selectedId,
              previewSticky,
              showSpacers,
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
              showSpacers,
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
              showSpacers,
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
        <div className="drag-preview-inner wrapper-preview">{node.name}</div>
      ) : (
        <div className="drag-preview-inner leaf-preview">{renderLeafContent(node)}</div>
      )}
    </div>
  );
}

type RenderWrapperArgs = {
  document: DocumentModel;
  node: WrapperNode;
  selectedId: NodeId | null;
  previewSticky: boolean;
  showSpacers: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  stickyMap: Record<string, ComputedWrapperStickyState>;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  isTopLevel: boolean;
};

function renderWrapper({
  document,
  node,
  selectedId,
  previewSticky,
  showSpacers,
  onSelect,
  onMove,
  stickyMap,
  dragState,
  setDragState,
  setResizeState,
  isTopLevel,
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
  const extraExtent = stickyMap[node.id]?.totalExtraExtentPx ?? 0;
  const wrapperStyle = buildWrapperStyle(node, isTopLevel);
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
        ...(previewSticky ? getStickyCss(node.sticky!, true, node) : {}),
      }
    : {
        ...getContentWrapperBaseStyle(node),
        background: node.style.background,
      };

  return (
    <Tag
      key={node.id}
      data-node-id={node.id}
      className={`stage-wrapper role-${node.role} ${selectedId === node.id ? 'selected' : ''} ${
        dragState?.nodeId === node.id ? 'drag-source' : ''
      }`}
      style={{
        ...wrapperStyle,
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
        {showSpacers ? renderOffsetVisual(node.sticky, node) : null}
        <div className="sticky-spacer-layer">
          {showSpacers ? renderSpacerRanges(document, node, wrapperStickyState) : null}
        </div>
        {children.map((child) =>
          child.type === 'wrapper'
            ? renderWrapper({
                document,
                node: child,
                selectedId,
                previewSticky,
                showSpacers,
                onSelect,
                onMove,
                stickyMap,
                dragState,
                setDragState,
                resizeState: null,
                setResizeState,
                isTopLevel: false,
              })
            : renderLeaf({
                child,
                selectedId,
                previewSticky,
                showSpacers,
                onSelect,
                onMove,
                dragState,
                setDragState,
                setResizeState,
                registration: wrapperStickyState?.registrations.find(
                  (registration) => registration.ownerId === child.id,
                ),
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
          className={`sticky-flow-spacer ${showSpacers ? '' : 'spacer-visual-hidden'}`}
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
  showSpacers,
  onSelect,
  onMove: _onMove,
  dragState,
  setDragState,
  setResizeState,
  registration,
}: {
  child: LeafNode;
  selectedId: NodeId | null;
  previewSticky: boolean;
  showSpacers: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setResizeState: (state: ResizeState) => void;
  registration?: ComputedWrapperStickyState['registrations'][number];
}) {
  const isSelfStickyTrack =
    child.sticky?.enabled && child.sticky.target === 'self' && registration;
  const leafBaseWidth = formatValue(child.rect.width.base.parsed);
  const leafBody = (
    <div
      key={child.id}
      data-node-id={child.id}
      className={`stage-leaf role-${child.role} ${selectedId === child.id ? 'selected' : ''} ${
        dragState?.nodeId === child.id ? 'drag-source' : ''
      }`}
      style={{
        ...(isSelfStickyTrack
          ? {
              width: leafBaseWidth,
            }
          : {
              left: child.rect.x.base.raw,
              top: child.rect.y.base.raw,
              width: leafBaseWidth,
            }),
        height:
          child.rect.height.base.parsed && 'unit' in child.rect.height.base.parsed
            ? formatValue(child.rect.height.base.parsed)
            : child.rect.height.base.raw.startsWith('aspect-ratio')
              ? 'auto'
              : formatValue(child.rect.height.base.parsed),
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        position: previewSticky && isSelfStickyTrack ? 'sticky' : 'absolute',
        ...(
          previewSticky && child.sticky?.enabled
            ? getStickyCss(child.sticky, false, child)
            : {}
        ),
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(child.id);
        const dragRoot =
          (event.currentTarget.closest('.sticky-track') as HTMLElement | null) ?? event.currentTarget;
        const dragGeometry = getDragElementRect(dragRoot, event.clientX, event.clientY);
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
      {renderLeafContent(child)}
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

  const trackHeight = numericHeight(child.rect.height.base.raw) + registration.durationPx;
  return (
    <div
      key={`${child.id}-track`}
      className={`sticky-track ${dragState?.nodeId === child.id ? 'drag-source' : ''}`}
      style={{
        left: child.rect.x.base.raw,
        top: child.rect.y.base.raw,
        width: 'min-content',
        minHeight: `${trackHeight}px`,
      }}
    >
      {showSpacers ? renderOffsetVisual(child.sticky, child) : null}
      {leafBody}
      <div
        className={`sticky-track-spacer ${showSpacers ? '' : 'spacer-visual-hidden'}`}
        style={{
          height: `${registration.durationPx}px`,
        }}
      >
        <span className="sticky-spacer-label">
          {child.name} spacer · {Math.round(registration.durationPx)}px
        </span>
      </div>
    </div>
  );
}

function renderLeafContent(node: LeafNode) {
  switch (node.role) {
    case 'text':
      return <p>{node.content}</p>;
    case 'image':
      return <div className="image-placeholder">{node.alt || 'Image'}</div>;
    case 'link':
      return <a href={node.href}>{node.label}</a>;
    case 'button':
      return <button type="button">{node.label}</button>;
  }
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

function numericWidth(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 160;
}

function numericHeight(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 80;
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
  return node.type === 'wrapper' ? 480 : 56;
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
      <span className="sticky-offset-label">offset · {Math.round(offsetPx)}px</span>
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
      <div key={registration.ownerId} className="sticky-spacer-range" style={style}>
        <span className="sticky-spacer-label">
          {owner.name} spacer · {Math.round(registration.durationPx)}px
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
          position: 'absolute',
          left: node.rect.x.base.raw,
          top: node.rect.y.base.raw,
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
