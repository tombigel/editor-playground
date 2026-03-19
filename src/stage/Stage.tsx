import { useLayoutEffect, useRef, useState } from 'react';
import { getTopLevelSelectedIds } from '../editor/selection';
import { StageScene } from './StageScene';
import {
  areMeasuredNodeSizesEqual,
  computeResizeFrame,
  createDragState,
  DEFAULT_STAGE_VIEWPORT,
  didDragPointerMove,
  findDropWrapper,
  getResizeCommitSize,
  measureCssViewport,
  measureStageViewport,
  measureStageNodeSizes,
  px,
  resolveDragPointerPosition,
} from './stageMath';
import type { StageProps } from './types';
import type { DragState, MeasuredNodeSizes, ResizeState, SnapGuides } from './types';
export type { StageProps } from './types';

type PendingNodeInteraction = {
  kind: 'node';
  nodeId: string;
  mode: 'replace' | 'toggle';
  preservedSelection: boolean;
  dragSelectionIds: string[];
  element: HTMLElement;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  parentId?: string;
};

type MarqueeState = {
  clickedId: string | null;
  mode: 'replace' | 'toggle';
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  active: boolean;
};

type MultiSelectionBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function Stage({
  document,
  selectedId,
  selectedIds = selectedId ? [selectedId] : [],
  previewSticky,
  spacerVisibility,
  showGridLanes,
  snapEnabled,
  onStageFocus,
  onSelect,
  onSelectMany = () => {},
  onClearSelection = () => {},
  onMove,
  onMoveSelection,
  onReparent,
  onResize,
  onResizeStart,
  onResizeEnd,
  onStickyGeometryChange,
}: StageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null);
  const [measuredNodeSizes, setMeasuredNodeSizes] = useState<MeasuredNodeSizes>({});
  const [viewport, setViewport] = useState(DEFAULT_STAGE_VIEWPORT);
  const [dragState, setDragState] = useState<DragState>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({
    x: null,
    y: null,
    xSource: null,
    ySource: null,
  });
  const [resizeState, setResizeState] = useState<ResizeState>(null);
  const [pendingNodeInteraction, setPendingNodeInteraction] = useState<PendingNodeInteraction | null>(null);
  const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null);
  const [multiSelectionBounds, setMultiSelectionBounds] = useState<MultiSelectionBounds | null>(null);

  function handleStageRef(node: HTMLDivElement | null) {
    stageRef.current = node;
    setStageElement(node);
  }

  useLayoutEffect(() => {
    const root = stageRef.current;
    if (!root) {
      return;
    }

    const next = measureStageNodeSizes(root, document);
    const nextViewport = measureStageViewport(root) ?? DEFAULT_STAGE_VIEWPORT;
    setMeasuredNodeSizes((current) => (areMeasuredNodeSizesEqual(current, next) ? current : next));
    setViewport((current) => (
      Math.abs(current.width - nextViewport.width) < 0.5 &&
      Math.abs(current.height - nextViewport.height) < 0.5
        ? current
        : nextViewport
    ));
    onStickyGeometryChange?.({
      nodeSizes: next,
      viewportWidth: nextViewport.width,
      viewportHeight: nextViewport.height,
    });
  }, [document, onStickyGeometryChange]);

  useLayoutEffect(() => {
    if (selectedIds.length <= 1 || dragState) {
      setMultiSelectionBounds(null);
      return;
    }

    const root = stageRef.current;
    if (!root) {
      setMultiSelectionBounds(null);
      return;
    }

    const frameElement = root.querySelector<HTMLElement>('.stage-frame');
    if (!frameElement) {
      setMultiSelectionBounds(null);
      return;
    }

    const frameRect = frameElement.getBoundingClientRect();
    const topLevelSelectedIds = getTopLevelSelectedIds(document, selectedIds);
    const nodeRects = topLevelSelectedIds
      .map((nodeId) => root.querySelector<HTMLElement>(`#stage-node-${nodeId}`)?.getBoundingClientRect() ?? null)
      .filter((rect): rect is DOMRect => rect !== null);

    if (nodeRects.length <= 1) {
      setMultiSelectionBounds(null);
      return;
    }

    const left = Math.min(...nodeRects.map((rect) => rect.left)) - frameRect.left;
    const top = Math.min(...nodeRects.map((rect) => rect.top)) - frameRect.top;
    const right = Math.max(...nodeRects.map((rect) => rect.right)) - frameRect.left;
    const bottom = Math.max(...nodeRects.map((rect) => rect.bottom)) - frameRect.top;
    setMultiSelectionBounds({
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    });
  }, [document, dragState, selectedIds]);

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: editor stage needs aria-activedescendant for selection tracking
    <section
      ref={handleStageRef}
      className="stage-shell editor-scrollbar"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: editor stage requires keyboard focus for shortcuts and selection
      tabIndex={0}
      aria-label="Editor stage"
      aria-activedescendant={selectedId ? `stage-node-${selectedId}` : undefined}
      data-stage-focus-scope="true"
      onFocus={onStageFocus}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-stage-resize-handle="true"]')) {
          return;
        }

        const mode: 'replace' | 'toggle' = event.metaKey || event.ctrlKey || event.shiftKey ? 'toggle' : 'replace';
        const nodeElement = target.closest<HTMLElement>('[data-node-id]');
        const nodeId = nodeElement?.dataset.nodeId;
        const node = nodeId ? document.nodes[nodeId] : null;

        if (
          node &&
          node.type === 'wrapper' &&
          node.parentId === document.rootId &&
          (node.role === 'section' || node.role === 'header' || node.role === 'footer')
        ) {
          setMarqueeState({
            clickedId: node.id,
            mode,
            startClientX: event.clientX,
            startClientY: event.clientY,
            currentClientX: event.clientX,
            currentClientY: event.clientY,
            active: false,
          });
          setPendingNodeInteraction(null);
          return;
        }

        if (nodeElement && nodeId && node && node.type !== 'site') {
          const preservesSelection = mode === 'replace' && selectedIds.includes(nodeId) && selectedIds.length > 1;
          const dragSelectionIds = preservesSelection
            ? getTopLevelSelectedIds(document, selectedIds)
            : [nodeId];

          if (!preservesSelection) {
            onSelect(nodeId, mode);
          }

          setPendingNodeInteraction({
            kind: 'node',
            nodeId,
            mode,
            preservedSelection: preservesSelection,
            dragSelectionIds,
            element: nodeElement,
            startClientX: event.clientX,
            startClientY: event.clientY,
            originX: parseFloat(node.rect.x.base.raw) || 0,
            originY: parseFloat(node.rect.y.base.raw) || 0,
            parentId: node.parentId ?? undefined,
          });
          setMarqueeState(null);
          return;
        }

        setMarqueeState({
          clickedId: null,
          mode,
          startClientX: event.clientX,
          startClientY: event.clientY,
          currentClientX: event.clientX,
          currentClientY: event.clientY,
          active: false,
        });
        setPendingNodeInteraction(null);
      }}
      onMouseMove={(event) => {
        if (dragState) {
          const snapped = resolveDragPointerPosition(dragState, event.clientX, event.clientY, {
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            snapEnabled,
          });
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

        if (pendingNodeInteraction && didDragPointerMove(pendingNodeInteraction, event.clientX, event.clientY)) {
          const previewItems = collectDragPreviewItems(
            stageRef.current,
            pendingNodeInteraction.element,
            pendingNodeInteraction.dragSelectionIds,
          );
          setDragState(
            createDragState({
              nodeId: pendingNodeInteraction.nodeId,
              draggedNodeIds: pendingNodeInteraction.dragSelectionIds,
              previewItems,
              parentId: pendingNodeInteraction.parentId,
              element: pendingNodeInteraction.element,
              clientX: pendingNodeInteraction.startClientX,
              clientY: pendingNodeInteraction.startClientY,
              originX: pendingNodeInteraction.originX,
              originY: pendingNodeInteraction.originY,
            }),
          );
          setPendingNodeInteraction(null);
        }

        if (marqueeState) {
          setMarqueeState({
            ...marqueeState,
            currentClientX: event.clientX,
            currentClientY: event.clientY,
            active: marqueeState.active || didDragPointerMove(marqueeState, event.clientX, event.clientY),
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
          const resizedNode = document.nodes[resizeState.nodeId];
          if (resizedNode && resizedNode.type !== 'site') {
            const cssViewport = measureCssViewport(stageRef.current, viewport);
            const commit = getResizeCommitSize(
              resizedNode,
              resizeState,
              nextWidth,
              nextHeight,
              document,
              measuredNodeSizes,
              cssViewport,
            );
            onResize(resizeState.nodeId, commit.width, commit.height);
          }
          if (nextX !== originX || nextY !== originY) {
            onMove(resizeState.nodeId, px(nextX), px(nextY));
          }
        }
      }}
      onMouseUp={(event) => {
        if (dragState) {
          if (didDragPointerMove(dragState, event.clientX, event.clientY)) {
            const snapped = resolveDragPointerPosition(dragState, event.clientX, event.clientY, {
              shiftKey: event.shiftKey,
              altKey: event.altKey,
              snapEnabled,
            });
            const draggedNodeIds = dragState.draggedNodeIds ?? [dragState.nodeId];
            if (draggedNodeIds.length > 1) {
              const deltaX = snapped.clientX - dragState.startClientX;
              const deltaY = snapped.clientY - dragState.startClientY;
              onMoveSelection?.(
                draggedNodeIds.flatMap((nodeId) => {
                  const draggedNode = document.nodes[nodeId];
                  if (!draggedNode || draggedNode.type === 'site') {
                    return [];
                  }
                  return [{
                    id: nodeId,
                    x: `${Math.max(0, (parseFloat(draggedNode.rect.x.base.raw) || 0) + deltaX)}px`,
                    y: `${Math.max(0, (parseFloat(draggedNode.rect.y.base.raw) || 0) + deltaY)}px`,
                  }];
                }),
              );
            } else {
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
        }

        if (pendingNodeInteraction?.preservedSelection) {
          onSelect(pendingNodeInteraction.nodeId);
        }

        if (marqueeState) {
          if (marqueeState.active) {
            onSelectMany(
              collectMarqueeSelectionIds(stageRef.current, document, marqueeState),
              marqueeState.mode,
            );
          } else if (marqueeState.clickedId) {
            onSelect(marqueeState.clickedId, marqueeState.mode);
          } else if (marqueeState.mode === 'replace') {
            onClearSelection();
          }
        }

        if (resizeState) {
          onResizeEnd(resizeState.nodeId);
        }
        setPendingNodeInteraction(null);
        setMarqueeState(null);
        setDragState(null);
        setSnapGuides({ x: null, y: null, xSource: null, ySource: null });
        setResizeState(null);
      }}
      onMouseLeave={() => {
        if (resizeState) {
          onResizeEnd(resizeState.nodeId);
        }
        setPendingNodeInteraction(null);
        setMarqueeState(null);
        setDragState(null);
        setSnapGuides({ x: null, y: null, xSource: null, ySource: null });
        setResizeState(null);
      }}
    >
      <p className="sr-only">
        Tab selects components in stage order. Arrow keys move the selected component by 1 pixel.
        Shift plus arrow keys move by 10 pixels.
      </p>
      <StageScene
        document={document}
        selectedId={selectedId}
        selectedIds={selectedIds}
        multiSelectionBounds={multiSelectionBounds}
        previewSticky={previewSticky}
        spacerVisibility={spacerVisibility}
        showGridLanes={showGridLanes}
        onResizeStart={onResizeStart}
        dragState={dragState}
        setDragState={setDragState}
        snapGuides={snapGuides}
        resizeState={resizeState}
        setResizeState={setResizeState}
        measuredNodeSizes={measuredNodeSizes}
        viewport={viewport}
      />
      {marqueeState?.active ? <MarqueeSelectionBox stageElement={stageElement} marqueeState={marqueeState} /> : null}
    </section>
  );
}

function collectDragPreviewItems(
  stageElement: HTMLDivElement | null,
  anchorElement: HTMLElement,
  draggedIds: string[],
) {
  if (!stageElement || draggedIds.length === 0) {
    return [];
  }

  const anchorRect = anchorElement.getBoundingClientRect();
  return draggedIds.flatMap((nodeId) => {
    const element = stageElement.querySelector<HTMLElement>(`#stage-node-${nodeId}`);
    if (!element) {
      return [];
    }
    const rect = element.getBoundingClientRect();
    return [{
      nodeId,
      offsetX: rect.left - anchorRect.left,
      offsetY: rect.top - anchorRect.top,
      width: rect.width,
      height: rect.height,
    }];
  });
}

function collectMarqueeSelectionIds(
  stageElement: HTMLDivElement | null,
  documentModel: StageProps['document'],
  marqueeState: MarqueeState,
) {
  if (!stageElement) {
    return [];
  }

  const marqueeRect = getMarqueeClientRect(marqueeState);
  return Array.from(stageElement.querySelectorAll<HTMLElement>('.stage-canvas [data-node-id]'))
    .map((element) => {
      const nodeId = element.dataset.nodeId;
      if (!nodeId) {
        return null;
      }
      const node = documentModel.nodes[nodeId];
      if (!node || node.type === 'site') {
        return null;
      }
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || !rectsIntersect(rect, marqueeRect)) {
        return null;
      }
      return nodeId;
    })
    .filter((nodeId): nodeId is string => Boolean(nodeId));
}

function rectsIntersect(left: DOMRect, right: { left: number; top: number; width: number; height: number }) {
  return !(
    left.right < right.left ||
    left.left > right.left + right.width ||
    left.bottom < right.top ||
    left.top > right.top + right.height
  );
}

function getMarqueeClientRect(marqueeState: MarqueeState) {
  const left = Math.min(marqueeState.startClientX, marqueeState.currentClientX);
  const top = Math.min(marqueeState.startClientY, marqueeState.currentClientY);
  return {
    left,
    top,
    width: Math.abs(marqueeState.currentClientX - marqueeState.startClientX),
    height: Math.abs(marqueeState.currentClientY - marqueeState.startClientY),
  };
}

function MarqueeSelectionBox({
  stageElement,
  marqueeState,
}: {
  stageElement: HTMLDivElement | null;
  marqueeState: MarqueeState;
}) {
  if (!stageElement) {
    return null;
  }

  const stageRect = stageElement.getBoundingClientRect();
  const clientRect = getMarqueeClientRect(marqueeState);

  return (
    <div
      className="stage-marquee-selection"
      style={{
        left: clientRect.left - stageRect.left + stageElement.scrollLeft,
        top: clientRect.top - stageRect.top + stageElement.scrollTop,
        width: clientRect.width,
        height: clientRect.height,
      }}
    />
  );
}
