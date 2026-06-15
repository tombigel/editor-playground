import type { ContainerChildBoundary, DocumentModel, DocumentNode, NodeId, StickyDefinition } from '../../model/types';
import { isContainerNode, isLeafNode } from '../../model/types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../../model/units';
import { moveNodeDoc, moveNodesDoc, resolveContainerChildBoundary, setContainerChildBoundaryDoc, type ParentExpansionOptions } from '../../api/documentApi';
import type { EditorState } from '../types';
import { normalizeSelectedIds } from '../selection';
import { cloneDocument } from '../editorPersistence';
import type { SelectionRect } from './shared';

export function updateRectField(
  state: EditorState,
  nodeId: NodeId,
  field: 'x' | 'y' | 'width' | 'height',
  raw: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return state;
  }
  const rect = node.rect;
  if (field === 'width') {
    rect.width.base = parseWidthValue(raw);
  } else if (field === 'height') {
    rect.height.base = parseHeightValue(raw);
  } else if (field === 'x') {
    rect.x.base = parseUnitValue(raw);
  } else {
    rect.y.base = parseUnitValue(raw);
  }
  return { ...state, document };
}

export function updateStickyField(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return state;
  }
  node.sticky = {
    enabled: false,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'auto',
    duration: parseUnitValue('50vh'),
    durationTop: parseUnitValue('50vh'),
    durationBottom: parseUnitValue('50vh'),
    ...node.sticky,
    ...patch,
  };
  if (isContainerNode(node) && node.subtype === 'container' && node.sticky.target === 'contentWrapper') {
    node.sticky.target = 'self';
  }
  return { ...state, document };
}

export function moveNode(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<Record<'x' | 'y', string>>,
  options: ParentExpansionOptions = {},
): EditorState {
  const document = moveNodeDoc(state.document, nodeId, patch, options);
  if (document === state.document) {
    return state;
  }
  return { ...state, document };
}

export function moveNodes(
  state: EditorState,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  options: ParentExpansionOptions = {},
): EditorState {
  const document = moveNodesDoc(state.document, moves, options);
  return document === state.document ? state : { ...state, document };
}

export function nudgeNode(
  state: EditorState,
  nodeId: NodeId,
  delta: { x: number; y: number },
): EditorState {
  const node = state.document.nodes[nodeId];
  if (!node || node.contentType === 'site' || !node.parentId || node.parentId === state.document.rootId) {
    return state;
  }

  const resolved = resolveKeyboardNudgePosition(state.document, nodeId, delta);
  if (!resolved) {
    return state;
  }

  return moveNode(state, nodeId, resolved.position, {
    parentExpansion: resolved.parentExpansion,
  });
}

export function resizeNode(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<Record<'width' | 'height', string>>,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return state;
  }
  if (patch.width) {
    node.rect.width.base = parseWidthValue(patch.width);
  }
  if (patch.height) {
    node.rect.height.base = parseHeightValue(patch.height);
  }
  return { ...state, document };
}

export function setContainerChildBoundary(
  state: EditorState,
  nodeId: NodeId,
  childBoundary: ContainerChildBoundary,
): EditorState {
  const document = setContainerChildBoundaryDoc(state.document, nodeId, childBoundary);
  return document === state.document ? state : { ...state, document };
}

export function alignNodes(
  state: EditorState,
  nodeIds: NodeId[],
  mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom',
  rects: Record<NodeId, SelectionRect>,
): EditorState {
  const context = getAlignmentContext(state.document, nodeIds);
  if (!context) {
    return state;
  }

  const anchorRect = rects[context.anchorId];
  if (!anchorRect) {
    return state;
  }

  const document = cloneDocument(state.document);
  let changed = false;

  for (const nodeId of context.targetIds) {
    const node = document.nodes[nodeId];
    const rect = rects[nodeId];
    if (!node || node.contentType === 'site' || !rect) {
      continue;
    }

    if (mode === 'left' || mode === 'center-x' || mode === 'right') {
      const desiredLeft =
        mode === 'left'
          ? anchorRect.left
          : mode === 'center-x'
            ? anchorRect.left + anchorRect.width / 2 - rect.width / 2
            : anchorRect.left + anchorRect.width - rect.width;
      const nextX = Math.max(0, Math.round(readCoordinatePx(node.rect.x.base.raw) + (desiredLeft - rect.left)));
      if (nextX !== Math.round(readCoordinatePx(node.rect.x.base.raw))) {
        node.rect.x.base = parseUnitValue(`${nextX}px`);
        changed = true;
      }
    } else {
      const desiredTop =
        mode === 'top'
          ? anchorRect.top
          : mode === 'center-y'
            ? anchorRect.top + anchorRect.height / 2 - rect.height / 2
            : anchorRect.top + anchorRect.height - rect.height;
      const nextY = Math.max(0, Math.round(readCoordinatePx(node.rect.y.base.raw) + (desiredTop - rect.top)));
      if (nextY !== Math.round(readCoordinatePx(node.rect.y.base.raw))) {
        node.rect.y.base = parseUnitValue(`${nextY}px`);
        changed = true;
      }
    }
  }

  return changed ? { ...state, document } : state;
}

