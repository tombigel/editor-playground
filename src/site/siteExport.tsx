import { renderToStaticMarkup } from 'react-dom/server';
import { buildDocumentInteractConfig } from '../animations/animationApi';
import { buildInteractExportScript } from '../animations/interactIntegration';
import { buildDocumentGoogleFontsStylesheetHref } from '../fonts';
import { getAllPageRoutes } from '../model/pageRoutes';
import type { DocumentModel } from '../model/types';
import type { PageId } from '../model/types/site';
import { styleRecordToCssDeclarations } from '../render/leafPresentation';
import { SiteRenderer } from './SiteRenderer';
import { buildSiteCodeThemeCss, buildSiteCssRules, buildSiteViewTransitionCss } from './siteStylePlan';
import type { SiteExportBundle, SiteExportOptions, SitePageExportBundle, RouteManifest } from './types';

export type { SiteExportBundle, SiteExportOptions, SitePageExportBundle, RouteManifest } from './types';
export { resolvePageUrl } from '../model/pageRoutes';

const DEFAULT_SITE_TITLE = 'Sticky Playground Site';
export const DEFAULT_SITE_HTML_FILE_NAME = 'sticky-playground-site.html';
export const DEFAULT_SITE_CSS_FILE_NAME = 'sticky-playground-site.css';

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
  const rulesCss = buildSiteCssRules(document, previewSticky)
    .map((entry) => rule(entry.selector, styleRecordToCssDeclarations(entry.style)))
    .join('\n\n');
  const codeThemeCss = buildSiteCodeThemeCss();
  const viewTransitionCss = buildSiteViewTransitionCss(document);
  return `${[rulesCss, codeThemeCss, viewTransitionCss].filter(Boolean).join('\n\n')}\n`;
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

  const lang = document.siteSettings?.lang ?? 'en-US';

  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}">`,
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
    ...(hasAnimations ? [buildInteractExportScript(interactConfig)] : []),
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

export function renderPageHtmlDocument(
  document: DocumentModel,
  pageId: PageId,
  options: SiteExportOptions = {},
) {
  const { title = document.siteSettings?.title ?? DEFAULT_SITE_TITLE, includeAnimations = true } = options;
  const { cssFileName } = resolveSiteFileNames(options);
  const bodyHtml = renderToStaticMarkup(
    <SiteRenderer document={document} previewSticky={options.previewSticky ?? true} includeAnimations={includeAnimations} pageId={pageId} />,
  );
  const fontHref = buildDocumentGoogleFontsStylesheetHref(document);
  const interactConfig = includeAnimations ? buildDocumentInteractConfig(document) : null;
  const hasAnimations = interactConfig && interactConfig.interactions.length > 0;

  const page = document.pages?.find((p) => p.id === pageId);
  const lang = page?.lang ?? document.siteSettings?.lang ?? 'en-US';

  const siteViewTransition = document.siteSettings?.viewTransition;
  const pageViewTransition = page?.viewTransition;
  const effectiveViewTransition = pageViewTransition !== undefined ? pageViewTransition : siteViewTransition;
  const injectViewTransitionStyle =
    effectiveViewTransition !== undefined &&
    effectiveViewTransition !== 'none' &&
    pageViewTransition !== undefined &&
    pageViewTransition !== siteViewTransition;

  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}">`,
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
    ...(injectViewTransitionStyle
      ? [
          '  <style>',
          '    @media (prefers-reduced-motion: no-preference) {',
          '      @view-transition { navigation: auto; }',
          '    }',
          '  </style>',
        ]
      : []),
    '</head>',
    '<body>',
    bodyHtml,
    ...(hasAnimations ? [buildInteractExportScript(interactConfig)] : []),
    '</body>',
    '</html>',
  ].join('\n');
}

