import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  beginDragSession,
  cancelDragSession,
  finishDragSession,
  updateDragSession,
} from '../../api/dragDropApi';
import type {
  DragGeometrySnapshot,
  DragGuide,
  DragPreviewItem,
  DragSession,
  DragSnapSource,
  DragSnapTarget,
  DragUpdateInput,
} from '../../api/types';
import { getTopLevelSelectedIds } from '../../editor/selection';
import type { DocumentModel, NodeId } from '../../model/types';
import type { SnapSettings } from '../../editor/types';
import type { StageProps } from '../types';

type PendingNodeInteraction = {
  nodeId: NodeId;
  mode: 'replace' | 'toggle';
  preservedSelection: boolean;
  startClientX: number;
  startClientY: number;
  startTimestampMs: number;
  originX: number;
  originY: number;
  parentId?: NodeId;
  element: HTMLElement;
};

type StageDragPresentation = {
  previewItems: DragPreviewItem[];
  previewLeft: number;
  previewTop: number;
  guideX: DragGuide | null;
  guideY: DragGuide | null;
  dragSourceIds: NodeId[];
  highlightedDropId: NodeId | null;
};

type DragControllerArgs = {
  document: DocumentModel;
  selectedIds: NodeId[];
  snapSettings: SnapSettings;
  stageElement: HTMLElement | null;
  onSelect: StageProps['onSelect'];
  onMove: StageProps['onMove'];
  onMoveSelection?: StageProps['onMoveSelection'];
  onReparent: StageProps['onReparent'];
  onReparentSelection?: StageProps['onReparentSelection'];
};

