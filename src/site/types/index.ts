import type { DocumentModel } from '../../model/types';

export type SiteRendererProps = {
  document: DocumentModel;
  previewSticky?: boolean;
  includeAnimations?: boolean;
};

export type SiteExportOptions = {
  previewSticky?: boolean;
  includeAnimations?: boolean;
  title?: string;
  htmlFileName?: string;
  cssFileName?: string;
};

export type SiteExportBundle = {
  htmlFileName: string;
  cssFileName: string;
  bodyHtml: string;
  css: string;
  htmlDocument: string;
};
