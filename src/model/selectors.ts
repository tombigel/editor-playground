import type { DocumentModel, DocumentNode, NodeId, WrapperNode } from './types';

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
  role: 'header' | 'footer',
): WrapperNode | null {
  for (const node of Object.values(document.nodes)) {
    if (node.type === 'wrapper' && node.role === role) {
      return node;
    }
  }
  return null;
}

export function getMainWrappers(document: DocumentModel): WrapperNode[] {
  return Object.values(document.nodes).filter(
    (node): node is WrapperNode =>
      node.type === 'wrapper' && node.role === 'section' && node.parentId === document.rootId,
  );
}
