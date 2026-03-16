import { renderToStaticMarkup } from 'react-dom/server';
import type { DocumentModel, DocumentNode, WrapperNode } from '../model/types';
import { formatValue } from '../model/units';
import {
  buildWrapperStyle,
  cssPropertiesToDeclarations,
  getContentWrapperBaseStyle,
  getLeafCssHeight,
  getTrackCssWidth,
  usesIntrinsicHeight,
} from '../render/layout';
import { getLeafInlineStyle, getSiteLeafBaseRules, styleRecordToCssDeclarations } from '../render/leafPresentation';
import { SiteRenderer } from './SiteRenderer';
import {
  SITE_BRAND_MARK_CLASS,
  getTrackSpacerClassName,
  getStickyCssDeclarations,
  getStickyTrackSpacerCss,
  SITE_CONTENT_CLASS,
  SITE_CONTENT_SPACER_CLASS,
  SITE_IMAGE_CLASS,
  SITE_IMAGE_PLACEHOLDER_CLASS,
  SITE_LEAF_CLASS,
  SITE_MAIN_CLASS,
  SITE_NODE_CLASS,
  SITE_ROOT_CLASS,
  SITE_SPACER_CLASS,
  SITE_SPACER_BOTTOM_CLASS,
  SITE_SPACER_TOP_CLASS,
  SITE_TRACK_CLASS,
  SITE_WRAPPER_CLASS,
} from './siteShared';
import {
  buildSiteRootPlan,
  type SiteLeafPlan,
  type SiteRenderPlanNode,
  type SiteWrapperPlan,
} from './sitePlan';
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
  const rules = [
    BASE_SITE_CSS,
    ...getSiteLeafBaseRules({
      text: `.${SITE_LEAF_CLASS}.sp-role-text`,
      blockquoteText: `blockquote.${SITE_LEAF_CLASS}.sp-role-text`,
      link: `.${SITE_LEAF_CLASS}.sp-role-link`,
      imageRole: `.${SITE_LEAF_CLASS}.sp-role-image`,
      image: `img.${SITE_LEAF_CLASS}.sp-role-image.${SITE_IMAGE_CLASS}`,
      brandMarkImage: `.${SITE_LEAF_CLASS}.sp-role-image.${SITE_BRAND_MARK_CLASS}.${SITE_IMAGE_CLASS}`,
      imagePlaceholder: `.${SITE_LEAF_CLASS}.sp-role-image.${SITE_IMAGE_PLACEHOLDER_CLASS}`,
      button: `button.${SITE_LEAF_CLASS}.sp-role-button`,
    }).map((entry) => rule(entry.selector, styleRecordToCssDeclarations(entry.style))),
  ];
  const plan = buildSiteRootPlan(document, previewSticky);
  if (plan.header) {
    appendPlanCss(plan.header, rules);
  }
  for (const wrapper of plan.main) {
    appendPlanCss(wrapper, rules);
  }
  if (plan.footer) {
    appendPlanCss(plan.footer, rules);
  }
  return `${rules.join('\n\n')}\n`;
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

