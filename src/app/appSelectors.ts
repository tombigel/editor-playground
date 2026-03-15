import { getNode, type EditorState, type NodeId } from '../api/editorApi';

export function selectedNodeHasTopEdge(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || node.type === 'site') {
    return false;
  }
  return node.sticky?.edges.top ?? !node.sticky?.edges.bottom;
}

export function selectedNodeHasBottomEdge(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || node.type === 'site') {
    return false;
  }
  return node.sticky?.edges.bottom ?? false;
}

export function selectedNodeDisallowsContentWrapperTarget(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  return Boolean(node && node.type === 'wrapper' && node.role === 'container');
}

export function getNodeOrderState(
  state: EditorState,
  node: ReturnType<typeof getNode>,
) {
  if (!node || node.type === 'site' || node.parentId === null) {
    return { show: false, canBack: false, canForward: false };
  }

  const isReorderable = node.type === 'leaf' || (node.type === 'wrapper' && node.role === 'container');
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
  if (!node || node.type !== 'wrapper' || node.role !== 'section' || node.parentId !== state.document.rootId) {
    return { canBack: false, canForward: false };
  }

  const root = state.document.nodes[state.document.rootId];
  if (!root || root.type !== 'site') {
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
    if (candidate?.type === 'wrapper' && candidate.role === 'section') {
      return index;
    }
    index += direction;
  }
  return -1;
}