export function renderSiteExportBundles(
  document: DocumentModel,
  options: SiteExportOptions = {},
): SitePageExportBundle[] {
  const { outputStructure = 'directory' } = options;
  const pages = document.pages;

  if (!pages || pages.length === 0) {
    const bundle = renderSiteExportBundle(document, options);
    return [
      {
        path: 'index.html',
        bodyHtml: bundle.bodyHtml,
        css: bundle.css,
        htmlDocument: bundle.htmlDocument,
      },
    ];
  }

  const css = renderSiteCss(document, options);
  const bundles: SitePageExportBundle[] = [];
  const canonicalPageIds = new Set<string>();

  for (const route of getAllPageRoutes(document)) {
    const path = resolveFilePath(route.url, outputStructure);
    if (route.kind === 'canonical') {
      if (canonicalPageIds.has(route.pageId)) {
        continue;
      }
      canonicalPageIds.add(route.pageId);
      const bodyHtml = renderToStaticMarkup(
        <SiteRenderer
          document={document}
          previewSticky={options.previewSticky ?? true}
          includeAnimations={options.includeAnimations ?? true}
          pageId={route.pageId}
        />,
      );
      bundles.push({
        path,
        bodyHtml,
        css,
        htmlDocument: renderPageHtmlDocument(document, route.pageId, options),
        kind: 'page',
      });
      continue;
    }

    bundles.push({
      path,
      bodyHtml: '',
      css: '',
      htmlDocument: renderRedirectHtmlDocument(route.url, route.redirectTo ?? '/'),
      kind: 'redirect',
      redirectTo: route.redirectTo,
    });
  }

  return bundles;
}

export function buildHostingConfigs(document: DocumentModel, options: SiteExportOptions = {}): Record<string, string> {
  const { outputStructure = 'directory' } = options;
  const manifest = buildRouteManifest(document, options);
  const aliasRoutes = manifest.routes.filter((route) => route.kind !== 'canonical' && route.redirectTo);
  const canonicalRoutes = manifest.routes.filter((route) => route.kind === 'canonical');

  return {
    'hosting/netlify/_redirects': buildNetlifyRedirects(aliasRoutes, canonicalRoutes, outputStructure),
    'hosting/vercel/vercel.json': buildVercelConfig(aliasRoutes, canonicalRoutes, outputStructure),
    'hosting/nginx/nginx.conf': buildNginxConfig(aliasRoutes, outputStructure),
    'hosting/README.txt': HOSTING_README,
  };
}

const HOSTING_README = `Deploy configs for common hosting environments.

netlify/
  _redirects — place at the root of your Netlify site deployment.

vercel/
  vercel.json — place at the root of your Vercel project.

nginx/
  nginx.conf — use as your server block configuration.

GitHub Pages:
  No config required. The directory-structure output (about/index.html)
  is served correctly by GitHub Pages natively.
`;

function buildNetlifyRedirects(
  aliasRoutes: RouteManifest['routes'],
  canonicalRoutes: RouteManifest['routes'],
  outputStructure: 'directory' | 'flat',
): string {
  if (aliasRoutes.length === 0 && outputStructure === 'directory') {
    return [
      '# Directory-structure output.',
      '# Netlify serves index.html from subdirectories natively — no redirects required.',
      '',
    ].join('\n');
  }
  return [
    '# Redirect alias routes to canonical routes.',
    ...aliasRoutes.flatMap((route) => buildRedirectSourceVariants(route.url).map((source) => `${source}  ${route.redirectTo}  301!`)),
    ...(outputStructure === 'flat'
      ? [
          '',
          '# Flat-structure output — rewrite clean canonical URLs to .html files.',
          ...buildCanonicalRewriteRules(canonicalRoutes).map((entry) => `${entry}  200`),
        ]
      : []),
    '',
  ].join('\n');
}

