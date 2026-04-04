import type { DocumentModel, NodeId, WrapperNode } from '../model/types';
import type { DocumentPage, PageId, SiteSettings } from '../model/types/site';
import { createPage, generateSlug } from '../model/pageDefaults';

export function addPage(
  document: DocumentModel,
  options?: Partial<Omit<DocumentPage, 'type' | 'id'>>,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const displayName = ensureUniquePageDisplayName(pages, options?.displayName ?? 'New Page');
  const requestedSlug = options?.slug ?? generateSlug(displayName);
  const slug = ensureUniquePageSlug(document, requestedSlug);
  const newPage = createPage({ ...options, displayName, slug });
  pages.push(newPage);
  return { ...document, pages };
}

function ensureUniquePageDisplayName(
  pages: DocumentPage[],
  requestedDisplayName: string,
): string {
  const baseName = requestedDisplayName.trim() || 'New Page';
  const existingNames = new Set(pages.map((page) => page.displayName.trim().toLowerCase()));
  if (!existingNames.has(baseName.toLowerCase())) return baseName;

  let counter = 2;
  while (existingNames.has(`${baseName} ${counter}`.toLowerCase())) {
    counter += 1;
  }
  return `${baseName} ${counter}`;
}

function ensureUniquePageSlug(document: DocumentModel, requestedSlug: string): string {
  const claimedSlugs = getClaimedPageSlugs(document);
  const baseSlug = requestedSlug.trim() || 'page';
  if (!claimedSlugs.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (claimedSlugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }
  return `${baseSlug}-${counter}`;
}

function getClaimedPageSlugs(document: DocumentModel): Set<string> {
  const claimedSlugs = new Set<string>();
  for (const page of document.pages ?? []) {
    claimedSlugs.add(page.slug);
    for (const alias of page.slugAliases ?? []) {
      claimedSlugs.add(alias);
    }
  }
  return claimedSlugs;
}

export function deletePage(document: DocumentModel, pageId: PageId): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const pageIndex = pages.findIndex((p) => p.id === pageId);
  if (pageIndex === -1) return document;

  const page = pages[pageIndex];
  const sharedRegionIds = new Set(document.sharedRegionIds ?? []);

  const ownedSectionIds = page.sectionIds.filter((id) => !sharedRegionIds.has(id));

  const nodeIdsToRemove = new Set<NodeId>();
  function collectDescendants(nodeId: NodeId) {
    if (nodeIdsToRemove.has(nodeId)) return;
    nodeIdsToRemove.add(nodeId);
    const node = document.nodes[nodeId];
    if (!node) return;
    for (const childId of node.children) {
      collectDescendants(childId);
    }
  }
  for (const sectionId of ownedSectionIds) {
    collectDescendants(sectionId);
  }

  const newNodes = { ...document.nodes };
  for (const id of nodeIdsToRemove) {
    delete newNodes[id];
  }

  const siteNode = newNodes[document.rootId];
  if (siteNode) {
    const updatedChildren = siteNode.children.filter((id) => !nodeIdsToRemove.has(id));
    newNodes[document.rootId] = { ...siteNode, children: updatedChildren };
  }

  pages.splice(pageIndex, 1);

  return { ...document, pages, nodes: newNodes };
}

export function reorderPage(
  document: DocumentModel,
  pageId: PageId,
  direction: 'back' | 'forward',
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const index = pages.findIndex((p) => p.id === pageId);
  if (index === -1) return document;

  if (direction === 'back' && index === 0) return document;
  if (direction === 'forward' && index === pages.length - 1) return document;

  const swapIndex = direction === 'back' ? index - 1 : index + 1;
  const temp = pages[index];
  pages[index] = pages[swapIndex];
  pages[swapIndex] = temp;

  return { ...document, pages };
}

export function setPageDisplayName(
  document: DocumentModel,
  pageId: PageId,
  displayName: string,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;
  page.displayName = displayName;
  return { ...document, pages };
}

export function setPageSlug(
  document: DocumentModel,
  pageId: PageId,
  slug: string,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;
  page.slug = slug;
  return { ...document, pages };
}

export function addPageSlugAlias(
  document: DocumentModel,
  pageId: PageId,
  alias: string,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;
  page.slugAliases = [...(page.slugAliases ?? []), alias];
  return { ...document, pages };
}

export function removePageSlugAlias(
  document: DocumentModel,
  pageId: PageId,
  alias: string,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;
  page.slugAliases = (page.slugAliases ?? []).filter((a) => a !== alias);
  return { ...document, pages };
}

