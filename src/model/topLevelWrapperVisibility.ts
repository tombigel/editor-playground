import type {
  ContainerNode,
  DocumentModel,
  NodeId,
  TopLevelWrapperVisibilityMode,
  TopLevelWrapperVisibilityState,
} from './types';
import { isContainerNode } from './types';
import type { PageId } from './types/site';

export type { TopLevelWrapperVisibilityMode, TopLevelWrapperVisibilityState };

export function isEligibleTopLevelWrapper(node: ContainerNode | undefined): node is ContainerNode {
  return Boolean(
    node &&
      isContainerNode(node) &&
      (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer') &&
      node.parentId !== null,
  );
}

export function normalizeTopLevelWrapperTargetPageIds(
  document: DocumentModel,
  pageIds: PageId[] | undefined,
): PageId[] {
  const validPageIds = new Set((document.pages ?? []).map((page) => page.id));
  const normalized: PageId[] = [];
  const seen = new Set<PageId>();

  for (const pageId of pageIds ?? []) {
    if (!validPageIds.has(pageId) || seen.has(pageId)) {
      continue;
    }
    seen.add(pageId);
    normalized.push(pageId);
  }

  return normalized;
}

export function getTopLevelWrapperVisibilityState(
  document: DocumentModel,
  nodeId: NodeId,
): TopLevelWrapperVisibilityState {
  const node = document.nodes[nodeId];
  const wrapper = node as ContainerNode | undefined;
  if (!isEligibleTopLevelWrapper(wrapper) || wrapper.parentId !== document.rootId) {
    return { mode: 'hidden', pageIds: [] };
  }

  const pageIds = normalizeTopLevelWrapperTargetPageIds(document, wrapper.pageTargetIds);
  if (!wrapper.visible) {
    return { mode: 'hidden', pageIds };
  }
  if (pageIds.length > 0) {
    return { mode: 'customPages', pageIds };
  }
  if (document.sharedRegionIds?.includes(nodeId)) {
    return { mode: 'allPages', pageIds: [] };
  }
  return { mode: 'currentPage', pageIds: [] };
}

export function isTopLevelWrapperVisibleOnPage(
  document: DocumentModel,
  nodeId: NodeId,
  pageId: PageId,
): boolean {
  const node = document.nodes[nodeId];
  const wrapper = node as ContainerNode | undefined;
  if (
    !isEligibleTopLevelWrapper(wrapper) ||
    wrapper.parentId !== document.rootId ||
    !wrapper.visible
  ) {
    return false;
  }

  if (document.sharedRegionIds?.includes(nodeId)) {
    return true;
  }

  const page = document.pages?.find((entry) => entry.id === pageId);
  if (!page) {
    return false;
  }

  if (page.sectionIds.includes(nodeId)) {
    return true;
  }

  return normalizeTopLevelWrapperTargetPageIds(document, wrapper.pageTargetIds).includes(pageId);
}
