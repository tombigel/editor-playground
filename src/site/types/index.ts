import type { DocumentModel } from '../../model/types';
import type { PageId } from '../../model/types/site';

export type SiteRendererProps = {
  document: DocumentModel;
  previewSticky?: boolean;
  includeAnimations?: boolean;
  pageId?: PageId;
};

export type SiteExportOptions = {
  previewSticky?: boolean;
  includeAnimations?: boolean;
  title?: string;
  htmlFileName?: string;
  cssFileName?: string;
  pageId?: PageId;
  outputStructure?: 'directory' | 'flat';
};

export type SiteExportBundle = {
  htmlFileName: string;
  cssFileName: string;
  bodyHtml: string;
  css: string;
  htmlDocument: string;
};

export type SitePageExportBundle = {
  path: string;
  bodyHtml: string;
  css: string;
  htmlDocument: string;
};

export type RouteManifest = {
  routes: Array<{
    pageId: PageId;
    slug: string;
    url: string;
    filePath: string;
  }>;
};