const BASE_SITE_CSS = [
  'html, body {',
  '  margin: 0;',
  '  padding: 0;',
  '}',
  'body {',
  "  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
  '  background: #ffffff;',
  '  color: #0f172a;',
  '}',
  `.${SITE_ROOT_CLASS}, .${SITE_ROOT_CLASS} * {`,
  '  box-sizing: border-box;',
  '}',
  `.${SITE_ROOT_CLASS} {`,
  '  width: 100%;',
  '}',
  `.${SITE_MAIN_CLASS} {`,
  '  position: relative;',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: stretch;',
  '  min-height: 0;',
  '}',
  `.${SITE_TRACK_CLASS} {`,
  '  position: relative;',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: stretch;',
  '  overflow: visible;',
  '  isolation: isolate;',
  '}',
  `.${SITE_NODE_CLASS} {`,
  '  box-sizing: border-box;',
  '}',
  `.${SITE_WRAPPER_CLASS} {`,
  '  display: block;',
  '  position: relative;',
  '  min-height: 0;',
  '  overflow: visible;',
  '  background: transparent;',
  '  border-style: solid;',
  '  border-radius: 0;',
  '}',
  `.${SITE_WRAPPER_CLASS}.sp-role-header, .${SITE_WRAPPER_CLASS}.sp-role-footer, .${SITE_WRAPPER_CLASS}.sp-role-section {`,
  '  width: 100%;',
  '  height: auto;',
  '  min-height: 0;',
  '  flex: 0 0 auto;',
  '}',
  `.${SITE_WRAPPER_CLASS}.sp-role-section, .${SITE_WRAPPER_CLASS}.sp-role-container {`,
  '  min-height: 180px;',
  '}',
  `.${SITE_CONTENT_CLASS} {`,
    '  position: relative;',
  '  display: grid;',
  '  align-items: start;',
  '  min-height: 1px;',
  '  height: auto;',
  '  width: 100%;',
  '  z-index: 2;',
  '}',
  `.${SITE_LEAF_CLASS} {`,
  '  display: block;',
  '  position: relative;',
  '  min-width: 56px;',
  '  min-height: 32px;',
  '  overflow: visible;',
  '}',
  `.${SITE_SPACER_CLASS} {`,
  '  min-height: 0;',
  '  padding: 0;',
  '  border: 0;',
  '  background: transparent;',
  '  box-shadow: none;',
  '  width: 100%;',
  '  pointer-events: none;',
  '}',
  `.${SITE_CONTENT_SPACER_CLASS} {`,
  '  width: 100%;',
  '  pointer-events: none;',
  '}',
  `.${SITE_SPACER_TOP_CLASS}, .${SITE_SPACER_BOTTOM_CLASS} {`,
  '  width: 100%;',
  '}',
].join('\n');

function appendPlanCss(plan: SiteRenderPlanNode, rules: string[]) {
  if (plan.kind === 'wrapper') {
    appendWrapperPlanCss(plan, rules);
    return;
  }
  appendLeafPlanCss(plan, rules);
}

function appendWrapperPlanCss(plan: SiteWrapperPlan, rules: string[]) {
  const wrapperDecls = [
    ...cssPropertiesToDeclarations(buildWrapperStyle(plan.node, plan.isTopLevel)),
    ...(plan.selfSticky ? [] : cssPropertiesToDeclarations(plan.meshPlacement)),
    ...wrapperBorderDeclarations(plan.node.style),
    ...(plan.selfSticky ? getStickyCssDeclarations(plan.node.sticky) : []),
  ];
  rules.push(rule(selectorFromClassName(plan.nodeClassName), wrapperDecls));

  const contentDecls = [
    ...cssPropertiesToDeclarations({
      ...getContentWrapperBaseStyle(plan.node),
      background: plan.node.style.background,
      display: 'grid',
      gridTemplateColumns: plan.meshLayout.columnTemplate,
      gridTemplateRows: plan.meshLayout.rowTemplate,
      paddingTop: plan.node.style.paddingTop ? formatValue(plan.node.style.paddingTop.parsed) : undefined,
      paddingRight: plan.node.style.paddingRight ? formatValue(plan.node.style.paddingRight.parsed) : undefined,
      paddingBottom: plan.node.style.paddingBottom ? formatValue(plan.node.style.paddingBottom.parsed) : undefined,
      paddingLeft: plan.node.style.paddingLeft ? formatValue(plan.node.style.paddingLeft.parsed) : undefined,
    }),
    ...(plan.contentSticky ? getStickyCssDeclarations(plan.node.sticky) : []),
  ];
  rules.push(rule(selectorFromClassName(plan.contentClassName), contentDecls));

  if (plan.selfSticky) {
    rules.push(
      rule(selectorFromClassName(plan.trackClassName), cssPropertiesToDeclarations(plan.meshPlacement)),
    );
    rules.push(
      rule(selectorFromClassName(getTrackSpacerClassName(plan.node.id, 'top')), [`height: ${getStickyTrackSpacerCss(plan.node.sticky, 'top')}`]),
    );
    rules.push(
      rule(selectorFromClassName(getTrackSpacerClassName(plan.node.id, 'bottom')), [`height: ${getStickyTrackSpacerCss(plan.node.sticky, 'bottom')}`]),
    );
  }

  if (plan.contentSticky) {
    rules.push(
      rule(
        selectorFromClassName(plan.contentSpacerClassName),
        [`height: ${plan.extraExtent > 0 ? `${Math.round(plan.extraExtent)}px` : '0px'}`],
      ),
    );
  }

  for (const child of plan.children) {
    appendPlanCss(child, rules);
  }
}

