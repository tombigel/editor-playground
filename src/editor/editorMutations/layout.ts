import type { ContainerChildBoundary, DocumentModel, NodeId, StickyDefinition } from '../../model/types';
import {
  alignNodesDoc,
  distributeNodesDoc,
  moveNodeDoc,
  moveNodesDoc,
  resolveContainerChildBoundary,
  setContainerChildBoundaryDoc,
  setNodeRect,
  setNodeSticky,
  type NodeAlignmentMode,
  type NodeDistributionMode,
  type ParentExpansionOptions,
  type SelectionRect,
} from '../../api/documentApi';
import type { EditorState } from '../types';

export function updateRectField(
  state: EditorState,
  nodeId: NodeId,
  field: 'x' | 'y' | 'width' | 'height',
  raw: string,
): EditorState {
  const document = setNodeRect(state.document, nodeId, field, raw);
  return document === state.document ? state : { ...state, document };
}

export function updateStickyField(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): EditorState {
  const document = setNodeSticky(state.document, nodeId, patch);
  return document === state.document ? state : { ...state, document };
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
  let document = state.document;
  if (patch.width) {
    document = setNodeRect(document, nodeId, 'width', patch.width);
  }
  if (patch.height) {
    document = setNodeRect(document, nodeId, 'height', patch.height);
  }
  return document === state.document ? state : { ...state, document };
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
  mode: NodeAlignmentMode,
  rects: Record<NodeId, SelectionRect>,
): EditorState {
  const document = alignNodesDoc(state.document, nodeIds, mode, rects);
  return document === state.document ? state : { ...state, document };
}

export function distributeNodes(
  state: EditorState,
  nodeIds: NodeId[],
  mode: NodeDistributionMode,
  rects: Record<NodeId, SelectionRect>,
): EditorState {
  const document = distributeNodesDoc(state.document, nodeIds, mode, rects);
  return document === state.document ? state : { ...state, document };
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
