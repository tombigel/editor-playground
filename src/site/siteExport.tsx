import { renderToStaticMarkup } from 'react-dom/server';
import type { DocumentModel } from '../model/types';
import { styleRecordToCssDeclarations } from '../render/leafPresentation';
import { SiteRenderer } from './SiteRenderer';
import { buildSiteCssRules } from './siteStylePlan';
import type { SiteExportBundle, SiteExportOptions } from './types';

export type { SiteExportBundle, SiteExportOptions } from './types';

const DEFAULT_SITE_TITLE = 'Sticky Playground Site';
export const DEFAULT_SITE_HTML_FILE_NAME = 'sticky-playground-site.html';
export const DEFAULT_SITE_CSS_FILE_NAME = 'sticky-playground-site.css';

export function renderSiteBodyHtml(
  document: DocumentModel,
  { previewSticky = true }: SiteExportOptions = {},
) {
  return renderToStaticMarkup(<SiteRenderer document={document} previewSticky={previewSticky} />);
}

export function renderSiteCss(
  document: DocumentModel,
  { previewSticky = true }: SiteExportOptions = {},
) {
  return `${buildSiteCssRules(document, previewSticky)
    .map((entry) => rule(entry.selector, styleRecordToCssDeclarations(entry.style)))
    .join('\n\n')}\n`;
}

export function renderSiteHtmlDocument(
  document: DocumentModel,
  options: SiteExportOptions = {},
) {
  const { title = DEFAULT_SITE_TITLE } = options;
  const { cssFileName } = resolveSiteFileNames(options);
  const bodyHtml = renderSiteBodyHtml(document, options);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    `  <link rel="stylesheet" href="${escapeHtml(cssFileName)}" />`,
    '</head>',
    '<body>',
    bodyHtml,
    '</body>',
    '</html>',
  ].join('\n');
}

export function renderSiteExportBundle(
  document: DocumentModel,
  options: SiteExportOptions = {},
): SiteExportBundle {
  const { htmlFileName, cssFileName } = resolveSiteFileNames(options);
  const bodyHtml = renderSiteBodyHtml(document, options);
  const css = renderSiteCss(document, options);
  return {
    htmlFileName,
    cssFileName,
    bodyHtml,
    css,
    htmlDocument: renderSiteHtmlDocument(document, options),
  };
}

function resolveSiteFileNames(options: SiteExportOptions) {
  const htmlFileName = normalizeExportFileName(options.htmlFileName, DEFAULT_SITE_HTML_FILE_NAME);
  const cssFileName = options.cssFileName
    ? normalizeExportFileName(options.cssFileName, DEFAULT_SITE_CSS_FILE_NAME)
    : htmlFileName.replace(/\.[a-z0-9]+$/i, '.css');

  return { htmlFileName, cssFileName };
}

function rule(selector: string, declarations: string[]) {
  if (declarations.length === 0) {
    return `${selector} {}`;
  }
  return `${selector} {\n${declarations.map((declaration) => `  ${declaration};`).join('\n')}\n}`;
}

function normalizeExportFileName(fileName: string | undefined, fallback: string) {
  const trimmed = fileName?.trim();
  if (!trimmed) {
    return fallback;
  }
  const fallbackExtension = fallback.match(/(\.[a-z0-9]+)$/i)?.[1] ?? '';
  if (!fallbackExtension) {
    return trimmed;
  }
  const trimmedExtension = trimmed.match(/(\.[a-z0-9]+)$/i)?.[1];
  if (!trimmedExtension) {
    return `${trimmed}${fallbackExtension}`;
  }
  if (trimmedExtension.toLowerCase() === fallbackExtension.toLowerCase()) {
    return trimmed;
  }
  return `${trimmed.slice(0, -trimmedExtension.length)}${fallbackExtension}`;
}

function escapeHtml(input: string) {
  return input
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;');
}
