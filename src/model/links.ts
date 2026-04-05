import type { ButtonLeaf, DocumentModel, DocumentNode, LinkLeaf, LinkKind, NodeId, WrapperNode } from './types';
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
  if (!root || root.type !== 'site') {
    return [];
  }

  return root.children
    .map((nodeId) => document.nodes[nodeId])
    .filter((node): node is WrapperNode => (
      Boolean(node) &&
      node.type === 'wrapper' &&
      node.parentId === document.rootId &&
      (node.role === 'header' || node.role === 'section' || node.role === 'footer')
    ))
    .map((section) => {
      const name = section.role === 'header' ? 'Top' : section.role === 'footer' ? 'Bottom' : section.name;
      return {
        id: section.id,
        name,
        href: section.role === 'header' ? '#' : `#${section.id}`,
        label: name,
        detail: section.role === 'section' ? `#${section.id}` : undefined,
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
    target.type === 'wrapper' &&
    target.parentId === document.rootId &&
    (target.role === 'header' || target.role === 'section' || target.role === 'footer'),
  );
}

export function isBrokenAnchorLink(document: DocumentModel, node: DocumentNode | null | undefined): boolean {
  if (!node || node.type !== 'leaf' || (node.role !== 'link' && node.role !== 'button')) {
    return false;
  }

  if (node.linkType === 'anchor') {
    return Boolean(node.anchorTargetId && !isValidSectionAnchorTarget(document, node.anchorTargetId));
  }

  if (node.linkType === 'page') {
    const pages = document.pages ?? [];
    return !pages.find((p) => p.id === node.targetPageId);
  }

  return false;
}

export function getLinkHref(
  node: Pick<LinkLeaf, 'linkType' | 'anchorTargetId' | 'href' | 'targetPageId' | 'pageAnchorId'> | Pick<ButtonLeaf, 'linkType' | 'anchorTargetId' | 'href' | 'targetPageId' | 'pageAnchorId'>,
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
  node:
    | Pick<ButtonLeaf, 'role' | 'linkType' | 'openInNewTab'>
    | Pick<LinkLeaf, 'role' | 'linkType' | 'openInNewTab'>,
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
