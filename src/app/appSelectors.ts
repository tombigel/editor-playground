import { getNode, type EditorState, type NodeId } from '../api/editorApi';
import { isContainerNode, isLeafNode, isSiteNode } from '../model/types';

export function selectedNodeHasTopEdge(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || isSiteNode(node)) {
    return false;
  }
  return node.sticky?.edges.top ?? !node.sticky?.edges.bottom;
}

export function selectedNodeHasBottomEdge(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || isSiteNode(node)) {
    return false;
  }
  return node.sticky?.edges.bottom ?? false;
}

export function selectedNodeDisallowsContentWrapperTarget(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  return Boolean(node && isContainerNode(node) && node.subtype === 'container');
}

export function getNodeOrderState(
  state: EditorState,
  node: ReturnType<typeof getNode>,
) {
  const selectedIds = state.selectedIds ?? (state.selectedId ? [state.selectedId] : []);

  if (selectedIds.length > 1) {
    const selectedNodes = selectedIds
      .map((selectedId) => state.document.nodes[selectedId])
      .filter(Boolean);
    if (
      selectedNodes.length !== selectedIds.length ||
      selectedNodes.some((selectedNode) => isContainerNode(selectedNode) && selectedNode.subtype === 'section')
    ) {
      return { show: false, canBack: false, canForward: false };
    }

    const parentId = selectedNodes[0]?.parentId;
    if (
      !parentId ||
      selectedNodes.some(
        (selectedNode) =>
          isSiteNode(selectedNode) ||
          selectedNode.parentId !== parentId ||
          (isContainerNode(selectedNode) && selectedNode.subtype !== 'container'),
      )
    ) {
      return { show: false, canBack: false, canForward: false };
    }

    const parent = state.document.nodes[parentId];
    if (!parent) {
      return { show: false, canBack: false, canForward: false };
    }

    const selectedIdSet = new Set(selectedIds);
    const canBack = parent.children.some(
      (childId, index) => index > 0 && selectedIdSet.has(childId) && !selectedIdSet.has(parent.children[index - 1]),
    );
    const canForward = parent.children.some(
      (childId, index) =>
        index < parent.children.length - 1 &&
        selectedIdSet.has(childId) &&
        !selectedIdSet.has(parent.children[index + 1]),
    );

    return {
      show: true,
      canBack,
      canForward,
    };
  }

  if (!node || isSiteNode(node) || node.parentId === null) {
    return { show: false, canBack: false, canForward: false };
  }

  const isReorderable = isLeafNode(node) || (isContainerNode(node) && node.subtype === 'container');
  if (!isReorderable) {
    return { show: false, canBack: false, canForward: false };
  }

  const parent = state.document.nodes[node.parentId];
  if (!parent) {
    return { show: false, canBack: false, canForward: false };
  }

  const index = parent.children.indexOf(node.id);
  if (index === -1) {
    return { show: false, canBack: false, canForward: false };
  }

  return {
    show: true,
    canBack: index > 0,
    canForward: index < parent.children.length - 1,
  };
}

export function getSectionOrderState(
  state: EditorState,
  node: ReturnType<typeof getNode>,
) {
  const selectedIds = state.selectedIds ?? (state.selectedId ? [state.selectedId] : []);

  if (selectedIds.length > 1) {
    return { canBack: false, canForward: false };
  }

  if (!node || !isContainerNode(node) || node.subtype !== 'section' || node.parentId !== state.document.rootId) {
    return { canBack: false, canForward: false };
  }

  const root = state.document.nodes[state.document.rootId];
  if (!root || root.contentType !== 'site') {
    return { canBack: false, canForward: false };
  }

  const index = root.children.indexOf(node.id);
  if (index === -1) {
    return { canBack: false, canForward: false };
  }

  return {
    canBack: findSectionSiblingIndex(state, root.children, index, -1) !== -1,
    canForward: findSectionSiblingIndex(state, root.children, index, 1) !== -1,
  };
}

function findSectionSiblingIndex(
  state: EditorState,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
) {
  let index = fromIndex + direction;
  while (index >= 0 && index < siblingIds.length) {
    const candidate = state.document.nodes[siblingIds[index]];
    if (candidate && isContainerNode(candidate) && candidate.subtype === 'section') {
      return index;
    }
    index += direction;
  }
  return -1;
}