export function setPageVisibility(
  document: DocumentModel,
  pageId: PageId,
  visible: boolean,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;
  page.visible = visible;
  return { ...document, pages };
}

export function setPageViewTransition(
  document: DocumentModel,
  pageId: PageId,
  transition: DocumentPage['viewTransition'],
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;
  page.viewTransition = transition;
  return { ...document, pages };
}

export function setPageParent(
  document: DocumentModel,
  pageId: PageId,
  newParentId: PageId | null,
): DocumentModel {
  if (newParentId !== null) {
    const pages = document.pages ?? [];
    const isAncestor = (checkId: PageId, targetId: PageId): boolean => {
      if (checkId === targetId) return true;
      const page = pages.find((p) => p.id === checkId);
      if (!page || !page.parentPageId) return false;
      return isAncestor(page.parentPageId, targetId);
    };
    if (isAncestor(newParentId, pageId)) return document;
  }

  const pages = structuredClone(document.pages ?? []);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return document;

  if (newParentId === null) {
    delete page.parentPageId;
  } else {
    page.parentPageId = newParentId;
  }

  return { ...document, pages };
}

export function setSiteSettings(
  document: DocumentModel,
  patch: Partial<SiteSettings>,
): DocumentModel {
  return {
    ...document,
    siteSettings: { ...(document.siteSettings ?? { lang: 'en', status: 'draft', viewTransition: 'none' }), ...patch },
  };
}

export function moveSectionToPage(
  document: DocumentModel,
  sectionId: NodeId,
  fromPageId: PageId,
  toPageId: PageId,
): DocumentModel {
  const pages = structuredClone(document.pages ?? []);
  const fromPage = pages.find((p) => p.id === fromPageId);
  const toPage = pages.find((p) => p.id === toPageId);
  if (!fromPage || !toPage) return document;

  const sectionIndex = fromPage.sectionIds.indexOf(sectionId);
  if (sectionIndex === -1) return document;

  fromPage.sectionIds.splice(sectionIndex, 1);
  toPage.sectionIds.push(sectionId);

  return { ...document, pages };
}

export function getPageForSection(
  document: DocumentModel,
  sectionId: NodeId,
): DocumentPage | null {
  const pages = document.pages ?? [];
  for (const page of pages) {
    if (page.sectionIds.includes(sectionId)) {
      return page;
    }
  }
  return null;
}

export function getActiveSections(
  document: DocumentModel,
  pageId: PageId,
): WrapperNode[] {
  const pages = document.pages ?? [];
  const page = pages.find((p) => p.id === pageId);
  if (!page) return [];

  const result: WrapperNode[] = [];
  for (const sectionId of page.sectionIds) {
    const node = document.nodes[sectionId];
    if (node && node.type === 'wrapper') {
      result.push(node as WrapperNode);
    }
  }
  return result;
}

export function resolvePageUrl(document: DocumentModel, pageId: PageId): string {
  const pages = document.pages ?? [];
  const slugs: string[] = [];

  let currentId: PageId | undefined = pageId;
  const visited = new Set<PageId>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const page = pages.find((p) => p.id === currentId);
    if (!page) break;
    if (page.slug !== '') {
      slugs.unshift(page.slug);
    }
    currentId = page.parentPageId;
  }

  if (slugs.length === 0) return '/';
  return '/' + slugs.join('/') + '/';
}

export function syncPageHrefLinks(
  document: DocumentModel,
  oldUrl: string,
  newUrl: string,
): DocumentModel {
  if (!oldUrl || oldUrl === '/' || oldUrl === newUrl) return document;
  const nodes = { ...document.nodes };
  let changed = false;
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type !== 'leaf') continue;
    if (node.role !== 'link' && node.role !== 'button') continue;
    if ((node as { href?: string }).href === oldUrl) {
      nodes[id] = { ...node, href: newUrl };
      changed = true;
    }
  }
  return changed ? { ...document, nodes } : document;
}

export function validatePageSlug(slug: string): string[] {
  const errors: string[] = [];
  if (slug === '') {
    errors.push('Slug cannot be empty.');
    return errors;
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug may only contain lowercase letters, digits, and hyphens.');
  }
  if (slug.startsWith('-')) {
    errors.push('Slug cannot start with a hyphen.');
  }
  if (slug.endsWith('-')) {
    errors.push('Slug cannot end with a hyphen.');
  }
  return errors;
}
