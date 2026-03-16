import { useLayoutEffect, useRef, useState } from 'react';
import { StageScene } from './StageScene';
import {
  areMeasuredNodeSizesEqual,
  computeResizeFrame,
  didDragPointerMove,
  findDropWrapper,
  getResizeCommitSize,
  measureStageNodeSizes,
  px,
  resolveDragPointerPosition,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
} from './stageMath';
import type { StageProps } from './types';
import type { DragState, MeasuredNodeSizes, ResizeState, SnapGuides } from './types/stageMath';
export type { StageProps } from './types';

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
  onStickyGeometryChange,
}: StageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [measuredNodeSizes, setMeasuredNodeSizes] = useState<MeasuredNodeSizes>({});
  const [dragState, setDragState] = useState<DragState>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({
    x: null,
    y: null,
    xSource: null,
    ySource: null,
  });
  const [resizeState, setResizeState] = useState<ResizeState>(null);

  useLayoutEffect(() => {
    const root = stageRef.current;
    if (!root) {
      return;
    }

    const next = measureStageNodeSizes(root);
    setMeasuredNodeSizes((current) => (areMeasuredNodeSizesEqual(current, next) ? current : next));
    onStickyGeometryChange?.({
      nodeSizes: next,
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    });
  }, [document, onStickyGeometryChange]);

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
            const commit = getResizeCommitSize(resizedNode, resizeState, nextWidth, nextHeight, document);
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
      <StageScene
        document={document}
        selectedId={selectedId}
        previewSticky={previewSticky}
        spacerVisibility={spacerVisibility}
        showGridLanes={showGridLanes}
        onSelect={onSelect}
        onMove={onMove}
        onResizeStart={onResizeStart}
        dragState={dragState}
        setDragState={setDragState}
        snapGuides={snapGuides}
        resizeState={resizeState}
        setResizeState={setResizeState}
        measuredNodeSizes={measuredNodeSizes}
      />
    </div>
  );
}
