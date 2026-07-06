import { DOCUMENT_MODEL_VERSION } from '../../lib/version';
import { normalizeDocumentFontState } from '../../fonts';
import { migrateDocumentModel } from '../../model/migration';
import { stripDerivedCodeHighlightsFromTextNode } from '../../model/richContent';
import type { ContainerChildBoundary, ContainerNode, DocumentModel, DocumentNode, NodeId, StickyDefinition } from '../../model/types';
import { isContainerNode, isLeafNode, isTextNode } from '../../model/types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../../model/units';
import { validateDocument } from '../../model/validation';
import type { DocumentCommand } from '../types/index';
import { expandParentHeightDoc, type ParentExpansionOptions } from './parentExpansion';
import { cloneDocument } from './shared';
import { setTextNodeContentDoc } from './text';

export type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type NodeAlignmentMode = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';
export type NodeDistributionMode = 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom';

export function applyDocumentCommands(document: DocumentModel, commands: DocumentCommand[]): DocumentModel {
  return commands.reduce((next, command) => {
    switch (command.type) {
      case 'setRect':
        return setNodeRect(next, command.nodeId, command.field, command.value);
      case 'setSticky':
        return setNodeSticky(next, command.nodeId, command.patch);
      case 'setText':
        return setTextNodeContentDoc(next, command.nodeId, command.field, command.value);
      default:
        return next;
    }
  }, cloneDocument(document));
}

export function setNodeRect(
  document: DocumentModel,
  nodeId: NodeId,
  field: 'x' | 'y' | 'width' | 'height',
  value: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  if (field === 'x') {
    node.rect.x.base = parseUnitValue(value);
  } else if (field === 'y') {
    node.rect.y.base = parseUnitValue(value);
  } else if (field === 'width') {
    node.rect.width.base = parseWidthValue(value);
  } else {
    node.rect.height.base = parseHeightValue(value);
  }

  return next;
}

export function moveNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<Record<'x' | 'y', string>>,
  options: ParentExpansionOptions = {},
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  let changed = false;
  if (patch.x) {
    const nextX = parseUnitValue(patch.x);
    if (node.rect.x.base.raw !== nextX.raw) {
      node.rect.x.base = nextX;
      changed = true;
    }
  }
  if (patch.y) {
    const nextY = parseUnitValue(patch.y);
    if (node.rect.y.base.raw !== nextY.raw) {
      node.rect.y.base = nextY;
      changed = true;
    }
  }

  const moved = changed ? next : document;
  return expandParentHeightDoc(moved, options.parentExpansion);
}

export function moveNodesDoc(
  document: DocumentModel,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  options: ParentExpansionOptions = {},
): DocumentModel {
  if (moves.length === 0) {
    return expandParentHeightDoc(document, options.parentExpansion);
  }

  const next = cloneDocument(document);
  let changed = false;

  for (const move of moves) {
    const node = next.nodes[move.id];
    if (!node || node.contentType === 'site') {
      continue;
    }

    const nextX = parseUnitValue(move.x);
    const nextY = parseUnitValue(move.y);
    if (node.rect.x.base.raw !== nextX.raw) {
      node.rect.x.base = nextX;
      changed = true;
    }
    if (node.rect.y.base.raw !== nextY.raw) {
      node.rect.y.base = nextY;
      changed = true;
    }
  }

  const moved = changed ? next : document;
  return expandParentHeightDoc(moved, options.parentExpansion);
}

export function resolveContainerChildBoundary(
  document: DocumentModel,
  containerId: NodeId | undefined | null,
): ContainerChildBoundary {
  if (!containerId) {
    return 'anchor';
  }
  const container = document.nodes[containerId];
  return container && isContainerNode(container) ? (container.layout?.childBoundary ?? 'anchor') : 'anchor';
}

export function setContainerChildBoundaryDoc(
  document: DocumentModel,
  containerId: NodeId,
  childBoundary: ContainerChildBoundary,
): DocumentModel {
  const next = cloneDocument(document);
  const container = next.nodes[containerId];
  if (!container || !isContainerNode(container)) {
    return document;
  }
  if ((container.layout?.childBoundary ?? 'anchor') === childBoundary) {
    return document;
  }

  container.layout = {
    ...container.layout,
    childBoundary,
  };
  return next;
}

