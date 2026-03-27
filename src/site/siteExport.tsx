import { renderToStaticMarkup } from 'react-dom/server';
import { buildDocumentInteractConfig } from '../animations/animationApi';
import { buildDocumentGoogleFontsStylesheetHref } from '../fonts';
import type { DocumentModel } from '../model/types';
import { styleRecordToCssDeclarations } from '../render/leafPresentation';
import { SiteRenderer } from './SiteRenderer';
import { buildSiteCssRules } from './siteStylePlan';
import type { SiteExportBundle, SiteExportOptions } from './types';

export type { SiteExportBundle, SiteExportOptions } from './types';

const DEFAULT_SITE_TITLE = 'Sticky Playground Site';
export const DEFAULT_SITE_HTML_FILE_NAME = 'sticky-playground-site.html';
export const DEFAULT_SITE_CSS_FILE_NAME = 'sticky-playground-site.css';

const INTERACT_CDN_URL = 'https://unpkg.com/@wix/interact@2.1.4/dist/es/web.js';
const MOTION_PRESETS_CDN_URL = 'https://unpkg.com/@wix/motion-presets@1.0.0/dist/es/motion-presets.js';

export function renderSiteBodyHtml(
  document: DocumentModel,
  { previewSticky = true, includeAnimations = true }: SiteExportOptions = {},
) {
  return renderToStaticMarkup(
    <SiteRenderer document={document} previewSticky={previewSticky} includeAnimations={includeAnimations} />,
  );
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
  const { title = DEFAULT_SITE_TITLE, includeAnimations = true } = options;
  const { cssFileName } = resolveSiteFileNames(options);
  const bodyHtml = renderSiteBodyHtml(document, options);
  const fontHref = buildDocumentGoogleFontsStylesheetHref(document);

  const interactConfig = includeAnimations ? buildDocumentInteractConfig(document) : null;
  const hasAnimations = interactConfig && interactConfig.interactions.length > 0;

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    ...(fontHref
      ? [
          '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
          '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
          `  <link rel="stylesheet" href="${escapeHtml(fontHref)}" />`,
        ]
      : []),
    `  <link rel="stylesheet" href="${escapeHtml(cssFileName)}" />`,
    '</head>',
    '<body>',
    bodyHtml,
    ...(hasAnimations
      ? [
          `<script type="module">`,
          `import { Interact } from '${INTERACT_CDN_URL}';`,
          `import * as presets from '${MOTION_PRESETS_CDN_URL}';`,
          `Interact.registerEffects(presets);`,
          `Interact.create(${JSON.stringify(interactConfig)});`,
          `</script>`,
        ]
      : []),
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
