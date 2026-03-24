/**
 * @module dragDropApi
 *
 * Headless drag-and-drop API.
 * Pure session lifecycle and drag resolution utilities for editor canvases.
 */

import type {
  DocumentModel,
  DragCommitIntent,
  DragDropTarget,
  DragGeometrySnapshot,
  DragSession,
  DragSnapTarget,
  DragStartContext,
  DragUpdateInput,
  NodeId,
  Rect,
} from './types';

export type {
  DocumentModel,
  DocumentNode,
  DragCommitIntent,
  DragDropTarget,
  DragGeometrySnapshot,
  DragGuide,
  DragPreviewItem,
  DragSession,
  DragStartContext,
  DragUpdateInput,
  NodeId,
} from './types';

const DRAG_COMMIT_THRESHOLD_PX = 1;

export function beginDragSession(context: DragStartContext): DragSession {
  const resolvedSelection = resolveDragSelection(
    context.document,
    context.anchorId,
    context.selectedIds,
  );
  const previewLeft = context.startClientX - context.geometry.grabOffsetX;
  const previewTop = context.startClientY - context.geometry.grabOffsetY;

  return {
    phase: 'pending',
    document: context.document,
    anchorId: resolvedSelection.anchorId,
    dragIds: resolvedSelection.dragIds,
    dragSourceIds: resolvedSelection.dragIds,
    startClientX: context.startClientX,
    startClientY: context.startClientY,
    currentClientX: context.startClientX,
    currentClientY: context.startClientY,
    previewLeft,
    previewTop,
    guideX: null,
    guideY: null,
    highlightedDropId: null,
    geometry: context.geometry,
  };
}

export function updateDragSession(
  session: DragSession,
  input: DragUpdateInput,
): DragSession {
  const phase = didPointerMove(session, input.clientX, input.clientY)
    ? 'dragging'
    : session.phase;

  if (phase === 'pending') {
    return {
      ...session,
      currentClientX: input.clientX,
      currentClientY: input.clientY,
    };
  }

  const axisLocked = getShiftLockedPointer(
    session,
    input.clientX,
    input.clientY,
    input.shiftKey,
  );
  const guideSnapEnabled = input.altKey
    ? !input.guideSnap.enabled
    : input.guideSnap.enabled;
  const snapped = resolveSnappedPointerPosition(
    session.geometry,
    axisLocked.clientX,
    axisLocked.clientY,
    guideSnapEnabled,
    input.guideSnap.threshold,
    input.guideSnap.power,
  );
  const highlightedDropId =
    session.dragIds.length > 1
      ? null
      : resolveHighlightedDropId(
          session.document,
          session.anchorId,
          session.geometry.sourceParentId,
          session.geometry.dropTargets,
          snapped.clientX,
          snapped.clientY,
        );
  const contentBox = highlightedDropId
    ? getDropTargetById(session.geometry.dropTargets, highlightedDropId)?.contentBox
    : session.geometry.sourceContentBox;
  const clamped = resolveContainerSnappedPosition(
    session.geometry,
    snapped.clientX,
    snapped.clientY,
    contentBox,
    input.containerSnap,
  );

  return {
    ...session,
    phase,
    currentClientX: clamped.clientX,
    currentClientY: clamped.clientY,
    previewLeft: clamped.previewLeft,
    previewTop: clamped.previewTop,
    guideX: snapped.guideX,
    guideY: snapped.guideY,
    highlightedDropId,
  };
}

