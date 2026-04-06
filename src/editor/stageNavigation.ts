import type { DocumentModel, NodeId } from '../model/types';
import { isSiteNode } from '../model/types';

export function getStageSelectableNodeIds(document: DocumentModel): NodeId[] {
  const root = document.nodes[document.rootId];
  if (!root || !isSiteNode(root)) {
    return [];
  }

  const ids: NodeId[] = [];

  for (const childId of root.children) {
    visitStageNode(document, childId, ids);
  }

  return ids;
}

export function getAdjacentStageSelection(
  document: DocumentModel,
  currentSelectedId: NodeId | null,
  direction: 'forward' | 'backward',
): NodeId | null {
  const ids = getStageSelectableNodeIds(document);
  if (ids.length === 0) {
    return null;
  }

  if (!currentSelectedId) {
    return direction === 'forward' ? ids[0] : ids[ids.length - 1];
  }

  const index = ids.indexOf(currentSelectedId);
  if (index === -1) {
    return direction === 'forward' ? ids[0] : ids[ids.length - 1];
  }

  const nextIndex = direction === 'forward' ? index + 1 : index - 1;
  return ids[nextIndex] ?? null;
}

function visitStageNode(document: DocumentModel, nodeId: NodeId, ids: NodeId[]) {
  const node = document.nodes[nodeId];
  if (!node || isSiteNode(node) || !node.visible) {
    return;
  }

  ids.push(node.id);

  for (const childId of node.children) {
    visitStageNode(document, childId, ids);
  }
}
