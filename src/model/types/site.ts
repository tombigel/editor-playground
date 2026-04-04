import type { NodeId } from './index';

export type PageId = string;

export type DocumentPage = {
  type: 'page';
  id: PageId;
  slug: string;
  displayName: string;
  sectionIds: NodeId[];
  parentPageId?: PageId;
  slugAliases?: string[];
  lang?: string;
  visible: boolean;
  viewTransition?: 'none' | 'crossfade' | 'slide';
};

export type SiteSettings = {
  lang: string;
  status: 'draft' | 'published';
  viewTransition: 'none' | 'crossfade' | 'slide';
  title?: string;
  autoSyncSlugs?: boolean;
  outputStructure?: 'directory' | 'flat';
};
