import type { ButtonLeaf, DocumentModel, DocumentNode, LinkLeaf, LinkKind, NodeId, WrapperNode } from './types';

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
  return Boolean(
    node &&
    node.type === 'leaf' &&
    (node.role === 'link' || node.role === 'button') &&
    node.linkType === 'anchor' &&
    node.anchorTargetId &&
    !isValidSectionAnchorTarget(document, node.anchorTargetId),
  );
}

export function getLinkHref(
  node: Pick<LinkLeaf, 'linkType' | 'anchorTargetId' | 'href'> | Pick<ButtonLeaf, 'linkType' | 'anchorTargetId' | 'href'>,
): string | undefined {
  if (node.linkType === 'anchor') {
    return node.href || (node.anchorTargetId ? `#${node.anchorTargetId}` : undefined);
  }
  return node.href;
}

export function shouldOpenNavigationInNewTab(
  node:
    | Pick<ButtonLeaf, 'role' | 'linkType' | 'openInNewTab'>
    | Pick<LinkLeaf, 'role' | 'linkType' | 'openInNewTab'>,
): boolean {
  if (node.linkType === 'anchor') {
    return false;
  }
  return Boolean(node.openInNewTab);
}

export function normalizeNavigationKind(value: string | undefined): LinkKind {
  return value === 'anchor' ? 'anchor' : 'external';
}