export function finishDragSession(
  session: DragSession,
  input: DragUpdateInput,
): DragCommitIntent {
  const resolved = updateDragSession(session, input);
  if (resolved.phase !== 'dragging') {
    return { type: 'none' };
  }

  const sourceParentId = resolved.geometry.sourceParentId;
  if (!sourceParentId) {
    return { type: 'none' };
  }

  if (resolved.dragIds.length > 1) {
    const deltaX = resolved.currentClientX - resolved.startClientX;
    const deltaY = resolved.currentClientY - resolved.startClientY;
    return {
      type: 'moveSelection',
      moves: resolved.geometry.nodes
        .filter((node) => resolved.dragIds.includes(node.id))
        .map((node) => ({
          id: node.id,
          x: `${Math.max(0, Math.round(node.originX + deltaX))}px`,
          y: `${Math.max(0, Math.round(node.originY + deltaY))}px`,
        })),
    };
  }

  const targetId = resolved.highlightedDropId ?? sourceParentId;
  const target = getDropTargetById(resolved.geometry.dropTargets, targetId);
  const contentBox = target?.contentBox ?? resolved.geometry.sourceContentBox;
  if (!contentBox) {
    return { type: 'none' };
  }

  const localPosition = resolveLocalPosition(
    resolved.geometry,
    contentBox,
    resolved.currentClientX,
    resolved.currentClientY,
    input.containerSnap.threshold,
    input.containerSnap.power,
  );

  if (targetId !== sourceParentId) {
    return {
      type: 'reparent',
      id: resolved.anchorId,
      parentId: targetId,
      x: `${Math.round(localPosition.localX)}px`,
      y: `${Math.round(localPosition.localY)}px`,
    };
  }

  return {
    type: 'move',
    id: resolved.anchorId,
    x: `${Math.round(localPosition.localX)}px`,
    y: `${Math.round(localPosition.localY)}px`,
  };
}

export function cancelDragSession(_session: DragSession | null) {
  return null;
}

function resolveDragSelection(
  document: DocumentModel,
  anchorId: NodeId,
  selectedIds: NodeId[],
) {
  if (!selectedIds.includes(anchorId) || selectedIds.length <= 1) {
    return {
      anchorId,
      dragIds: [anchorId],
    };
  }

  const topLevelSelectedIds = resolveTopLevelSelectedIds(document, selectedIds);
  if (topLevelSelectedIds.length === 0) {
    return {
      anchorId,
      dragIds: [anchorId],
    };
  }
  const resolvedAnchorId =
    topLevelSelectedIds.find((selectedId) => selectedId === anchorId) ??
    topLevelSelectedIds.find((selectedId) => isNodeDescendantOf(document, anchorId, selectedId)) ??
    anchorId;
  const anchorNode = document.nodes[resolvedAnchorId];
  if (!anchorNode || anchorNode.type === 'site') {
    return {
      anchorId,
      dragIds: [anchorId],
    };
  }

  const sameParent = topLevelSelectedIds.every(
    (selectedId) => document.nodes[selectedId]?.parentId === anchorNode.parentId,
  );

  return {
    anchorId: resolvedAnchorId,
    dragIds: sameParent ? topLevelSelectedIds : [resolvedAnchorId],
  };
}

function resolveTopLevelSelectedIds(document: DocumentModel, selectedIds: NodeId[]) {
  const normalized = normalizeSelectedIds(document, selectedIds);
  if (normalized.length <= 1) {
    return normalized;
  }

  return normalized.filter(
    (candidateId) =>
      !normalized.some(
        (selectedId) =>
          selectedId !== candidateId && isNodeDescendantOf(document, candidateId, selectedId),
      ),
  );
}

function normalizeSelectedIds(document: DocumentModel, selectedIds: NodeId[]) {
  const unique = new Set<NodeId>();
  const normalized: NodeId[] = [];

  for (const id of selectedIds) {
    if (unique.has(id)) {
      continue;
    }

    const node = document.nodes[id];
    if (!node || node.type === 'site') {
      continue;
    }

    unique.add(id);
    normalized.push(id);
  }

  if (normalized.length <= 1) {
    return normalized;
  }

  return normalized.filter((id) => {
    const node = document.nodes[id];
    if (!node || node.type !== 'wrapper') {
      return true;
    }

    return !(node.role === 'section' || node.role === 'header' || node.role === 'footer');
  });
}

function isNodeDescendantOf(document: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  if (candidateId === targetAncestorId) {
    return false;
  }

  let current = document.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }

  return false;
}