function appendLeafPlanCss(plan: SiteLeafPlan, rules: string[]) {
  const node = plan.node;
  const isAutoSticky =
    node.sticky?.enabled && node.sticky.target === 'self' && node.sticky.durationMode === 'auto';
  const leafDecls = [
    `width: ${formatValue(node.rect.width.base.parsed)}`,
    ...(plan.selfSticky ? [] : cssPropertiesToDeclarations(plan.meshPlacement)),
    ...(usesIntrinsicHeight(node) ? ['align-self: start'] : []),
    ...leafSizeDeclarations(node),
    ...leafVisualDeclarations(node),
    ...(node.sticky?.enabled ? getStickyCssDeclarations(node.sticky) : []),
    ...(plan.selfSticky || isAutoSticky ? ['position: sticky'] : ['position: relative']),
  ];
  rules.push(rule(selectorFromClassName(plan.nodeClassName), leafDecls));

  if (plan.selfSticky) {
    rules.push(
      rule(
        selectorFromClassName(plan.trackClassName),
        [
          ...cssPropertiesToDeclarations(plan.meshPlacement),
          `width: ${getTrackCssWidth(node)}`,
        ],
      ),
    );
    rules.push(
      rule(selectorFromClassName(getTrackSpacerClassName(node.id, 'top')), [`height: ${getStickyTrackSpacerCss(node.sticky, 'top')}`]),
    );
    rules.push(
      rule(selectorFromClassName(getTrackSpacerClassName(node.id, 'bottom')), [`height: ${getStickyTrackSpacerCss(node.sticky, 'bottom')}`]),
    );
  }
}

function wrapperBorderDeclarations(style: WrapperNode['style']): string[] {
  const declarations: string[] = ['border-style: solid'];
  if (style.borderColor) {
    declarations.push(`border-color: ${style.borderColor}`);
  }
  declarations.push(`border-width: ${style.borderWidth ? formatValue(style.borderWidth.parsed) : '1px'}`);
  return declarations;
}

function leafSizeDeclarations(node: Extract<DocumentNode, { type: 'leaf' }>) {
  const declarations = [`height: ${getLeafCssHeight(node)}`];
  if (
    !('unit' in node.rect.height.base.parsed) &&
    node.rect.height.base.parsed.keyword === 'aspect-ratio'
  ) {
    declarations.push(`aspect-ratio: ${node.rect.height.base.parsed.ratio}`);
  }
  return declarations;
}

function leafVisualDeclarations(node: Extract<DocumentNode, { type: 'leaf' }>) {
  return styleRecordToCssDeclarations(getLeafInlineStyle(node));
}

function rule(selector: string, declarations: string[]) {
  if (declarations.length === 0) {
    return `${selector} {}`;
  }
  return `${selector} {\n${declarations.map((declaration) => `  ${declaration};`).join('\n')}\n}`;
}

function selectorFromClassName(className: string) {
  return `.${className.trim().split(/\s+/).join('.')}`;
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
