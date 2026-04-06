import type { ContainerNode, DocumentModel, DocumentNode, LinkExtension, LinkKind, NodeId } from './types';
import { isContainerNode, isLeafNode } from './types';
import { resolvePageUrl } from './pageRoutes';

export type SectionAnchorOption = {
  id: NodeId;
  name: string;
  href: string;
  label: string;
  detail?: string;
};

export function getSectionAnchorOptions(document: DocumentModel): SectionAnchorOption[] {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return [];
  }

  return root.children
    .map((nodeId) => document.nodes[nodeId])
    .filter((node): node is ContainerNode => (
      Boolean(node) &&
      isContainerNode(node) &&
      node.parentId === document.rootId &&
      (node.subtype === 'header' || node.subtype === 'section' || node.subtype === 'footer')
    ))
    .map((section) => {
      const name = section.subtype === 'header' ? 'Top' : section.subtype === 'footer' ? 'Bottom' : section.name;
      return {
        id: section.id,
        name,
        href: section.subtype === 'header' ? '#' : `#${section.id}`,
        label: name,
        detail: section.subtype === 'section' ? `#${section.id}` : undefined,
      };
    });
}

export function isValidSectionAnchorTarget(document: DocumentModel, targetId: NodeId | undefined): boolean {
  if (!targetId) {
    return false;
  }
  const target = document.nodes[targetId];
  return Boolean(
    target &&
    isContainerNode(target) &&
    target.parentId === document.rootId &&
    (target.subtype === 'header' || target.subtype === 'section' || target.subtype === 'footer'),
  );
}

export function isBrokenAnchorLink(document: DocumentModel, node: DocumentNode | null | undefined): boolean {
  if (!node || !isLeafNode(node) || !node.link) {
    return false;
  }

  if (node.link.linkType === 'anchor') {
    return Boolean(node.link.anchorTargetId && !isValidSectionAnchorTarget(document, node.link.anchorTargetId));
  }

  if (node.link.linkType === 'page') {
    const pages = document.pages ?? [];
    return !pages.find((p) => p.id === node.link?.targetPageId);
  }

  return false;
}

export function getLinkHref(
  node: Pick<LinkExtension, 'linkType' | 'anchorTargetId' | 'href' | 'targetPageId' | 'pageAnchorId'>,
  document?: DocumentModel,
): string | undefined {
  if (node.linkType === 'anchor') {
    return node.href || (node.anchorTargetId ? `#${node.anchorTargetId}` : undefined);
  }
  if (node.linkType === 'page') {
    if (!document || !node.targetPageId) {
      return '';
    }
    const pages = document.pages ?? [];
    const targetPage = pages.find((p) => p.id === node.targetPageId);
    if (!targetPage) {
      return '';
    }
    const pageUrl = resolvePageUrl(document, node.targetPageId);
    return pageUrl + (node.pageAnchorId ? `#${node.pageAnchorId}` : '');
  }
  return node.href;
}

export function shouldOpenNavigationInNewTab(
  node: Pick<LinkExtension, 'linkType' | 'openInNewTab'>,
): boolean {
  if (node.linkType === 'anchor' || node.linkType === 'page') {
    return false;
  }
  return Boolean(node.openInNewTab);
}

export function normalizeNavigationKind(value: string | undefined): LinkKind {
  if (value === 'anchor') return 'anchor';
  if (value === 'page') return 'page';
  return 'external';
}
