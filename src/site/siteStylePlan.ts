import type { DocumentModel, LeafNode } from '../model/types';
import { formatValue } from '../model/units';
import { buildDocumentDefaultFontStack } from '../fonts/defaults';
import { buildRenderRootPlan } from '../render/renderPlan';
import { walkRootPlan } from '../render/renderPlanHelpers';
import {
  buildWrapperStyle,
  cssPropertiesToDeclarations,
  getContentWrapperBaseStyle,
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getLeafCssHeight,
  getTrackCssWidth,
  getWrapperBorderDeclarations,
  usesIntrinsicHeight,
} from '../render/layout';
import {
  getLeafInlineStyle,
  getSiteLeafBaseRules,
  styleRecordToCssDeclarations,
} from '../render/leafPresentation';
import type { RenderPlanNode, RenderWrapperPlanNode, SharedCssRule } from '../render/types';
import {
  SITE_BRAND_MARK_CLASS,
  SITE_CONTENT_CLASS,
  SITE_CONTENT_SPACER_CLASS,
  SITE_IMAGE_CLASS,
  SITE_VIDEO_CLASS,
  SITE_SVG_CLASS,
  SITE_IMAGE_PLACEHOLDER_CLASS,
  SITE_LEAF_CLASS,
  SITE_MAIN_CLASS,
  SITE_NODE_CLASS,
  SITE_ROOT_CLASS,
  SITE_SPACER_BOTTOM_CLASS,
  SITE_SPACER_CLASS,
  SITE_SPACER_TOP_CLASS,
  SITE_TRACK_CLASS,
  SITE_WRAPPER_CLASS,
  getStickyCssDeclarations,
  getStickyTrackSpacerCss,
  getTrackSpacerClassName,
} from './siteShared';

export function buildSiteViewTransitionCss(document: DocumentModel): string | null {
  const viewTransition = document.siteSettings?.viewTransition;
  if (viewTransition === 'crossfade' || viewTransition === 'slide') {
    return '@media (prefers-reduced-motion: no-preference) {\n  @view-transition {\n    navigation: auto;\n  }\n}';
  }
  return null;
}

export function buildSiteCodeThemeCss(): string {
  const explicitDarkCss = buildCodeDarkThemeCss('pre[data-code-theme="dark"]');
  const autoDarkCss = buildCodeDarkThemeCss('pre[data-code-theme="auto"]', 2);
  return [
    explicitDarkCss,
    '@media (prefers-color-scheme: dark) {',
    autoDarkCss,
    '}',
    'pre[data-code-color="author"] code[class*="language-"] .token {',
    '  color: inherit;',
    '}',
  ].join('\n');
}

export function buildSiteCssRules(document: DocumentModel, previewSticky = true): SharedCssRule[] {
  const rules = [
    ...getBaseSiteCssRules(document),
    ...getSiteLeafBaseRules({
      text: `.${SITE_LEAF_CLASS}.sp-role-text`,
      blockquoteText: `blockquote.${SITE_LEAF_CLASS}.sp-role-text`,
      linkAnchor: `.${SITE_LEAF_CLASS}.sp-role-link > a`,
      imageLink: `a.${SITE_LEAF_CLASS}.sp-role-image`,
      image: `img.${SITE_IMAGE_CLASS}`,
      brandMarkImage: `img.${SITE_IMAGE_CLASS}.${SITE_BRAND_MARK_CLASS}`,
      imagePlaceholder: `.${SITE_IMAGE_PLACEHOLDER_CLASS}`,
      video: `video.${SITE_VIDEO_CLASS}`,
      videoFrame: `.${SITE_VIDEO_CLASS}`,
      videoMedia: `video.sp-video-media`,
      videoTitle: `.sp-video-title`,
      videoDescription: `.sp-video-description`,
      svg: `svg.${SITE_SVG_CLASS}`,
      button: `button.${SITE_LEAF_CLASS}.sp-role-button`,
    }),
  ];
  const plan = buildRenderRootPlan(document, previewSticky);
  walkRootPlan(plan, (node) => appendPlanCss(node, rules));

  return rules;
}