export function setNodeSticky(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
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
  if (isContainerNode(node) && isSemanticContainerSubtype(node.subtype) && node.sticky.target === 'contentWrapper') {
    node.sticky.target = 'self';
  }

  return next;
}

export function alignNodesDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
  mode: NodeAlignmentMode,
  rects: Record<NodeId, SelectionRect>,
): DocumentModel {
  const context = getAlignmentContext(document, nodeIds);
  if (!context) {
    return document;
  }

  const anchorRect = rects[context.anchorId];
  if (!anchorRect) {
    return document;
  }

  const next = cloneDocument(document);
  let changed = false;

  for (const nodeId of context.targetIds) {
    const node = next.nodes[nodeId];
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

  return changed ? next : document;
}

export function distributeNodesDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
  mode: NodeDistributionMode,
  rects: Record<NodeId, SelectionRect>,
): DocumentModel {
  const context = getAlignmentContext(document, nodeIds);
  if (!context) {
    return document;
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
    return document;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const isHorizontal = mode === 'horizontal' || mode === 'left' || mode === 'right';
  const totalSize = items.reduce((sum, item) => sum + (isHorizontal ? item.rect.width : item.rect.height), 0);
  const span = isHorizontal
    ? last.rect.left + last.rect.width - first.rect.left
    : last.rect.top + last.rect.height - first.rect.top;
  const gap = (span - totalSize) / (items.length - 1);

  const next = cloneDocument(document);
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
    const node = next.nodes[item.nodeId];
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

  return changed ? next : document;
}

export function setSiteNodeStickyElevation(
  document: DocumentModel,
  enabled: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const site = next.nodes[next.rootId];
  if (site.contentType !== 'site') {
    return document;
  }
  site.stickyElevation = enabled;
  return next;
}

export function parseDocumentJson(raw: string): DocumentModel {
  // Migration is idempotent: legacy `type`/`role` documents are converted to
  // the canonical `contentType`/`subtype` model, current documents pass through.
  const parsed = normalizeDocumentFontState(migrateDocumentModel(JSON.parse(raw)));
  for (const node of Object.values(parsed.nodes)) {
    if (isTextNode(node)) {
      stripDerivedCodeHighlightsFromTextNode(node);
    }
  }
  const errors = validateDocument(parsed);
  if (errors.length > 0) {
    throw new Error(`Invalid document: ${errors.join('; ')}`);
  }
  return parsed;
}

export function serializeDocumentJson(document: DocumentModel): string {
  return JSON.stringify({ ...document, schemaVersion: DOCUMENT_MODEL_VERSION }, null, 2);
}

function isMovableAlignmentNode(node: Exclude<DocumentNode, { contentType: 'site' }>) {
  return isLeafNode(node) || (isContainerNode(node) && isSemanticContainerSubtype(node.subtype));
}

function isSemanticContainerSubtype(subtype: ContainerNode['subtype']) {
  return subtype === 'container' || subtype === 'nav' || subtype === 'aside' || subtype === 'article';
}

function getAlignmentContext(document: DocumentModel, nodeIds: NodeId[]) {
  const selectedIds = normalizeSelectedIdsForDocument(document, nodeIds);
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

function normalizeSelectedIdsForDocument(document: DocumentModel, nodeIds: NodeId[]) {
  const seen = new Set<NodeId>();
  const normalized: NodeId[] = [];
  for (const nodeId of nodeIds) {
    if (seen.has(nodeId) || !document.nodes[nodeId]) {
      continue;
    }
    seen.add(nodeId);
    normalized.push(nodeId);
  }
  return normalized.filter((nodeId) => !hasSelectedAncestor(document, nodeId, seen));
}

function hasSelectedAncestor(document: DocumentModel, nodeId: NodeId, selectedIds: Set<NodeId>) {
  let current = document.nodes[nodeId];
  while (current?.parentId) {
    if (selectedIds.has(current.parentId)) {
      return true;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

function readCoordinatePx(raw: string) {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