export function useStageDragDrop({
  document,
  selectedIds,
  snapSettings,
  stageElement,
  onSelect,
  onMove,
  onMoveSelection,
  onReparent,
  onReparentSelection,
}: DragControllerArgs) {
  const draggableElementsRef = useRef(new Map<NodeId, HTMLElement>());
  const dropTargetElementsRef = useRef(new Map<NodeId, HTMLElement>());
  const pendingInteractionRef = useRef<PendingNodeInteraction | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const latestInputRef = useRef<DragUpdateInput | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [presentation, setPresentation] = useState<StageDragPresentation | null>(null);

  const publishSession = useCallback((session: DragSession | null) => {
    if (!session || session.phase !== 'dragging') {
      setPresentation(null);
      return;
    }

    setPresentation({
      previewItems: session.geometry.previewItems,
      previewLeft: session.previewLeft,
      previewTop: session.previewTop,
      guideX: session.guideX,
      guideY: session.guideY,
      dragSourceIds: session.dragSourceIds,
      highlightedDropId: session.highlightedDropId,
    });
  }, []);

  const flushPointerUpdate = useCallback(() => {
    if (!sessionRef.current || !latestInputRef.current) {
      return sessionRef.current;
    }

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    sessionRef.current = updateDragSession(sessionRef.current, latestInputRef.current);
    publishSession(sessionRef.current);
    return sessionRef.current;
  }, [publishSession]);

  const cleanupInteraction = useCallback((releaseCapture = false) => {
    pendingInteractionRef.current = null;
    latestInputRef.current = null;
    sessionRef.current = cancelDragSession(sessionRef.current);
    publishSession(null);
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pointerId = activePointerIdRef.current;
    activePointerIdRef.current = null;
    if (releaseCapture && pointerId !== null && stageElement?.hasPointerCapture(pointerId)) {
      stageElement.releasePointerCapture(pointerId);
    }
  }, [publishSession, stageElement]);

  const schedulePointerUpdate = useCallback((input: DragUpdateInput) => {
    latestInputRef.current = input;
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      if (!sessionRef.current || !latestInputRef.current) {
        return;
      }
      sessionRef.current = updateDragSession(sessionRef.current, latestInputRef.current);
      publishSession(sessionRef.current);
    });
  }, [publishSession]);

  const beginSessionFromPending = useCallback((input: DragUpdateInput) => {
    const pending = pendingInteractionRef.current;
    if (!pending) {
      return null;
    }

    const candidateIds = selectedIds.includes(pending.nodeId)
      ? getTopLevelSelectedIds(document, selectedIds)
      : [pending.nodeId];
    const firstGeometry = buildGeometrySnapshot({
      document,
      dragIds: candidateIds.length > 0 ? candidateIds : [pending.nodeId],
      anchorId: pending.nodeId,
      anchorElement: draggableElementsRef.current.get(pending.nodeId) ?? pending.element,
      dragElements: draggableElementsRef.current,
      dropTargetElements: dropTargetElementsRef.current,
      stageElement,
      startClientX: pending.startClientX,
      startClientY: pending.startClientY,
    });
    let session = beginDragSession({
      document,
      anchorId: pending.nodeId,
      selectedIds,
      startClientX: pending.startClientX,
      startClientY: pending.startClientY,
      startTimestampMs: pending.startTimestampMs,
      geometry: firstGeometry,
    });

    if (
      session.anchorId !== pending.nodeId ||
      !areIdsEqual(session.dragIds, candidateIds)
    ) {
      session = beginDragSession({
        document,
        anchorId: session.anchorId,
        selectedIds,
        startClientX: pending.startClientX,
        startClientY: pending.startClientY,
        startTimestampMs: pending.startTimestampMs,
        geometry: buildGeometrySnapshot({
          document,
          dragIds: session.dragIds,
          anchorId: session.anchorId,
          anchorElement:
            draggableElementsRef.current.get(session.anchorId) ??
            draggableElementsRef.current.get(pending.nodeId) ??
            pending.element,
          dragElements: draggableElementsRef.current,
          dropTargetElements: dropTargetElementsRef.current,
          stageElement,
          startClientX: pending.startClientX,
          startClientY: pending.startClientY,
        }),
      });
    }

    if (pending.preservedSelection && candidateIds.length > 1 && session.dragIds.length === 1) {
      onSelect(session.anchorId);
    }

    sessionRef.current = updateDragSession(session, input);
    publishSession(sessionRef.current);
    return sessionRef.current;
  }, [
    document,
    onSelect,
    publishSession,
    selectedIds,
    stageElement,
  ]);

  const handleNodePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    const nodeElement = target.closest<HTMLElement>('[data-node-id]');
    const nodeId = nodeElement?.dataset.nodeId as NodeId | undefined;
    if (!nodeElement || !nodeId) {
      return;
    }

    const node = document.nodes[nodeId];
    if (!node || node.type === 'site') {
      return;
    }

    const mode: 'replace' | 'toggle' =
      event.metaKey || event.ctrlKey || event.shiftKey ? 'toggle' : 'replace';
    const preservedSelection =
      mode === 'replace' && selectedIds.includes(nodeId) && selectedIds.length > 1;

    if (!preservedSelection) {
      onSelect(nodeId, mode);
    }

    pendingInteractionRef.current = {
      nodeId,
      mode,
      preservedSelection,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTimestampMs: event.timeStamp,
      originX: parseFloat(node.rect.x.base.raw) || 0,
      originY: parseFloat(node.rect.y.base.raw) || 0,
      parentId: node.parentId ?? undefined,
      element: nodeElement,
    };

    latestInputRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      timestampMs: event.timeStamp,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      guideSnap: snapSettings.guideSnap,
      containerSnap: snapSettings.containerSnap,
    };
    activePointerIdRef.current = event.pointerId;
    stageElement?.setPointerCapture(event.pointerId);
  }, [document, onSelect, selectedIds, snapSettings, stageElement]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const input = {
      clientX: event.clientX,
      clientY: event.clientY,
      timestampMs: event.timeStamp,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      guideSnap: snapSettings.guideSnap,
      containerSnap: snapSettings.containerSnap,
    };
    latestInputRef.current = input;

    if (sessionRef.current) {
      schedulePointerUpdate(input);
      return;
    }

    if (
      pendingInteractionRef.current &&
      (Math.abs(input.clientX - pendingInteractionRef.current.startClientX) > 1 ||
        Math.abs(input.clientY - pendingInteractionRef.current.startClientY) > 1)
    ) {
      beginSessionFromPending(input);
    }
  }, [beginSessionFromPending, schedulePointerUpdate, snapSettings]);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const input = {
      clientX: event.clientX,
      clientY: event.clientY,
      timestampMs: event.timeStamp,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      guideSnap: snapSettings.guideSnap,
      containerSnap: snapSettings.containerSnap,
    };

    if (sessionRef.current) {
      latestInputRef.current = input;
      const session = flushPointerUpdate();
      if (session) {
        const commit = finishDragSession(session, input);
        if (commit.type === 'move') {
          onMove(commit.id, commit.x, commit.y);
        } else if (commit.type === 'moveSelection') {
          onMoveSelection?.(commit.moves);
        } else if (commit.type === 'reparent') {
          onReparent(commit.id, commit.parentId, commit.x, commit.y);
        } else if (commit.type === 'reparentSelection') {
          onReparentSelection?.(commit.parentId, commit.moves);
        }
      }
    } else if (pendingInteractionRef.current?.preservedSelection) {
      onSelect(pendingInteractionRef.current.nodeId);
    }

    cleanupInteraction(true);
  }, [
    cleanupInteraction,
    flushPointerUpdate,
    onMove,
    onMoveSelection,
    onReparent,
    onReparentSelection,
    onSelect,
    snapSettings,
  ]);

  const handlePointerCancel = useCallback((event?: PointerEvent<HTMLElement>) => {
    if (event && activePointerIdRef.current !== event.pointerId) {
      return;
    }
    cleanupInteraction(true);
  }, [cleanupInteraction]);

  const handleLostPointerCapture = useCallback((event: PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }
    cleanupInteraction(false);
  }, [cleanupInteraction]);

  const registerDraggableNode = useCallback((id: NodeId, element: HTMLElement | null) => {
    if (element) {
      draggableElementsRef.current.set(id, element);
      return;
    }
    draggableElementsRef.current.delete(id);
  }, []);

  const registerDropTarget = useCallback((id: NodeId, element: HTMLElement | null) => {
    if (element) {
      dropTargetElementsRef.current.set(id, element);
      return;
    }
    dropTargetElementsRef.current.delete(id);
  }, []);

  useEffect(() => () => {
    cleanupInteraction(false);
  }, [cleanupInteraction]);

  return {
    dragPresentation: presentation,
    dragSourceIds: presentation?.dragSourceIds ?? [],
    highlightedDropId: presentation?.highlightedDropId ?? null,
    isDragging: Boolean(presentation),
    handleNodePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    registerDraggableNode,
    registerDropTarget,
  };
}

