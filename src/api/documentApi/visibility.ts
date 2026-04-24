import { normalizeTopLevelWrapperTargetPageIds } from '../../model/topLevelWrapperVisibility';
import type { PageId } from '../../model/types/site';
import type { ContainerNode, DocumentModel, NodeId } from '../../model/types';
import { isContainerNode } from '../../model/types';
import { cloneDocument } from './shared';
import type { TopLevelWrapperPlacement, TopLevelWrapperVisibility } from './types';

export function setNodeVisibilityDoc(
  document: DocumentModel,
  nodeId: NodeId,
  visible: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site' || node.visible === visible) {
    return document;
  }

  node.visible = visible;
  return next;
}

export function setPageTopLevelWrapperPlacement(
  document: DocumentModel,
  pageId: PageId,
  nodeId: NodeId,
  placement: TopLevelWrapperPlacement,
): DocumentModel {
  return setTopLevelWrapperVisibility(
    document,
    pageId,
    nodeId,
    placement === 'global' ? 'allPages' : 'currentPage',
  );
}

export function setTopLevelWrapperVisibility(
  document: DocumentModel,
  pageId: PageId,
  nodeId: NodeId,
  visibility: TopLevelWrapperVisibility,
  pageIds: PageId[] = [],
): DocumentModel {
  const root = document.nodes[document.rootId];
  const page = document.pages?.find((entry) => entry.id === pageId);
  const node = document.nodes[nodeId];
  if (!root || root.contentType !== 'site' || !page || !node || !isContainerNode(node)) {
    return document;
  }
  if (node.parentId !== document.rootId || !isEligibleTopLevelWrapper(node.subtype)) {
    return document;
  }

  const next = cloneDocument(document);
  const pages = structuredClone(document.pages ?? []);
  const sharedRegionIds = new Set(document.sharedRegionIds ?? []);
  const targetPage = pages.find((entry) => entry.id === pageId);
  const nextNode = next.nodes[nodeId];

  if (!targetPage || !isContainerNode(nextNode)) {
    return document;
  }

  let changed = false;
  const hadPageTargets = nextNode.pageTargetIds !== undefined;
  const removeFromAllPages = () => {
    for (const candidate of pages) {
      const originalLength = candidate.sectionIds.length;
      candidate.sectionIds = candidate.sectionIds.filter((sectionId) => sectionId !== nodeId);
      if (candidate.sectionIds.length !== originalLength) {
        changed = true;
      }
    }
  };

  if (visibility === 'hidden') {
    if (nextNode.visible !== false) {
      nextNode.visible = false;
      changed = true;
    }
  } else {
    if (nextNode.visible !== true) {
      nextNode.visible = true;
      changed = true;
    }

    if (visibility === 'currentPage') {
      removeFromAllPages();
      if (sharedRegionIds.delete(nodeId)) {
        changed = true;
      }
      if (hadPageTargets) {
        delete nextNode.pageTargetIds;
        changed = true;
      }
      if (!targetPage.sectionIds.includes(nodeId)) {
        targetPage.sectionIds.push(nodeId);
        changed = true;
      }
    } else if (visibility === 'allPages') {
      removeFromAllPages();
      if (hadPageTargets) {
        delete nextNode.pageTargetIds;
        changed = true;
      }
      if (!sharedRegionIds.has(nodeId)) {
        sharedRegionIds.add(nodeId);
        changed = true;
      }
    } else {
      const normalizedPageIds = normalizeTopLevelWrapperTargetPageIds(document, pageIds);
      if (normalizedPageIds.length === 0) {
        return document;
      }
      removeFromAllPages();
      if (sharedRegionIds.delete(nodeId)) {
        changed = true;
      }
      const nextTargets = nextNode.pageTargetIds ?? [];
      if (nextTargets.length !== normalizedPageIds.length || nextTargets.some((id, index) => id !== normalizedPageIds[index])) {
        nextNode.pageTargetIds = normalizedPageIds;
        changed = true;
      }
    }
  }

  if (!changed) {
    return document;
  }

  next.pages = pages;
  next.sharedRegionIds = Array.from(sharedRegionIds);
  return next;
}

function isEligibleTopLevelWrapper(subtype: ContainerNode['subtype']) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}
