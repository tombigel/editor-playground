import { createMediaNode } from '../../model/defaults';
import type { ContainerNode, ContainerSubtype, DocumentModel, DocumentNode, MediaNode, MediaSubtype, NodeId, TextSubtype } from '../../model/types';
import { isContainerNode, isLeafNode } from '../../model/types';
import { parseUnitValue } from '../../model/units';
import {
  convertTextNodeDoc as convertTextNodeDocHelper,
  switchTextSubtypeDoc as switchTextSubtypeDocHelper,
  type TextConversionOptions,
} from '../textConversion';
import {
  mergeTextNodesToRichDoc as mergeTextNodesToRichDocHelper,
  splitRichTextNodeDoc as splitRichTextNodeDocHelper,
  type MergeTextNodesOptions,
} from '../textMerge';
import { cloneDocument } from './shared';
import { expandParentHeightDoc, type ParentExpansionOptions } from './parentExpansion';
import type { NodeOrderAction } from './types';

/**
 * Delete a single node (and its descendants) from the document.
 */
export function deleteNodeDoc(document: DocumentModel, nodeId: NodeId): DocumentModel {
  return deleteNodesDoc(document, [nodeId]);
}

/**
 * Delete multiple nodes (and their descendants) from the document.
 * Automatically filters to top-level selected IDs so that deleting a parent
 * and child simultaneously does not cause errors.
 */
export function deleteNodesDoc(document: DocumentModel, nodeIds: NodeId[]): DocumentModel {
  if (nodeIds.length === 0) {
    return document;
  }

  const next = cloneDocument(document);

  // Filter to top-level IDs (skip nodes whose ancestor is also in the list).
  const topLevel = nodeIds.filter((candidateId) =>
    !nodeIds.some((otherId) => otherId !== candidateId && isDescendantOf(next, candidateId, otherId)),
  );

  if (topLevel.length === 0) {
    return document;
  }

  for (const nodeId of topLevel) {
    const node = next.nodes[nodeId];
    if (!node || node.parentId === null) {
      continue;
    }
    removeSubtree(next, nodeId);
    const parent = next.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((childId) => childId !== nodeId);
    }
  }

  return next;
}

/**
 * Reorder a node among its siblings within the document.
 */
export function reorderNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  action: NodeOrderAction,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site' || !node.parentId) {
    return document;
  }

  const parent = next.nodes[node.parentId];
  if (!parent) {
    return document;
  }

  const index = parent.children.indexOf(nodeId);
  if (index === -1) {
    return document;
  }

  // Sections are reordered only among sibling sections at root level.
  if (isContainerNode(node) && node.subtype === 'section') {
    if (parent.contentType !== 'site') {
      return document;
    }
    if (action === 'sendToBack' || action === 'bringToFront') {
      return document;
    }
    const targetIndex = findSiblingSectionIndex(next, parent.children, index, action === 'back' ? -1 : 1);
    if (targetIndex === -1) {
      return document;
    }
    const nextChildren = [...parent.children];
    [nextChildren[targetIndex], nextChildren[index]] = [nextChildren[index], nextChildren[targetIndex]];
    parent.children = nextChildren;
    return next;
  }

  if (!isReorderableNode(node)) {
    return document;
  }

  const nextChildren = [...parent.children];
  if (action === 'back') {
    if (index === 0) return document;
    [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
  } else if (action === 'forward') {
    if (index === nextChildren.length - 1) return document;
    [nextChildren[index + 1], nextChildren[index]] = [nextChildren[index], nextChildren[index + 1]];
  } else if (action === 'sendToBack') {
    if (index === 0) return document;
    nextChildren.splice(index, 1);
    nextChildren.unshift(nodeId);
  } else {
    if (index === nextChildren.length - 1) return document;
    nextChildren.splice(index, 1);
    nextChildren.push(nodeId);
  }

  parent.children = nextChildren;
  return next;
}

