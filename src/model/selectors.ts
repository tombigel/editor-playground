import type { ContainerNode, DocumentModel, DocumentNode, NodeId } from './types';
import { isContainerNode } from './types';

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