function getBaseSiteCssRules(document: DocumentModel): SharedCssRule[] {
  return [
    {
      selector: 'html, body',
      style: {
        margin: 0,
        padding: 0,
      },
    },
    {
      selector: 'body',
      style: {
        fontFamily: buildDocumentDefaultFontStack(document),
        background: '#ffffff',
        color: '#0f172a',
      },
    },
    {
      selector: `.${SITE_ROOT_CLASS}, .${SITE_ROOT_CLASS} *`,
      style: {
        boxSizing: 'border-box',
      },
    },
    {
      selector: `.${SITE_ROOT_CLASS}`,
      style: {
        width: '100%',
      },
    },
    {
      selector: `.${SITE_MAIN_CLASS}`,
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        minHeight: 0,
      },
    },
    {
      selector: `.${SITE_TRACK_CLASS}`,
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        overflow: 'visible',
        isolation: 'isolate',
      },
    },
    {
      selector: `.${SITE_NODE_CLASS}`,
      style: {
        boxSizing: 'border-box',
      },
    },
    {
      selector: `.${SITE_WRAPPER_CLASS}`,
      style: {
        display: 'block',
        position: 'relative',
        minHeight: 0,
        overflow: 'visible',
        background: 'transparent',
        borderRadius: 0,
      },
    },
    {
      selector: `.${SITE_WRAPPER_CLASS}.sp-role-header, .${SITE_WRAPPER_CLASS}.sp-role-footer, .${SITE_WRAPPER_CLASS}.sp-role-section`,
      style: {
        width: '100%',
        height: 'auto',
        minHeight: 0,
        flex: '0 0 auto',
      },
    },
    {
      selector: `.${SITE_CONTENT_CLASS}`,
      style: {
        position: 'relative',
        display: 'grid',
        alignItems: 'start',
        minHeight: '1px',
        height: 'auto',
        width: '100%',
      },
    },
    {
      selector: `.${SITE_LEAF_CLASS}`,
      style: {
        display: 'block',
        position: 'relative',
        minWidth: '56px',
        minHeight: '32px',
        overflow: 'visible',
      },
    },
    {
      selector: `.${SITE_SPACER_CLASS}`,
      style: {
        minHeight: 0,
        padding: 0,
        border: 0,
        background: 'transparent',
        boxShadow: 'none',
        width: '100%',
        pointerEvents: 'none',
      },
    },
    {
      selector: `.${SITE_CONTENT_SPACER_CLASS}`,
      style: {
        width: '100%',
        pointerEvents: 'none',
      },
    },
    {
      selector: `.${SITE_SPACER_TOP_CLASS}, .${SITE_SPACER_BOTTOM_CLASS}`,
      style: {
        width: '100%',
      },
    },
    {
      selector: 'interact-element',
      style: {
        display: 'contents',
      },
    },
    // background-clip: text — wrapper clips its own (empty) text to hide the
    // rect; descendants inherit the gradient and clip to their glyphs.
    // -webkit-text-fill-color overrides painting only, preserving authored color.
    {
      selector: '.sp-clip-text',
      style: {
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    },
    {
      selector: '.sp-clip-text :where(h1, h2, h3, h4, h5, h6, p, blockquote, a, li, span, strong, em, button, div, pre, code)',
      style: {
        background: 'inherit',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    },
  ];
}

function appendPlanCss(plan: RenderPlanNode, rules: SharedCssRule[]) {
  if (plan.kind === 'wrapper') {
    appendWrapperPlanCss(plan, rules);
    return;
  }

  appendLeafPlanCss(plan, rules);
}

function appendWrapperPlanCss(plan: RenderWrapperPlanNode, rules: SharedCssRule[]) {
  rules.push({
    selector: selectorFromClassName(plan.nodeClassName),
    style: declarationsToStyleRecord([
      ...cssPropertiesToDeclarations(buildWrapperStyle(plan.node, plan.isTopLevel)),
      ...(plan.selfStickyTrack ? [] : cssPropertiesToDeclarations(plan.meshPlacement)),
      ...getWrapperBorderDeclarations(plan.node),
      ...(plan.selfSticky ? getStickyCssDeclarations(plan.node.sticky) : []),
    ]),
  });

  rules.push({
    selector: selectorFromClassName(plan.contentClassName),
      style: declarationsToStyleRecord([
        ...cssPropertiesToDeclarations({
          ...getContentWrapperBaseStyle(plan.node),
          ...getContentWrapperPaddingStyle(plan.node),
          ...getContentWrapperSurfaceStyle(plan.node),
          display: 'grid',
          gridTemplateColumns: plan.meshLayout.columnTemplate,
        gridTemplateRows: plan.meshLayout.rowTemplate,
      }),
      ...(plan.contentSticky ? getStickyCssDeclarations(plan.node.sticky) : []),
    ]),
  });

  if (plan.selfStickyTrack) {
    rules.push({
      selector: selectorFromClassName(plan.trackClassName),
      style: declarationsToStyleRecord(cssPropertiesToDeclarations(plan.meshPlacement)),
    });
    rules.push({
      selector: selectorFromClassName(getTrackSpacerClassName(plan.node.id, 'top')),
      style: { height: getStickyTrackSpacerCss(plan.node.sticky, 'top') },
    });
    rules.push({
      selector: selectorFromClassName(getTrackSpacerClassName(plan.node.id, 'bottom')),
      style: { height: getStickyTrackSpacerCss(plan.node.sticky, 'bottom') },
    });
  }

  if (plan.contentSticky) {
    rules.push({
      selector: selectorFromClassName(plan.contentSpacerClassName),
      style: {
        height: plan.extraExtent > 0 ? `${Math.round(plan.extraExtent)}px` : '0px',
      },
    });
  }
}

