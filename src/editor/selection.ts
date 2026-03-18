import type { DocumentModel, DocumentNode, NodeId } from '../model/types';

export function normalizeSelectedIds(
  document: DocumentModel,
  selectedIds: NodeId[] | null | undefined,
  fallbackSelectedId?: NodeId | null,
) {
  const next: NodeId[] = [];
  const seen = new Set<NodeId>();

  const sourceIds =
    selectedIds && selectedIds.length > 0
      ? selectedIds
      : fallbackSelectedId
        ? [fallbackSelectedId]
        : [];

  for (const id of sourceIds) {
    if (!id || seen.has(id)) {
      continue;
    }
    const node = document.nodes[id];
    if (!node || node.type === 'site') {
      continue;
    }
    seen.add(id);
    next.push(id);
  }

  if (next.length <= 1) {
    return next;
  }

  return next.filter((id) => !isStructuralWrapperNode(document.nodes[id]));
}

export function toggleSelectedId(selectedIds: NodeId[], id: NodeId) {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((selectedId) => selectedId !== id);
  }
  return [...selectedIds, id];
}

export function toggleSelectedIds(selectedIds: NodeId[], ids: NodeId[]) {
  let next = [...selectedIds];
  for (const id of ids) {
    next = toggleSelectedId(next, id);
  }
  return next;
}

export function isNodeDescendantOf(document: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  if (candidateId === targetAncestorId) {
    return false;
  }

  let current = document.nodes[candidateId];
  while (current && current.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }

  return false;
}

export function getTopLevelSelectedIds(document: DocumentModel, selectedIds: NodeId[]) {
  const normalized = normalizeSelectedIds(document, selectedIds);
  return normalized.filter((candidateId) =>
    !normalized.some((selectedId) => selectedId !== candidateId && isNodeDescendantOf(document, candidateId, selectedId)),
  );
}

function isStructuralWrapperNode(node: DocumentNode | undefined) {
  return Boolean(
    node &&
    node.type === 'wrapper' &&
    (node.role === 'section' || node.role === 'header' || node.role === 'footer'),
  );
}
