import type { ContainerNode, DocumentModel, DocumentNode, NodeId } from './types';
import { isContainerNode } from './types';
import type { PageId } from './types/site';
import { isTopLevelWrapperVisibleOnPage } from './topLevelWrapperVisibility';

export function getNode(document: DocumentModel, id: NodeId | null): DocumentNode | null {
  if (!id) {
    return null;
  }
  return document.nodes[id] ?? null;
}

export function getChildren(document: DocumentModel, id: NodeId): DocumentNode[] {
  const node = document.nodes[id];
  return node.children.map((childId) => document.nodes[childId]).filter(Boolean);
}

export function getRootChildren(document: DocumentModel) {
  return getChildren(document, document.rootId);
}

export function getSiteSection(
  document: DocumentModel,
  subtype: 'header' | 'footer',
): ContainerNode | null {
  for (const node of Object.values(document.nodes)) {
    if (isContainerNode(node) && node.subtype === subtype) {
      return node;
    }
  }
  return null;
}

export function getMainWrappers(document: DocumentModel): ContainerNode[] {
  return Object.values(document.nodes).filter(
    (node): node is ContainerNode =>
      isContainerNode(node) && node.subtype === 'section' && node.parentId === document.rootId,
  );
}

export function isNodeActuallyHidden(node: DocumentNode | null | undefined) {
  return Boolean(node && node.contentType !== 'site' && !node.visible);
}

export function isNodeEffectivelyHidden(document: DocumentModel, nodeId: NodeId) {
  let current = document.nodes[nodeId];
  while (current) {
    if (isNodeActuallyHidden(current)) {
      return true;
    }
    if (!current.parentId) {
      break;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

export function collectHiddenSelectionScope(
  document: DocumentModel,
  selectedIds: NodeId[],
) {
  const scope = new Set<NodeId>();

  for (const selectedId of selectedIds) {
    if (!isNodeEffectivelyHidden(document, selectedId)) {
      continue;
    }

    let current = document.nodes[selectedId];
    while (current && current.contentType !== 'site') {
      if (!isNodeEffectivelyHidden(document, current.id)) {
        break;
      }
      scope.add(current.id);
      if (!current.parentId) {
        break;
      }
      current = document.nodes[current.parentId];
    }

    collectHiddenDescendants(document, selectedId, scope);
  }

  return scope;
}

export function getEditorStageRootWrappers(
  document: DocumentModel,
  pageId?: PageId | null,
) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return [];
  }

  return root.children
    .map((childId) => document.nodes[childId])
    .filter(
      (node): node is ContainerNode =>
        Boolean(node) &&
        isContainerNode(node) &&
        (isNodeActuallyHidden(node) ||
          pageId == null ||
          !document.pages ||
          isTopLevelWrapperVisibleOnPage(document, node.id, pageId)),
    );
}

function collectHiddenDescendants(
  document: DocumentModel,
  nodeId: NodeId,
  scope: Set<NodeId>,
) {
  const node = document.nodes[nodeId];
  if (!node) {
    return;
  }

  for (const childId of node.children) {
    if (isNodeEffectivelyHidden(document, childId)) {
      scope.add(childId);
    }
    collectHiddenDescendants(document, childId, scope);
  }
}
