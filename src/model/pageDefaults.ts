import { nextId } from './defaultFactories';
import type { DocumentPage, SiteSettings } from './types/site';

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
  return {
    type: 'page',
    id,
    slug: options?.slug ?? generateSlug(displayName),
    displayName,
    sectionIds: options?.sectionIds ?? [],
    parentPageId: options?.parentPageId,
    slugAliases: options?.slugAliases,
    lang: options?.lang,
    visible: options?.visible ?? true,
    viewTransition: options?.viewTransition,
  };
}