function didPointerMove(
  session: Pick<DragSession, 'startClientX' | 'startClientY'>,
  clientX: number,
  clientY: number,
) {
  return (
    Math.abs(clientX - session.startClientX) > DRAG_COMMIT_THRESHOLD_PX ||
    Math.abs(clientY - session.startClientY) > DRAG_COMMIT_THRESHOLD_PX
  );
}

function getShiftLockedPointer(
  session: Pick<DragSession, 'startClientX' | 'startClientY'>,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
) {
  if (!shiftKey) {
    return { clientX, clientY };
  }

  const deltaX = clientX - session.startClientX;
  const deltaY = clientY - session.startClientY;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      clientX,
      clientY: session.startClientY,
    };
  }

  return {
    clientX: session.startClientX,
    clientY,
  };
}

function resolveSnappedPointerPosition(
  geometry: DragGeometrySnapshot,
  clientX: number,
  clientY: number,
  snapEnabled: boolean,
  threshold: number,
  power: number,
) {
  if (!snapEnabled) {
    return {
      clientX,
      clientY,
      guideX: null,
      guideY: null,
    };
  }

  let left = clientX - geometry.grabOffsetX;
  let top = clientY - geometry.grabOffsetY;
  const horizontalSnap = findSnap(left, geometry.previewWidth, geometry.horizontalGuides, threshold);
  const verticalSnap = findSnap(top, geometry.previewHeight, geometry.verticalGuides, threshold);
  if (horizontalSnap) {
    left += horizontalSnap.delta * power;
  }
  if (verticalSnap) {
    top += verticalSnap.delta * power;
  }

  return {
    clientX: left + geometry.grabOffsetX,
    clientY: top + geometry.grabOffsetY,
    guideX: horizontalSnap ? { value: horizontalSnap.target, source: horizontalSnap.source, anchor: horizontalSnap.anchor } : null,
    guideY: verticalSnap ? { value: verticalSnap.target, source: verticalSnap.source, anchor: verticalSnap.anchor } : null,
  };
}

function findSnap(
  start: number,
  size: number,
  targets: DragSnapTarget[],
  threshold: number,
) {
  const anchors = [start, start + size / 2, start + size];
  let best:
    | {
        delta: number;
        distance: number;
        target: number;
        source: DragSnapTarget['source'];
        anchor: DragSnapTarget['anchor'];
      }
    | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > threshold) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = {
          delta,
          distance,
          target: target.value,
          source: target.source,
          anchor: target.anchor,
        };
      }
    }
  }

  return best;
}

function resolveHighlightedDropId(
  document: DocumentModel,
  draggedId: NodeId,
  sourceParentId: NodeId | undefined,
  targets: DragDropTarget[],
  clientX: number,
  clientY: number,
) {
  const allowSourceParentHighlight = shouldAllowSourceParentHighlight(
    document,
    draggedId,
    sourceParentId,
  );
  const sourceParentTarget = sourceParentId
    ? getDropTargetById(targets, sourceParentId)
    : undefined;
  const pointerInsideSourceParent = Boolean(
    sourceParentTarget && pointInRect(clientX, clientY, sourceParentTarget.contentBox),
  );
  const validTargets = targets
    .filter((target) => pointInRect(clientX, clientY, target.contentBox))
    .filter((target) => isValidDropParent(document, draggedId, target.id))
    // Keep source-parent visual noise down by default, except for
    // structural wrapper drags that intentionally surface section/header/footer.
    .filter((target) => target.id !== sourceParentId || allowSourceParentHighlight)
    // While still inside the source parent, do not promote ancestor wrappers
    // (for example section) as drop highlights for in-place child drags.
    .filter((target) => {
      if (!pointerInsideSourceParent || !sourceParentId || allowSourceParentHighlight) {
        return true;
      }
      return !isNodeDescendantOf(document, sourceParentId, target.id);
    })
    .sort((left, right) => {
      if (left.depth !== right.depth) {
        return right.depth - left.depth;
      }
      return right.order - left.order;
    });

  return validTargets[0]?.id ?? null;
}