function appendLeafPlanCss(plan: Extract<RenderPlanNode, { kind: 'leaf' }>, rules: SharedCssRule[]) {
  const node = plan.node;

  rules.push({
    selector: selectorFromClassName(plan.nodeClassName),
    style: declarationsToStyleRecord([
      `width: ${formatValue(node.rect.width.base.parsed)}`,
      ...(plan.selfStickyTrack ? [] : cssPropertiesToDeclarations(plan.meshPlacement)),
      ...(usesIntrinsicHeight(node) ? ['align-self: start'] : []),
      ...leafSizeDeclarations(node),
      ...leafVisualDeclarations(node),
      ...(node.sticky?.enabled ? getStickyCssDeclarations(node.sticky) : []),
      ...(plan.selfSticky ? ['position: sticky'] : ['position: relative']),
    ]),
  });

  if (plan.selfStickyTrack) {
    rules.push({
      selector: selectorFromClassName(plan.trackClassName),
      style: declarationsToStyleRecord([
        ...cssPropertiesToDeclarations(plan.meshPlacement),
        `width: ${getTrackCssWidth(node)}`,
      ]),
    });
    rules.push({
      selector: selectorFromClassName(getTrackSpacerClassName(node.id, 'top')),
      style: { height: getStickyTrackSpacerCss(node.sticky, 'top') },
    });
    rules.push({
      selector: selectorFromClassName(getTrackSpacerClassName(node.id, 'bottom')),
      style: { height: getStickyTrackSpacerCss(node.sticky, 'bottom') },
    });
  }
}

function leafSizeDeclarations(node: LeafNode) {
  const declarations = [`height: ${getLeafCssHeight(node)}`];
  if (!('unit' in node.rect.height.base.parsed) && node.rect.height.base.parsed.keyword === 'aspect-ratio') {
    declarations.push(`aspect-ratio: ${node.rect.height.base.parsed.ratio}`);
  }
  return declarations;
}

function leafVisualDeclarations(node: LeafNode) {
  return styleRecordToCssDeclarations(getLeafInlineStyle(node));
}

function declarationsToStyleRecord(declarations: string[]) {
  return Object.fromEntries(
    declarations.map((declaration) => {
      const separatorIndex = declaration.indexOf(':');
      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();
      return [property, value];
    }),
  );
}

function selectorFromClassName(className: string) {
  return `.${className.trim().split(/\s+/).join('.')}`;
}

function buildCodeDarkThemeCss(selector: string, indentSpaces = 0): string {
  const indent = ' '.repeat(indentSpaces);
  const declarations = [
    `${selector},`,
    `${selector} code[class*="language-"] {`,
    '  color: #f8f8f2;',
    '  background: #272822;',
    '  text-shadow: 0 1px rgba(0, 0, 0, 0.3);',
    '}',
    '',
    `${selector} .token.comment,`,
    `${selector} .token.prolog,`,
    `${selector} .token.doctype,`,
    `${selector} .token.cdata {`,
    '  color: #8292a2;',
    '}',
    '',
    `${selector} .token.punctuation {`,
    '  color: #f8f8f2;',
    '}',
    '',
    `${selector} .token.property,`,
    `${selector} .token.tag,`,
    `${selector} .token.constant,`,
    `${selector} .token.symbol,`,
    `${selector} .token.deleted {`,
    '  color: #f92672;',
    '}',
    '',
    `${selector} .token.boolean,`,
    `${selector} .token.number {`,
    '  color: #ae81ff;',
    '}',
    '',
    `${selector} .token.selector,`,
    `${selector} .token.attr-name,`,
    `${selector} .token.string,`,
    `${selector} .token.char,`,
    `${selector} .token.builtin,`,
    `${selector} .token.inserted {`,
    '  color: #a6e22e;',
    '}',
    '',
    `${selector} .token.operator,`,
    `${selector} .token.entity,`,
    `${selector} .token.url,`,
    `${selector} .token.variable {`,
    '  color: #f8f8f2;',
    '}',
    '',
    `${selector} .token.atrule,`,
    `${selector} .token.attr-value,`,
    `${selector} .token.function,`,
    `${selector} .token.class-name {`,
    '  color: #e6db74;',
    '}',
    '',
    `${selector} .token.keyword {`,
    '  color: #66d9ef;',
    '}',
    '',
    `${selector} .token.regex,`,
    `${selector} .token.important {`,
    '  color: #fd971f;',
    '}',
  ];
  return declarations.map((line) => line ? `${indent}${line}` : line).join('\n');
}