function buildGeometrySnapshot({
  document,
  dragIds,
  anchorId,
  anchorElement,
  dragElements,
  dropTargetElements,
  stageElement,
  startClientX,
  startClientY,
}: {
  document: DocumentModel;
  dragIds: NodeId[];
  anchorId: NodeId;
  anchorElement: HTMLElement;
  dragElements: Map<NodeId, HTMLElement>;
  dropTargetElements: Map<NodeId, HTMLElement>;
  stageElement: HTMLElement | null;
  startClientX: number;
  startClientY: number;
}): DragGeometrySnapshot {
  const anchorNode = document.nodes[anchorId];
  if (!anchorNode || anchorNode.type === 'site') {
    throw new Error(`Expected drag anchor node for ${anchorId}`);
  }
  const previewItems = collectPreviewItems(anchorElement, dragIds, dragElements);
  const previewWidth = Math.max(
    anchorElement.getBoundingClientRect().width,
    ...previewItems.map((item) => item.offsetX + item.width),
  );
  const previewHeight = Math.max(
    anchorElement.getBoundingClientRect().height,
    ...previewItems.map((item) => item.offsetY + item.height),
  );
  const dragGeometry = measureDragGeometry(
    anchorElement,
    startClientX,
    startClientY,
    anchorNode.parentId ?? undefined,
    parseFloat(anchorNode.rect.x.base.raw) || 0,
    parseFloat(anchorNode.rect.y.base.raw) || 0,
    dropTargetElements,
  );

  return {
    previewItems,
    previewWidth,
    previewHeight,
    nodes: dragIds.flatMap((id) => {
      const node = document.nodes[id];
      if (!node || node.type === 'site') {
        return [];
      }
      return [
        {
          id,
          originX: parseFloat(node.rect.x.base.raw) || 0,
          originY: parseFloat(node.rect.y.base.raw) || 0,
          parentId: node.parentId ?? undefined,
        },
      ];
    }),
    sourceParentId: anchorNode.parentId ?? undefined,
    sourceContentBox: anchorNode.parentId
      ? measureContentBox(dropTargetElements.get(anchorNode.parentId) ?? null) ?? undefined
      : undefined,
    grabOffsetX: dragGeometry.grabOffsetX,
    grabOffsetY: dragGeometry.grabOffsetY,
    useVisualOffset: dragGeometry.useVisualOffset,
    modelShiftX: dragGeometry.modelShiftX,
    modelShiftY: dragGeometry.modelShiftY,
    horizontalGuides: collectHorizontalGuides(document, stageElement, dragIds, dragElements),
    verticalGuides: collectVerticalGuides(document, stageElement, dragIds, dragElements),
    dropTargets: collectDropTargets(dropTargetElements),
  };
}