function resolveContainerSnappedPosition(
  geometry: DragGeometrySnapshot,
  clientX: number,
  clientY: number,
  contentBox: Rect | undefined,
  containerSnap: { enabled: boolean; threshold: number; power: number },
) {
  if (!contentBox || !containerSnap.enabled) {
    return {
      clientX,
      clientY,
      previewLeft: clientX - geometry.grabOffsetX,
      previewTop: clientY - geometry.grabOffsetY,
    };
  }

  const localPosition = resolveLocalPosition(
    geometry,
    contentBox,
    clientX,
    clientY,
    containerSnap.threshold,
    containerSnap.power,
  );
  const visualShiftX = geometry.useVisualOffset ? geometry.modelShiftX : 0;
  const visualShiftY = geometry.useVisualOffset ? geometry.modelShiftY : 0;
  const previewLeft = contentBox.left + localPosition.localX + visualShiftX;
  const previewTop = contentBox.top + localPosition.localY + visualShiftY;

  return {
    clientX: previewLeft + geometry.grabOffsetX,
    clientY: previewTop + geometry.grabOffsetY,
    previewLeft,
    previewTop,
  };
}

function resolveLocalPosition(
  geometry: DragGeometrySnapshot,
  contentBox: Rect,
  clientX: number,
  clientY: number,
  threshold: number,
  power: number,
) {
  const visualShiftX = geometry.useVisualOffset ? geometry.modelShiftX : 0;
  const visualShiftY = geometry.useVisualOffset ? geometry.modelShiftY : 0;
  const rawLocalX = clientX - contentBox.left - geometry.grabOffsetX - visualShiftX;
  const rawLocalY = clientY - contentBox.top - geometry.grabOffsetY - visualShiftY;

  const minX = threshold;
  const minY = threshold;
  const maxX = Math.max(threshold, contentBox.width - geometry.previewWidth - threshold);
  const maxY = Math.max(threshold, contentBox.height - geometry.previewHeight - threshold);

  const localX = magneticClamp(rawLocalX, minX, maxX, power);
  const localY = magneticClamp(rawLocalY, minY, maxY, power);
  return { localX, localY };
}

function magneticClamp(value: number, min: number, max: number, power: number) {
  if (value < min) {
    const overshoot = min - value;
    return min - overshoot * (1 - power);
  }
  if (value > max) {
    const overshoot = value - max;
    return max + overshoot * (1 - power);
  }
  return value;
}

function pointInRect(x: number, y: number, rect: Rect) {
  return (
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.top + rect.height
  );
}

function getDropTargetById(
  targets: DragDropTarget[],
  id: NodeId,
) {
  return targets.find((target) => target.id === id);
}

function isValidDropParent(
  document: DocumentModel,
  draggedId: NodeId,
  candidateId: NodeId,
) {
  const draggedNode = document.nodes[draggedId];
  const candidate = document.nodes[candidateId];
  if (!draggedNode || !candidate || draggedNode.type === 'site' || candidate.type !== 'wrapper') {
    return false;
  }
  if (candidate.id === draggedNode.id) {
    return false;
  }
  if (isNodeDescendantOf(document, candidate.id, draggedNode.id)) {
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

function shouldAllowSourceParentHighlight(
  document: DocumentModel,
  draggedId: NodeId,
  sourceParentId: NodeId | undefined,
) {
  if (!sourceParentId) {
    return false;
  }

  const draggedNode = document.nodes[draggedId];
  const sourceParent = document.nodes[sourceParentId];
  if (!draggedNode || !sourceParent || sourceParent.type !== 'wrapper') {
    return false;
  }

  return (
    draggedNode.type === 'wrapper' &&
    draggedNode.role === 'container' &&
    (sourceParent.role === 'section' || sourceParent.role === 'header' || sourceParent.role === 'footer')
  );
}