function buildVercelConfig(
  aliasRoutes: RouteManifest['routes'],
  canonicalRoutes: RouteManifest['routes'],
  outputStructure: 'directory' | 'flat',
): string {
  const redirects = aliasRoutes.flatMap((route) =>
    buildRedirectSourceVariants(route.url).map((source) => ({
      source,
      destination: route.redirectTo,
      permanent: true,
    })),
  );

  if (outputStructure === 'directory' && redirects.length === 0) {
    return '{}\n';
  }
  const rewrites =
    outputStructure === 'flat'
      ? buildCanonicalRewriteRules(canonicalRoutes).map((entry) => {
          const [source, destination] = entry.split(/\s+/);
          return { source, destination };
        })
      : undefined;
  return `${JSON.stringify({ ...(redirects.length > 0 ? { redirects } : {}), ...(rewrites?.length ? { rewrites } : {}) }, null, 2)}\n`;
}

function buildNginxConfig(
  aliasRoutes: RouteManifest['routes'],
  outputStructure: 'directory' | 'flat',
): string {
  const tryFiles =
    outputStructure === 'flat'
      ? 'try_files $uri $uri.html $uri/ =404;'
      : 'try_files $uri $uri/ =404;';
  return [
    'server {',
    '    listen 80;',
    '    server_name example.com;',
    '    root /var/www/html;',
    '    index index.html;',
    '',
    ...aliasRoutes.flatMap((route) =>
      buildRedirectSourceVariants(route.url).map((source) => {
        const normalizedSource = source === '/' ? source : `${source}`;
        return [
          `    location = ${normalizedSource} {`,
          `        return 308 ${route.redirectTo};`,
          '    }',
          '',
        ].join('\n');
      }),
    ),
    '    location / {',
    `        ${tryFiles}`,
    '    }',
    '}',
    '',
  ].join('\n');
}

export function buildRouteManifest(document: DocumentModel, options: SiteExportOptions = {}): RouteManifest {
  const { outputStructure = 'directory' } = options;
  return {
    routes: getAllPageRoutes(document).map((route) => {
      const page = (document.pages ?? []).find((entry) => entry.id === route.pageId);
      const filePath = resolveFilePath(route.url, outputStructure);
      return {
        pageId: route.pageId,
        slug: page?.slug ?? '',
        url: route.url,
        filePath,
        kind: route.kind,
        redirectTo: route.redirectTo,
      };
    }),
  };
}

function resolveFilePath(url: string, outputStructure: 'directory' | 'flat'): string {
  if (url === '/') {
    return 'index.html';
  }
  const stripped = url.replace(/^\//, '').replace(/\/$/, '');
  if (outputStructure === 'flat') {
    return `${stripped}.html`;
  }
  return `${stripped}/index.html`;
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

function renderRedirectHtmlDocument(sourceUrl: string, redirectTo: string) {
  const safeTarget = escapeHtml(redirectTo);
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>Redirecting to ${safeTarget}</title>`,
    `  <link rel="canonical" href="${safeTarget}" />`,
    `  <meta http-equiv="refresh" content="0;url=${safeTarget}" />`,
    '  <script>',
    `    const target = ${JSON.stringify(redirectTo)} + window.location.hash;`,
    '    window.location.replace(target);',
    '  </script>',
    '</head>',
    '<body>',
    `  <p>Redirecting from ${escapeHtml(sourceUrl)} to <a href="${safeTarget}">${safeTarget}</a>.</p>`,
    '</body>',
    '</html>',
  ].join('\n');
}

function buildRedirectSourceVariants(url: string): string[] {
  if (url === '/') {
    return ['/'];
  }

  const stripped = url.replace(/\/$/, '');
  return stripped === url ? [url] : [stripped, url];
}

function buildCanonicalRewriteRules(canonicalRoutes: RouteManifest['routes']): string[] {
  return canonicalRoutes
    .map((route) => route.url)
    .filter((url) => url !== '/')
    .map((url) => {
      const stripped = url.replace(/\/$/, '');
      const destination = resolveFilePath(url, 'flat');
      return `${stripped} /${destination}`;
    });
}