/**
 * Reparent a node to a new parent within the document.
 * Returns the original document unchanged when the operation is invalid
 * (e.g. reparenting to a descendant, invalid parent type).
 */
export function reparentNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  newParentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const newParent = next.nodes[newParentId];

  if (!node || !newParent || node.contentType === 'site' || !isContainerNode(newParent)) {
    return document;
  }

  if (newParentId === nodeId) {
    return document;
  }

  if (node.parentId === null || node.parentId === newParentId) {
    return document;
  }

  // Validate the parent-child relationship.
  if (!canAcceptChild(newParent, node)) {
    return document;
  }

  // Prevent reparenting into own descendants.
  if (isDescendantOf(next, newParentId, nodeId)) {
    return document;
  }

  const previousParent = next.nodes[node.parentId];
  if (previousParent) {
    previousParent.children = previousParent.children.filter((childId) => childId !== nodeId);
  }
  newParent.children.push(nodeId);
  node.parentId = newParentId;

  return next;
}

export function reparentNodeAtDoc(
  document: DocumentModel,
  nodeId: NodeId,
  newParentId: NodeId,
  position: { x: string; y: string },
  options: ParentExpansionOptions = {},
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const newParent = next.nodes[newParentId];

  if (!node || !newParent || node.contentType === 'site' || !isContainerNode(newParent)) {
    return document;
  }

  if (newParentId === nodeId) {
    return document;
  }

  if (node.parentId === null) {
    return document;
  }

  if (node.parentId === newParentId) {
    node.rect.x.base = parseUnitValue(position.x);
    node.rect.y.base = parseUnitValue(position.y);
    return expandParentHeightDoc(next, options.parentExpansion);
  }

  if (!canAcceptChild(newParent, node)) {
    return document;
  }

  if (isDescendantOf(next, newParentId, nodeId)) {
    return document;
  }

  const previousParent = next.nodes[node.parentId];
  if (previousParent) {
    previousParent.children = previousParent.children.filter((childId) => childId !== nodeId);
  }
  newParent.children.push(nodeId);
  node.parentId = newParentId;
  node.rect.x.base = parseUnitValue(position.x);
  node.rect.y.base = parseUnitValue(position.y);

  return expandParentHeightDoc(next, options.parentExpansion);
}

export function reparentNodesAtDoc(
  document: DocumentModel,
  newParentId: NodeId,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  options: ParentExpansionOptions = {},
): DocumentModel {
  if (moves.length === 0) {
    return expandParentHeightDoc(document, options.parentExpansion);
  }

  const next = cloneDocument(document);
  const newParent = next.nodes[newParentId];
  if (!newParent || !isContainerNode(newParent)) {
    return document;
  }

  const moveMap = new Map(moves.map((move) => [move.id, move]));
  const nodes = moves.map((move) => next.nodes[move.id]);
  if (nodes.some((node) => !node || node.contentType === 'site')) {
    return document;
  }

  const sourceParentId = nodes[0]?.parentId ?? null;
  if (!sourceParentId || nodes.some((node) => node?.parentId !== sourceParentId)) {
    return document;
  }

  if (sourceParentId === newParentId) {
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
    const reparented = changed ? next : document;
    return expandParentHeightDoc(reparented, options.parentExpansion);
  }

  for (const node of nodes) {
    if (!node || !canAcceptChild(newParent, node)) {
      return document;
    }
    if (newParentId === node.id || isDescendantOf(next, newParentId, node.id)) {
      return document;
    }
  }

  const sourceParent = next.nodes[sourceParentId];
  if (!sourceParent) {
    return document;
  }

  const movedIds = sourceParent.children.filter((childId) => moveMap.has(childId));
  sourceParent.children = sourceParent.children.filter((childId) => !moveMap.has(childId));
  newParent.children.push(...movedIds);

  for (const nodeId of movedIds) {
    const node = next.nodes[nodeId];
    const move = moveMap.get(nodeId);
    if (!node || !move || node.contentType === 'site') {
      continue;
    }
    node.parentId = newParentId;
    node.rect.x.base = parseUnitValue(move.x);
    node.rect.y.base = parseUnitValue(move.y);
  }

  return expandParentHeightDoc(next, options.parentExpansion);
}