export function distributeNodes(
  state: EditorState,
  nodeIds: NodeId[],
  mode: 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom',
  rects: Record<NodeId, SelectionRect>,
): EditorState {
  const context = getAlignmentContext(state.document, nodeIds);
  if (!context) {
    return state;
  }

  const items = context.movableIds
    .map((nodeId) => ({ nodeId, rect: rects[nodeId] }))
    .filter((item): item is { nodeId: NodeId; rect: SelectionRect } => Boolean(item.rect))
    .sort((left, right) =>
      mode === 'horizontal' || mode === 'left' || mode === 'right'
        ? left.rect.left - right.rect.left
        : left.rect.top - right.rect.top,
    );
  if (items.length < 3) {
    return state;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const isHorizontal = mode === 'horizontal' || mode === 'left' || mode === 'right';
  const totalSize = items.reduce((sum, item) => sum + (isHorizontal ? item.rect.width : item.rect.height), 0);
  const span = isHorizontal
    ? last.rect.left + last.rect.width - first.rect.left
    : last.rect.top + last.rect.height - first.rect.top;
  const gap = (span - totalSize) / (items.length - 1);

  const document = cloneDocument(state.document);
  let changed = false;
  let cursor =
    mode === 'horizontal'
      ? first.rect.left + first.rect.width + gap
      : mode === 'vertical'
        ? first.rect.top + first.rect.height + gap
        : mode === 'left'
          ? first.rect.left + ((last.rect.left - first.rect.left) / (items.length - 1))
          : mode === 'right'
            ? first.rect.left + first.rect.width + ((last.rect.left + last.rect.width - (first.rect.left + first.rect.width)) / (items.length - 1))
            : mode === 'top'
              ? first.rect.top + ((last.rect.top - first.rect.top) / (items.length - 1))
              : first.rect.top + first.rect.height + ((last.rect.top + last.rect.height - (first.rect.top + first.rect.height)) / (items.length - 1));

  const edgeStep =
    mode === 'left'
      ? (last.rect.left - first.rect.left) / (items.length - 1)
      : mode === 'right'
        ? (last.rect.left + last.rect.width - (first.rect.left + first.rect.width)) / (items.length - 1)
        : mode === 'top'
          ? (last.rect.top - first.rect.top) / (items.length - 1)
          : mode === 'bottom'
            ? (last.rect.top + last.rect.height - (first.rect.top + first.rect.height)) / (items.length - 1)
            : 0;

  for (const item of items.slice(1, -1)) {
    const node = document.nodes[item.nodeId];
    if (!node || node.contentType === 'site') {
      continue;
    }

    if (isHorizontal) {
      const desiredLeft =
        mode === 'horizontal'
          ? cursor
          : mode === 'left'
            ? cursor
            : cursor - item.rect.width;
      const nextX = Math.max(0, Math.round(readCoordinatePx(node.rect.x.base.raw) + (desiredLeft - item.rect.left)));
      if (nextX !== Math.round(readCoordinatePx(node.rect.x.base.raw))) {
        node.rect.x.base = parseUnitValue(`${nextX}px`);
        changed = true;
      }
      cursor += mode === 'horizontal' ? item.rect.width + gap : edgeStep;
    } else {
      const desiredTop =
        mode === 'vertical'
          ? cursor
          : mode === 'top'
            ? cursor
            : cursor - item.rect.height;
      const nextY = Math.max(0, Math.round(readCoordinatePx(node.rect.y.base.raw) + (desiredTop - item.rect.top)));
      if (nextY !== Math.round(readCoordinatePx(node.rect.y.base.raw))) {
        node.rect.y.base = parseUnitValue(`${nextY}px`);
        changed = true;
      }
      cursor += mode === 'vertical' ? item.rect.height + gap : edgeStep;
    }
  }

  return changed ? { ...state, document } : state;
}

function isMovableAlignmentNode(node: Exclude<DocumentNode, { contentType: 'site' }>) {
  return isLeafNode(node) || (isContainerNode(node) && node.subtype === 'container');
}

function getAlignmentContext(document: DocumentModel, nodeIds: NodeId[]) {
  const selectedIds = normalizeSelectedIds(document, nodeIds);
  if (selectedIds.length < 2) {
    return null;
  }

  const anchorId = selectedIds[0];
  const anchorNode = document.nodes[anchorId];
  if (!anchorNode || anchorNode.contentType === 'site' || !isMovableAlignmentNode(anchorNode) || !anchorNode.parentId) {
    return null;
  }

  if (
    selectedIds.some((nodeId) => {
      const node = document.nodes[nodeId];
      return !node || node.contentType === 'site' || !isMovableAlignmentNode(node) || node.parentId !== anchorNode.parentId;
    })
  ) {
    return null;
  }

  return {
    anchorId,
    movableIds: selectedIds,
    targetIds: selectedIds.filter((nodeId) => nodeId !== anchorId),
  };
}

function readCoordinatePx(raw: string) {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readAuthoredPx(value: { raw: string; parsed: unknown }) {
  const parsed = value.parsed;
  if (
    parsed &&
    typeof parsed === 'object' &&
    'unit' in parsed &&
    parsed.unit === 'px' &&
    'value' in parsed &&
    typeof parsed.value === 'number'
  ) {
    return parsed.value;
  }
  return Number.POSITIVE_INFINITY;
}

function resolveBoundaryMax(containerSize: number, childSize: number, boundary: ContainerChildBoundary) {
  if (!Number.isFinite(containerSize)) {
    return Number.POSITIVE_INFINITY;
  }
  if (boundary === 'box') {
    return Number.isFinite(childSize) ? Math.max(0, containerSize - childSize) : Number.POSITIVE_INFINITY;
  }
  return Math.max(0, containerSize);
}

function resolveKeyboardNudgePosition(
  document: DocumentModel,
  nodeId: NodeId,
  delta: { x: number; y: number },
) {
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site' || !node.parentId) {
    return null;
  }

  const parent = document.nodes[node.parentId];
  const boundary = resolveContainerChildBoundary(document, node.parentId);
  const rawX = readCoordinatePx(node.rect.x.base.raw) + delta.x;
  const rawY = readCoordinatePx(node.rect.y.base.raw) + delta.y;
  const parentWidth = parent && parent.contentType !== 'site'
    ? readAuthoredPx(parent.rect.width.base)
    : Number.POSITIVE_INFINITY;
  const parentHeight = parent && parent.contentType !== 'site'
    ? readAuthoredPx(parent.rect.height.base)
    : Number.POSITIVE_INFINITY;
  const nodeWidth = readAuthoredPx(node.rect.width.base);
  const nodeHeight = readAuthoredPx(node.rect.height.base);
  const maxX = parent && parent.contentType !== 'site'
    ? resolveBoundaryMax(parentWidth, nodeWidth, boundary)
    : Number.POSITIVE_INFINITY;
  const maxY = parent && parent.contentType !== 'site'
    ? resolveBoundaryMax(parentHeight, nodeHeight, boundary)
    : Number.POSITIVE_INFINITY;
  const shouldExpandParent = Boolean(
    boundary === 'anchor' &&
      parent &&
      parent.contentType !== 'site' &&
      Number.isFinite(parentHeight) &&
      delta.y > 0 &&
      rawY > maxY,
  );
  const nextY = shouldExpandParent ? Math.max(0, rawY) : clampCoordinate(rawY, 0, maxY);
  const requiredHeight = Number.isFinite(nodeHeight)
    ? nextY + nodeHeight
    : nextY;
  const parentExpansion = shouldExpandParent && requiredHeight > parentHeight
    ? {
        parentId: node.parentId,
        minHeightPx: requiredHeight,
      }
    : undefined;

  return {
    position: {
      x: `${Math.round(clampCoordinate(rawX, 0, maxX))}px`,
      y: `${Math.round(nextY)}px`,
    },
    parentExpansion,
  };
}

function clampCoordinate(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
