export type SiteExportOptions = {
  previewSticky?: boolean;
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