function collectPreviewItems(
  anchorElement: HTMLElement,
  dragIds: NodeId[],
  dragElements: Map<NodeId, HTMLElement>,
) {
  const anchorRect = anchorElement.getBoundingClientRect();
  return dragIds.flatMap((id) => {
    const element = dragElements.get(id);
    if (!element) {
      return [];
    }
    const rect = element.getBoundingClientRect();
    return [
      {
        nodeId: id,
        offsetX: rect.left - anchorRect.left,
        offsetY: rect.top - anchorRect.top,
        width: rect.width,
        height: rect.height,
      },
    ];
  });
}

function collectDropTargets(elements: Map<NodeId, HTMLElement>) {
  let order = 0;
  return Array.from(elements.entries()).flatMap(([id, element]) => {
    const contentBox = measureContentBox(element);
    if (!contentBox) {
      return [];
    }
    order += 1;
    return [
      {
        id,
        contentBox,
        depth: countDropDepth(element),
        order,
      },
    ];
  });
}

function resolveNodeSnapSource(
  document: DocumentModel,
  id: NodeId,
): DragSnapSource {
  const node = document.nodes[id];
  if (!node || node.type === 'site') {
    return 'component';
  }
  if (node.type === 'wrapper') {
    const role = node.role;
    if (role === 'section' || role === 'header' || role === 'footer' || role === 'container') {
      return role;
    }
  }
  return 'component';
}

function collectHorizontalGuides(
  document: DocumentModel,
  stageElement: HTMLElement | null,
  dragIds: NodeId[],
  dragElements: Map<NodeId, HTMLElement>,
) {
  const guides = Array.from(dragElements.entries()).flatMap(([id, element]) => {
    if (dragIds.includes(id)) {
      return [];
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return [];
    }
    const source = resolveNodeSnapSource(document, id);
    return [
      { value: rect.left, source, anchor: 'edge' as const },
      { value: rect.left + rect.width / 2, source, anchor: 'center' as const },
      { value: rect.right, source, anchor: 'edge' as const },
    ];
  });
  const pageGuides = collectPageGuides(stageElement);
  return [...guides, ...pageGuides.horizontal];
}

