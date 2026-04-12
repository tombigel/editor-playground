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
import { isContainerNode, isLeafNode } from '../model/types';
import { DRAG_COMMIT_THRESHOLD_PX } from '../lib/dragConstants';

export type {
  DocumentModel,
  DocumentNode,
  DragCommitIntent,
  DragDropTarget,
  DragGeometrySnapshot,
  DragGuide,
  DragMotion,
  DragMotionSample,
  DragPreviewItem,
  DragSession,
  DragStartContext,
  DragUpdateInput,
  NodeId,
} from './types';

const DRAG_MOTION = {
  smoothingAlpha: 0.35,
  minDtMs: 8,
  dominantAxisRatio: 1.35,
  dominantAxisMinSpeedPxPerSecond: 80,
} as const;

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
    lastMotionSample: {
      clientX: context.startClientX,
      clientY: context.startClientY,
      timestampMs: context.startTimestampMs,
    },
    motion: createStationaryMotion(),
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
  const axisLocked = getShiftLockedPointer(
    session,
    input.clientX,
    input.clientY,
    input.shiftKey,
  );
  const nextMotion = resolveDragMotion(
    session.lastMotionSample,
    axisLocked.clientX,
    axisLocked.clientY,
    input.timestampMs,
    session.motion,
  );
  const phase = didPointerMove(session, input.clientX, input.clientY)
    ? 'dragging'
    : session.phase;

  if (phase === 'pending') {
    return {
      ...session,
      currentClientX: input.clientX,
      currentClientY: input.clientY,
      lastMotionSample: nextMotion.sample,
      motion: nextMotion.motion,
    };
  }

  const guideSnapEnabled = input.altKey
    ? !input.guideSnap.enabled
    : input.guideSnap.enabled;
  const shouldGuideSnap =
    guideSnapEnabled &&
    nextMotion.motion.speedPxPerSecond <= input.guideSnap.maxSpeedPxPerSecond;
  const snapped = resolveSnappedPointerPosition(
    session.geometry,
    axisLocked.clientX,
    axisLocked.clientY,
    shouldGuideSnap,
    input.guideSnap.threshold,
    input.guideSnap.power,
    nextMotion.motion,
  );
  const highlightedDropId =
    resolveHighlightedDropId(
      session.document,
      session.dragIds,
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
    lastMotionSample: nextMotion.sample,
    motion: nextMotion.motion,
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
    const anchorNode = resolved.geometry.nodes.find((node) => node.id === resolved.anchorId);
    const targetId = resolved.highlightedDropId ?? sourceParentId;
    const target = getDropTargetById(resolved.geometry.dropTargets, targetId);
    const contentBox = target?.contentBox ?? resolved.geometry.sourceContentBox;
    if (!anchorNode || !contentBox) {
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
    const anchorLocalX = localPosition.localX;
    const anchorLocalY = localPosition.localY;
    const draggedNodes = resolved.geometry.nodes.filter((node) => resolved.dragIds.includes(node.id));

    if (targetId !== sourceParentId) {
      return {
        type: 'reparentSelection',
        parentId: targetId,
        moves: draggedNodes.map((node) => ({
          id: node.id,
          x: `${Math.round(anchorLocalX + (node.originX - anchorNode.originX))}px`,
          y: `${Math.round(anchorLocalY + (node.originY - anchorNode.originY))}px`,
        })),
      };
    }

    const deltaX = resolved.currentClientX - resolved.startClientX;
    const deltaY = resolved.currentClientY - resolved.startClientY;
    return {
      type: 'moveSelection',
      moves: draggedNodes.map((node) => ({
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
  if (!anchorNode || anchorNode.contentType === 'site') {
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
    if (!node || node.contentType === 'site') {
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
    if (!node || !isContainerNode(node)) {
      return true;
    }

    return !(node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer');
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

function createStationaryMotion(): DragSession['motion'] {
  return {
    deltaX: 0,
    deltaY: 0,
    velocityX: 0,
    velocityY: 0,
    speedPxPerSecond: 0,
    dominantAxis: null,
  };
}

function resolveDragMotion(
  previousSample: DragSession['lastMotionSample'],
  clientX: number,
  clientY: number,
  timestampMs: number,
  previousMotion: DragSession['motion'],
) {
  if (
    previousSample.clientX === clientX &&
    previousSample.clientY === clientY
  ) {
    return {
      sample: previousSample,
      motion: previousMotion,
    };
  }

  const deltaX = clientX - previousSample.clientX;
  const deltaY = clientY - previousSample.clientY;
  const rawDtMs = Math.max(0, timestampMs - previousSample.timestampMs);
  const dtMs = Math.max(rawDtMs, DRAG_MOTION.minDtMs);
  const rawVelocityX = deltaX / dtMs * 1000;
  const rawVelocityY = deltaY / dtMs * 1000;
  const velocityX = blendVelocity(previousMotion.velocityX, rawVelocityX);
  const velocityY = blendVelocity(previousMotion.velocityY, rawVelocityY);
  const speedPxPerSecond = Math.hypot(velocityX, velocityY);

  return {
    sample: {
      clientX,
      clientY,
      timestampMs,
    },
    motion: {
      deltaX,
      deltaY,
      velocityX,
      velocityY,
      speedPxPerSecond,
      dominantAxis: resolveDominantAxis(velocityX, velocityY, speedPxPerSecond),
    },
  };
}

function blendVelocity(previousVelocity: number, nextVelocity: number) {
  return previousVelocity + (nextVelocity - previousVelocity) * DRAG_MOTION.smoothingAlpha;
}

function resolveDominantAxis(
  velocityX: number,
  velocityY: number,
  speedPxPerSecond: number,
): DragSession['motion']['dominantAxis'] {
  if (speedPxPerSecond < DRAG_MOTION.dominantAxisMinSpeedPxPerSecond) {
    return null;
  }

  const absX = Math.abs(velocityX);
  const absY = Math.abs(velocityY);
  if (absX === 0 && absY === 0) {
    return null;
  }
  if (absX >= absY * DRAG_MOTION.dominantAxisRatio) {
    return 'horizontal';
  }
  if (absY >= absX * DRAG_MOTION.dominantAxisRatio) {
    return 'vertical';
  }
  return null;
}

function resolveSnappedPointerPosition(
  geometry: DragGeometrySnapshot,
  clientX: number,
  clientY: number,
  snapEnabled: boolean,
  threshold: number,
  power: number,
  motion: DragSession['motion'],
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
  const horizontalSnap = motion.dominantAxis === 'vertical'
    ? null
    : findSnap(left, geometry.previewWidth, geometry.horizontalGuides, threshold);
  const verticalSnap = motion.dominantAxis === 'horizontal'
    ? null
    : findSnap(top, geometry.previewHeight, geometry.verticalGuides, threshold);
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
  draggedIds: NodeId[],
  sourceParentId: NodeId | undefined,
  targets: DragDropTarget[],
  clientX: number,
  clientY: number,
) {
  const draggedId = draggedIds[0];
  if (!draggedId) {
    return null;
  }
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
    .filter((target) => isValidDropParentSelection(document, draggedIds, target.id))
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
  if (!draggedNode || !candidate || draggedNode.contentType === 'site' || !isContainerNode(candidate)) {
    return false;
  }
  if (candidate.id === draggedNode.id) {
    return false;
  }
  if (isNodeDescendantOf(document, candidate.id, draggedNode.id)) {
    return false;
  }
  if (isLeafNode(draggedNode)) {
    return true;
  }
  if (!isContainerNode(draggedNode) || draggedNode.subtype !== 'container') {
    return false;
  }
  if (candidate.subtype === 'container') {
    return true;
  }
  return candidate.subtype === 'section' || candidate.subtype === 'header' || candidate.subtype === 'footer';
}

function isValidDropParentSelection(
  document: DocumentModel,
  draggedIds: NodeId[],
  candidateId: NodeId,
) {
  if (draggedIds.length === 0) {
    return false;
  }
  return draggedIds.every((draggedId) => isValidDropParent(document, draggedId, candidateId));
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
  if (!draggedNode || !sourceParent || !isContainerNode(sourceParent)) {
    return false;
  }

  return (
    isContainerNode(draggedNode) &&
    draggedNode.subtype === 'container' &&
    (sourceParent.subtype === 'section' || sourceParent.subtype === 'header' || sourceParent.subtype === 'footer')
  );
}
