import type { DocumentModel } from './types';
import type { DocumentPage, PageId } from './types/site';

export type PageRouteKind = 'canonical' | 'manual-alias' | 'system-alias';

export type PageRoute = {
  pageId: PageId;
  url: string;
  kind: PageRouteKind;
  redirectTo?: string;
};

export function getPageRole(page: DocumentPage): 'default' | 'home' {
  return page.pageRole === 'home' || page.slug === '' ? 'home' : 'default';
}

export function getHomePage(document: DocumentModel): DocumentPage | null {
  return (document.pages ?? []).find((page) => getPageRole(page) === 'home') ?? null;
}

export function resolvePageHierarchyUrl(document: DocumentModel, pageId: PageId): string {
  const pages = document.pages ?? [];
  const slugs: string[] = [];

  let currentId: PageId | undefined = pageId;
  const visited = new Set<PageId>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const page = pages.find((candidate) => candidate.id === currentId);
    if (!page) {
      break;
    }
    if (page.slug) {
      slugs.unshift(page.slug);
    }
    currentId = page.parentPageId;
  }

  if (slugs.length === 0) {
    return '/';
  }
  return `/${slugs.join('/')}/`;
}

export function resolvePageUrl(document: DocumentModel, pageId: PageId): string {
  const page = (document.pages ?? []).find((candidate) => candidate.id === pageId);
  if (!page) {
    return '/';
  }
  return getPageRole(page) === 'home' ? '/' : resolvePageHierarchyUrl(document, pageId);
}

export function resolvePageSystemAliasUrl(document: DocumentModel, pageId: PageId): string | null {
  const page = (document.pages ?? []).find((candidate) => candidate.id === pageId);
  if (!page || getPageRole(page) !== 'home') {
    return null;
  }

  const hierarchyUrl = resolvePageHierarchyUrl(document, pageId);
  return hierarchyUrl === '/' ? null : hierarchyUrl;
}

export function resolvePageManualAliasUrls(document: DocumentModel, pageId: PageId): string[] {
  const pages = document.pages ?? [];
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    return [];
  }

  const parentUrl =
    page.parentPageId ? resolvePageHierarchyUrl(document, page.parentPageId) : '/';

  return (page.slugAliases ?? []).map((alias) =>
    parentUrl === '/' ? `/${alias}/` : `${parentUrl}${alias}/`,
  );
}

export function getPageRoutes(document: DocumentModel, pageId: PageId): PageRoute[] {
  const canonicalUrl = resolvePageUrl(document, pageId);
  const routes: PageRoute[] = [{ pageId, url: canonicalUrl, kind: 'canonical' }];
  const seen = new Set<string>([canonicalUrl]);

  const systemAliasUrl = resolvePageSystemAliasUrl(document, pageId);
  if (systemAliasUrl && !seen.has(systemAliasUrl)) {
    routes.push({
      pageId,
      url: systemAliasUrl,
      kind: 'system-alias',
      redirectTo: canonicalUrl,
    });
    seen.add(systemAliasUrl);
  }

  for (const aliasUrl of resolvePageManualAliasUrls(document, pageId)) {
    if (seen.has(aliasUrl)) {
      continue;
    }
    routes.push({
      pageId,
      url: aliasUrl,
      kind: 'manual-alias',
      redirectTo: canonicalUrl,
    });
    seen.add(aliasUrl);
  }

  return routes;
}

export function getAllPageRoutes(document: DocumentModel): PageRoute[] {
  return (document.pages ?? []).flatMap((page) => getPageRoutes(document, page.id));
}