function collectVerticalGuides(
  document: DocumentModel,
  stageElement: HTMLElement | null,
  dragIds: NodeId[],
  dragElements: Map<NodeId, HTMLElement>,
) {
  const guides = Array.from(dragElements.entries()).flatMap(([id, element]) => {
    if (dragIds.includes(id)) {
      return [];
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return [];
    }
    const source = resolveNodeSnapSource(document, id);
    return [
      { value: rect.top, source, anchor: 'edge' as const },
      { value: rect.top + rect.height / 2, source, anchor: 'center' as const },
      { value: rect.bottom, source, anchor: 'edge' as const },
    ];
  });

  const pageGuides = collectPageGuides(stageElement);
  return [...guides, ...pageGuides.vertical];
}

function collectPageGuides(stageElement: HTMLElement | null) {
  const frame = stageElement?.querySelector<HTMLElement>('.stage-frame');
  if (!frame) {
    return {
      horizontal: [] as DragSnapTarget[],
      vertical: [] as DragSnapTarget[],
    };
  }
  const rect = frame.getBoundingClientRect();
  return {
    horizontal: [
      { value: rect.left, source: 'page' as const, anchor: 'edge' as const },
      { value: rect.left + rect.width / 2, source: 'page' as const, anchor: 'center' as const },
      { value: rect.right, source: 'page' as const, anchor: 'edge' as const },
    ],
    vertical: [
      { value: rect.top, source: 'page' as const, anchor: 'edge' as const },
      { value: rect.top + rect.height / 2, source: 'page' as const, anchor: 'center' as const },
      { value: rect.bottom, source: 'page' as const, anchor: 'edge' as const },
    ],
  };
}

function countDropDepth(element: HTMLElement) {
  let depth = 0;
  let current = element.parentElement;
  while (current) {
    if (current.dataset.dropWrapperId) {
      depth += 1;
    }
    current = current.parentElement;
  }
  return depth;
}

function measureDragGeometry(
  element: HTMLElement,
  clientX: number,
  clientY: number,
  parentId: NodeId | undefined,
  originX: number,
  originY: number,
  dropTargetElements: Map<NodeId, HTMLElement>,
) {
  const rect = element.getBoundingClientRect();
  const visualOffsetX = clientX - rect.left;
  const visualOffsetY = clientY - rect.top;
  if (parentId) {
    const parentContentBox = measureContentBox(dropTargetElements.get(parentId) ?? null);
    if (parentContentBox) {
      const modelLeft = parentContentBox.left + originX;
      const modelTop = parentContentBox.top + originY;
      const modelShiftX = rect.left - modelLeft;
      const modelShiftY = rect.top - modelTop;
      const useVisualOffset = Math.abs(modelShiftX) > 1 || Math.abs(modelShiftY) > 1;
      return {
        grabOffsetX: useVisualOffset ? visualOffsetX : clientX - modelLeft,
        grabOffsetY: useVisualOffset ? visualOffsetY : clientY - modelTop,
        useVisualOffset,
        modelShiftX: useVisualOffset ? modelShiftX : 0,
        modelShiftY: useVisualOffset ? modelShiftY : 0,
      };
    }
  }

  return {
    grabOffsetX: visualOffsetX,
    grabOffsetY: visualOffsetY,
    useVisualOffset: false,
    modelShiftX: 0,
    modelShiftY: 0,
  };
}

function measureContentBox(element: HTMLElement | null) {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;

  return {
    left: rect.left + paddingLeft,
    top: rect.top + paddingTop,
    width: Math.max(0, rect.width - paddingLeft - paddingRight),
    height: Math.max(0, rect.height - paddingTop - paddingBottom),
  };
}

function areIdsEqual(left: NodeId[], right: NodeId[]) {
  return left.length === right.length && left.every((id, index) => right[index] === id);
}