export function moveNodeInTreeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetParentId: NodeId,
  targetIndex: number,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const targetParent = next.nodes[targetParentId];

  if (!node || node.contentType === 'site' || !targetParent || targetIndex < 0) {
    return document;
  }

  const movingStructuralRootNode =
    isContainerNode(node) &&
    isSiteSectionRole(node.subtype) &&
    targetParent.contentType === 'site' &&
    targetParentId === next.rootId;

  if (targetParent.contentType === 'site') {
    if (!movingStructuralRootNode) {
      return document;
    }
  } else if (!canAcceptChild(targetParent, node)) {
    return document;
  }

  if (node.parentId == null) {
    return document;
  }

  if (targetParentId === nodeId || isDescendantOf(next, targetParentId, nodeId)) {
    return document;
  }

  const currentParent = next.nodes[node.parentId];
  if (!currentParent) {
    return document;
  }

  const currentIndex = currentParent.children.indexOf(nodeId);
  if (currentIndex === -1) {
    return document;
  }

  if (
    currentParent.id === targetParent.id &&
    (targetIndex === currentIndex || targetIndex === currentIndex + 1)
  ) {
    return document;
  }

  const maxTargetIndex = targetParent.children.length;
  if (targetIndex > maxTargetIndex) {
    return document;
  }

  currentParent.children = currentParent.children.filter((childId) => childId !== nodeId);
  const nextIndex =
    currentParent.id === targetParent.id && currentIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;

  if (nextIndex < 0 || nextIndex > targetParent.children.length) {
    return document;
  }

  targetParent.children.splice(nextIndex, 0, nodeId);
  node.parentId = targetParentId;

  if (movingStructuralRootNode) {
    normalizeRootStructuralRoles(next);
  }

  return next;
}

export function convertTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: TextSubtype,
  options?: TextConversionOptions,
): DocumentModel {
  return convertTextNodeDocHelper(document, nodeId, targetSubtype, options);
}

export function switchTextSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: TextSubtype,
  options?: TextConversionOptions,
): DocumentModel {
  return switchTextSubtypeDocHelper(document, nodeId, targetSubtype, options);
}

export function splitRichTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
): DocumentModel {
  return splitRichTextNodeDocHelper(document, nodeId);
}

export function mergeTextNodesToRichDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
  options?: MergeTextNodesOptions,
): DocumentModel {
  return mergeTextNodesToRichDocHelper(document, nodeIds, options);
}

/**
 * Legacy subtype switcher. Media switching remains in-place here for backward compatibility,
 * while text switching delegates to the explicit text conversion APIs.
 */
