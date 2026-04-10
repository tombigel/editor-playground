import type { DocumentModel, NodeId } from '../model/types';
import type { PageId } from '../model/types/site';
import { isSiteNode } from '../model/types';
import {
  collectHiddenSelectionScope,
  getEditorStageRootWrappers,
  isNodeEffectivelyHidden,
} from '../model/selectors';

type StageSelectableOptions = {
  activePageId?: PageId | null;
  showHidden?: boolean;
  selectedIds?: NodeId[];
};

export function getStageSelectableNodeIds(
  document: DocumentModel,
  options: StageSelectableOptions = {},
): NodeId[] {
  const ghostVisibleIds =
    options.showHidden === false
      ? collectHiddenSelectionScope(document, options.selectedIds ?? [])
      : new Set<NodeId>();

  const ids: NodeId[] = [];
  for (const wrapper of getEditorStageRootWrappers(document, options.activePageId)) {
    visitStageNode(document, wrapper.id, ids, options.showHidden ?? true, ghostVisibleIds);
  }

  return ids;
}

export function getAdjacentStageSelection(
  document: DocumentModel,
  currentSelectedId: NodeId | null,
  direction: 'forward' | 'backward',
  options: StageSelectableOptions = {},
): NodeId | null {
  const ids = getStageSelectableNodeIds(document, options);
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

function visitStageNode(
  document: DocumentModel,
  nodeId: NodeId,
  ids: NodeId[],
  showHidden: boolean,
  ghostVisibleIds: ReadonlySet<NodeId>,
) {
  const node = document.nodes[nodeId];
  if (!node || isSiteNode(node)) {
    return;
  }

  const isHidden = isNodeEffectivelyHidden(document, node.id);
  if (!isHidden || showHidden || ghostVisibleIds.has(node.id)) {
    ids.push(node.id);
  }

  for (const childId of node.children) {
    visitStageNode(document, childId, ids, showHidden, ghostVisibleIds);
  }
}
