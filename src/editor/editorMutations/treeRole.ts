import type { ContainerSubtype, DocumentModel, DocumentNode, NodeId } from '../../model/types';
import { isContainerNode, isLeafNode } from '../../model/types';
import { parseUnitValue } from '../../model/units';
import { moveNodeInTreeDoc } from '../../api/documentApi';
import type { EditorState, NodeOrderAction } from '../types';
import { normalizeSelectedIds } from '../selection';
import { cloneDocument } from '../editorPersistence';
import { applySelectionToDocument, assertWrapper } from './shared';
import { moveNode, moveNodes } from './layout';

export function reorderNode(
  state: EditorState,
  nodeId: NodeId,
  action: NodeOrderAction,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site' || !node.parentId) {
    return state;
  }

  const parent = document.nodes[node.parentId];
  if (!parent) {
    return state;
  }

  const index = parent.children.indexOf(nodeId);
  if (index === -1) {
    return state;
  }

  // Sections are reordered only among sibling sections at root level.
  if (isContainerNode(node) && node.subtype === 'section') {
    if (parent.contentType !== 'site') {
      return state;
    }
    if (action === 'sendToBack' || action === 'bringToFront') {
      return state;
    }
    const targetIndex = findSiblingSectionIndex(document, parent.children, index, action === 'back' ? -1 : 1);
    if (targetIndex === -1) {
      return state;
    }
    const nextChildren = [...parent.children];
    [nextChildren[targetIndex], nextChildren[index]] = [nextChildren[index], nextChildren[targetIndex]];
    parent.children = nextChildren;
    return { ...state, document };
  }

  if (!isReorderableComponent(node)) {
    return state;
  }

  const nextChildren = [...parent.children];
  if (action === 'back') {
    if (index === 0) {
      return state;
    }
    [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
  } else if (action === 'forward') {
    if (index === nextChildren.length - 1) {
      return state;
    }
    [nextChildren[index + 1], nextChildren[index]] = [nextChildren[index], nextChildren[index + 1]];
  } else if (action === 'sendToBack') {
    if (index === 0) {
      return state;
    }
    nextChildren.splice(index, 1);
    nextChildren.unshift(nodeId);
  } else {
    if (index === nextChildren.length - 1) {
      return state;
    }
    nextChildren.splice(index, 1);
    nextChildren.push(nodeId);
  }

  parent.children = nextChildren;
  return { ...state, document };
}