export function switchSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: MediaSubtype | TextSubtype,
): DocumentModel {
  const node = document.nodes[nodeId];
  if (!node) {
    return document;
  }

  const contentType = (node as { contentType?: string }).contentType;

  // Determine the target family from the targetSubtype value.
  const mediaSubtypes: MediaSubtype[] = ['image', 'video', 'svg', 'embed'];
  const textSubtypes: TextSubtype[] = ['block', 'rich', 'code', 'list'];
  const targetIsMedia = (mediaSubtypes as string[]).includes(targetSubtype);
  const targetIsText = (textSubtypes as string[]).includes(targetSubtype);

  if (!targetIsMedia && !targetIsText) {
    throw new Error(`switchSubtypeDoc: unrecognised targetSubtype "${targetSubtype}"`);
  }

  if (contentType === 'container' || contentType === 'site') {
    throw new Error(
      `switchSubtypeDoc: cannot switch subtype of a "${contentType}" node — use promote/demote logic instead`,
    );
  }

  if (contentType === 'media' && !targetIsMedia) {
    throw new Error(
      `switchSubtypeDoc: source node is "media" but targetSubtype "${targetSubtype}" belongs to the "text" family`,
    );
  }

  if (contentType === 'text' && !targetIsText) {
    throw new Error(
      `switchSubtypeDoc: source node is "text" but targetSubtype "${targetSubtype}" belongs to the "media" family`,
    );
  }

  // If there's nothing to change, bail early.
  const currentSubtype = (node as { subtype?: string }).subtype;
  if (currentSubtype === targetSubtype) {
    return document;
  }

  if (contentType === 'text') {
    return switchTextSubtypeDoc(document, nodeId, targetSubtype as TextSubtype, { mode: 'auto' });
  }

  const next = cloneDocument(document);
  const sourceNode = next.nodes[nodeId];

  if (targetIsMedia) {
    // media → media
    const mediaSource = sourceNode as MediaNode;
    const base = createMediaNode(targetSubtype as MediaSubtype, mediaSource.parentId ?? '');
    const switched: MediaNode = {
      ...base,
      // Identity / tree fields
      id: mediaSource.id,
      parentId: mediaSource.parentId,
      children: [...mediaSource.children],
      name: mediaSource.name,
      visible: mediaSource.visible,
      locked: mediaSource.locked,
      // Position
      rect: mediaSource.rect,
      // Behaviour
      ...(mediaSource.sticky !== undefined ? { sticky: mediaSource.sticky } : {}),
      ...(mediaSource.animation !== undefined ? { animation: mediaSource.animation } : {}),
      // Media content — transfer src/alt; type-specific props come from the base
      ...(mediaSource.src !== undefined ? { src: mediaSource.src } : {}),
      ...(mediaSource.alt !== undefined ? { alt: mediaSource.alt } : {}),
    };
    next.nodes[nodeId] = switched;
    return next;
  }
  return document;
}

// ---------------------------------------------------------------------------
// Internal helpers for pure DocumentModel mutations
// ---------------------------------------------------------------------------

function removeSubtree(document: DocumentModel, nodeId: NodeId) {
  const node = document.nodes[nodeId];
  if (!node) return;
  for (const childId of node.children) {
    removeSubtree(document, childId);
  }
  delete document.nodes[nodeId];
}

function isDescendantOf(document: DocumentModel, candidateId: NodeId, ancestorId: NodeId): boolean {
  let current = document.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

function isReorderableNode(node: DocumentNode): boolean {
  if (node.contentType === 'site') return false;
  if (isLeafNode(node)) return true;
  return isContainerNode(node) && node.subtype === 'container';
}

function isSiteSectionRole(subtype: ContainerSubtype): boolean {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

function canAcceptChild(parent: DocumentNode, child: DocumentNode): boolean {
  if (!isContainerNode(parent)) return false;
  if (isLeafNode(child)) return true;
  if (!isContainerNode(child)) return false;
  if (child.subtype !== 'container') return false;
  if (parent.subtype === 'container') return true;
  return isSiteSectionRole(parent.subtype);
}

function findSiblingSectionIndex(
  document: DocumentModel,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
): number {
  let index = fromIndex + direction;
  while (index >= 0 && index < siblingIds.length) {
    const candidate = document.nodes[siblingIds[index]];
    if (candidate && isContainerNode(candidate) && candidate.subtype === 'section') {
      return index;
    }
    index += direction;
  }
  return -1;
}

function normalizeRootStructuralRoles(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return;
  }

  const structuralContainers = root.children
    .map((childId) => document.nodes[childId])
    .filter(
      (node): node is ContainerNode =>
        Boolean(node && isContainerNode(node) && isSiteSectionRole(node.subtype)),
    );

  if (structuralContainers.length === 0) {
    return;
  }

  for (const container of structuralContainers) {
    container.subtype = 'section';
  }

  structuralContainers[0].subtype = 'header';
  if (structuralContainers.length > 1) {
    structuralContainers[structuralContainers.length - 1].subtype = 'footer';
  }
}
