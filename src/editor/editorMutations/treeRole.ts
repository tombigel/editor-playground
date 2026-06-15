import type { DocumentModel, DocumentNode, NodeId } from '../../model/types';
import { isContainerNode, isLeafNode } from '../../model/types';
import { moveNodeInTreeDoc, reparentNodeAtDoc, reparentNodesAtDoc, type ParentExpansionOptions } from '../../api/documentApi';
import type { EditorState, NodeOrderAction } from '../types';
import { normalizeSelectedIds } from '../selection';
import { cloneDocument } from '../editorPersistence';
import { applySelectionToDocument, assertWrapper } from './shared';

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

export function reparentNode(
  state: EditorState,
  nodeId: NodeId,
  parentId: NodeId,
  x: string,
  y: string,
  options: ParentExpansionOptions = {},
): EditorState {
  const document = reparentNodeAtDoc(state.document, nodeId, parentId, { x, y }, options);
  return document === state.document ? state : { ...state, document };
}

export function reparentNodes(
  state: EditorState,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  parentId: NodeId,
  options: ParentExpansionOptions = {},
): EditorState {
  const document = reparentNodesAtDoc(state.document, parentId, moves, options);
  return document === state.document ? state : { ...state, document };
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
