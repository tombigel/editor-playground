import { nextId } from './defaultFactories';
import type { DocumentPage, PageRole, SiteSettings } from './types/site';

export function createInitialSiteSettings(): SiteSettings {
  return {
    lang: 'en-US',
    status: 'draft',
    viewTransition: 'none',
    autoSyncSlugs: true,
    outputStructure: 'directory',
  };
}

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSlug(displayName: string): string {
  return normalizeSlug(displayName);
}

export function createPage(options?: Partial<Omit<DocumentPage, 'type' | 'id'>>): DocumentPage {
  const id = nextId('page');
  const displayName = options?.displayName ?? 'New Page';
  const requestedRole = options?.pageRole;
  const requestedSlug = options?.slug ?? generateSlug(displayName);
  const pageRole: PageRole | undefined =
    requestedRole ?? (requestedSlug === '' ? 'home' : undefined);
  return {
    type: 'page',
    id,
    slug: requestedSlug,
    displayName,
    pageRole,
    sectionIds: options?.sectionIds ?? [],
    parentPageId: options?.parentPageId,
    slugAliases: options?.slugAliases,
    lang: options?.lang,
    visible: options?.visible ?? true,
    viewTransition: options?.viewTransition,
  };
}