export function reorderNodes(
  state: EditorState,
  nodeIds: NodeId[],
  action: NodeOrderAction,
): EditorState {
  const selectedIds = normalizeSelectedIds(state.document, nodeIds);
  if (selectedIds.length <= 1) {
    return selectedIds[0] ? reorderNode(state, selectedIds[0], action) : state;
  }

  if (
    selectedIds.some((nodeId) => {
      const node = state.document.nodes[nodeId];
      return node && isContainerNode(node) && node.subtype === 'section';
    })
  ) {
    return state;
  }

  const document = cloneDocument(state.document);
  const selectedNodes = selectedIds.map((nodeId) => document.nodes[nodeId]).filter(Boolean) as Exclude<DocumentNode, { type: 'site' }>[];
  const parentId = selectedNodes[0]?.parentId ?? null;
  if (
    !parentId ||
    selectedNodes.some((node) => !isReorderableComponent(node) || node.parentId !== parentId)
  ) {
    return state;
  }

  const parent = document.nodes[parentId];
  if (!parent) {
    return state;
  }

  const selectedIdSet = new Set(selectedIds);
  const nextChildren = [...parent.children];

  if (action === 'sendToBack' || action === 'bringToFront') {
    const selectedChildren = nextChildren.filter((childId) => selectedIdSet.has(childId));
    const unselectedChildren = nextChildren.filter((childId) => !selectedIdSet.has(childId));
    parent.children =
      action === 'sendToBack'
        ? [...selectedChildren, ...unselectedChildren]
        : [...unselectedChildren, ...selectedChildren];
    return { ...state, document };
  }

  if (action === 'back') {
    for (let index = 1; index < nextChildren.length; index += 1) {
      if (selectedIdSet.has(nextChildren[index]) && !selectedIdSet.has(nextChildren[index - 1])) {
        [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
      }
    }
  } else {
    for (let index = nextChildren.length - 2; index >= 0; index -= 1) {
      if (selectedIdSet.has(nextChildren[index]) && !selectedIdSet.has(nextChildren[index + 1])) {
        [nextChildren[index], nextChildren[index + 1]] = [nextChildren[index + 1], nextChildren[index]];
      }
    }
  }

  parent.children = nextChildren;
  return { ...state, document };
}

function isReorderableComponent(node: Exclude<DocumentNode, { contentType: 'site' }>) {
  if (isLeafNode(node)) {
    return true;
  }
  return isContainerNode(node) && node.subtype === 'container';
}

function findSiblingSectionIndex(
  document: DocumentModel,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
) {
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

function isSiteSectionRole(subtype: ContainerSubtype) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

function canParentNode(parent: DocumentNode, child: DocumentNode): boolean {
  if (!isContainerNode(parent)) {
    return false;
  }

  if (isLeafNode(child)) {
    return true;
  }

  if (!isContainerNode(child)) {
    return false;
  }

  if (child.subtype !== 'container') {
    return false;
  }

  if (parent.subtype === 'container') {
    return true;
  }

  return isSiteSectionRole(parent.subtype);
}

function isDescendant(document: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  if (candidateId === targetAncestorId) {
    return true;
  }

  let current: DocumentNode | undefined = document.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

export function reparentNode(
  state: EditorState,
  nodeId: NodeId,
  parentId: NodeId,
  x: string,
  y: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  const nextParent = document.nodes[parentId];

  if (!node || !nextParent || node.contentType === 'site' || !isContainerNode(nextParent)) {
    return state;
  }

  if (parentId === nodeId) {
    return state;
  }

  if (node.parentId === null || node.parentId === parentId) {
    return moveNode(state, nodeId, { x, y });
  }

  if (!canParentNode(nextParent, node)) {
    return state;
  }

  if (isDescendant(document, parentId, nodeId)) {
    return state;
  }

  const previousParent = document.nodes[node.parentId];
  previousParent.children = previousParent.children.filter((childId) => childId !== nodeId);
  nextParent.children.push(nodeId);
  node.parentId = parentId;
  node.rect.x.base = parseUnitValue(x);
  node.rect.y.base = parseUnitValue(y);

  return { ...state, document };
}

export function reparentNodes(
  state: EditorState,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  parentId: NodeId,
): EditorState {
  if (moves.length === 0) {
    return state;
  }

  const document = cloneDocument(state.document);
  const nextParent = document.nodes[parentId];
  if (!nextParent || !isContainerNode(nextParent)) {
    return state;
  }

  const moveMap = new Map(moves.map((move) => [move.id, move]));
  const nodes = moves.map((move) => document.nodes[move.id]);
  if (nodes.some((node) => !node || node.contentType === 'site')) {
    return state;
  }

  const sourceParentId = nodes[0]?.parentId ?? null;
  if (!sourceParentId || nodes.some((node) => node?.parentId !== sourceParentId)) {
    return state;
  }
  if (sourceParentId === parentId) {
    return moveNodes(state, moves);
  }

  for (const node of nodes) {
    if (!node || !canParentNode(nextParent, node)) {
      return state;
    }
    if (parentId === node.id || isDescendant(document, parentId, node.id)) {
      return state;
    }
  }

  const sourceParent = document.nodes[sourceParentId];
  if (!sourceParent) {
    return state;
  }

  const movedIds = sourceParent.children.filter((childId) => moveMap.has(childId));
  sourceParent.children = sourceParent.children.filter((childId) => !moveMap.has(childId));
  nextParent.children.push(...movedIds);

  for (const nodeId of movedIds) {
    const node = document.nodes[nodeId];
    const move = moveMap.get(nodeId);
    if (!node || !move || node.contentType === 'site') {
      continue;
    }
    node.parentId = parentId;
    node.rect.x.base = parseUnitValue(move.x);
    node.rect.y.base = parseUnitValue(move.y);
  }

  return { ...state, document };
}

export function moveNodeInTree(
  state: EditorState,
  nodeId: NodeId,
  targetParentId: NodeId,
  targetIndex: number,
): EditorState {
  const document = moveNodeInTreeDoc(state.document, nodeId, targetParentId, targetIndex);
  if (document === state.document) {
    return state;
  }

  return {
    ...applySelectionToDocument(state, document),
    pendingRoleSwap: null,
  };
}

export function requestPromoteWrapperRole(
  state: EditorState,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
): EditorState {
  const document = state.document;
  for (const node of Object.values(document.nodes)) {
    if (isContainerNode(node) && node.subtype === targetRole && node.id !== wrapperId) {
      return {
        ...state,
        pendingRoleSwap: {
          requestedId: wrapperId,
          targetRole,
          existingId: node.id,
        },
      };
    }
  }
  return applyPromoteWrapperRole(state, wrapperId, targetRole, false);
}

export function confirmPromoteWrapperRole(state: EditorState): EditorState {
  const pending = state.pendingRoleSwap;
  if (!pending) {
    return state;
  }
  const next = applyPromoteWrapperRole(
    { ...state, pendingRoleSwap: null },
    pending.requestedId,
    pending.targetRole,
    true,
  );
  return { ...next, pendingRoleSwap: null };
}

export function cancelPromoteWrapperRole(state: EditorState): EditorState {
  return { ...state, pendingRoleSwap: null };
}

function applyPromoteWrapperRole(
  state: EditorState,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
  replaceExisting: boolean,
): EditorState {
  const document = cloneDocument(state.document);
  const wrapper = assertWrapper(document.nodes[wrapperId]);
  for (const node of Object.values(document.nodes)) {
    if (
      isContainerNode(node) &&
      node.subtype === targetRole &&
      node.id !== wrapperId &&
      replaceExisting
    ) {
      node.subtype = 'section';
    }
  }
  wrapper.subtype = targetRole;
  moveWrapperToRoot(document, wrapper.id, targetRole);
  return { ...state, document };
}

function moveWrapperToRoot(
  document: DocumentModel,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
) {
  const wrapper = document.nodes[wrapperId];
  const root = document.nodes[document.rootId];
  if (!wrapper || !isContainerNode(wrapper) || root.contentType !== 'site') {
    return;
  }

  if (wrapper.parentId && wrapper.parentId !== root.id) {
    const previousParent = document.nodes[wrapper.parentId];
    if (previousParent) {
      previousParent.children = previousParent.children.filter((childId) => childId !== wrapper.id);
    }
  }

  root.children = root.children.filter((childId) => childId !== wrapper.id);
  if (targetRole === 'header') {
    root.children.unshift(wrapper.id);
  } else {
    root.children.push(wrapper.id);
  }
  wrapper.parentId = root.id;
}

export function demoteWrapperRole(state: EditorState, wrapperId: NodeId): EditorState {
  const document = cloneDocument(state.document);
  const wrapper = assertWrapper(document.nodes[wrapperId]);
  wrapper.subtype = 'section';
  return { ...state, document };
}
