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
import {
  getLeafInlineStyle,
  getSiteLeafBaseRules,
  styleRecordToCssDeclarations,
} from '../render/leafPresentation';
import type { SharedCssRule } from '../render/types';
import {
  SITE_BRAND_MARK_CLASS,
  SITE_CONTENT_CLASS,
  SITE_CONTENT_SPACER_CLASS,
  SITE_IMAGE_CLASS,
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
import {
  buildSiteRootPlan,
  type SiteLeafPlan,
  type SiteRenderPlanNode,
  type SiteWrapperPlan,
} from './sitePlan';

export function buildSiteCssRules(document: DocumentModel, previewSticky = true): SharedCssRule[] {
  const rules = [
    ...getBaseSiteCssRules(),
    ...getSiteLeafBaseRules({
      text: `.${SITE_LEAF_CLASS}.sp-role-text`,
      blockquoteText: `blockquote.${SITE_LEAF_CLASS}.sp-role-text`,
      link: `.${SITE_LEAF_CLASS}.sp-role-link`,
      imageRole: `.${SITE_LEAF_CLASS}.sp-role-image`,
      image: `img.${SITE_LEAF_CLASS}.sp-role-image.${SITE_IMAGE_CLASS}`,
      brandMarkImage: `.${SITE_LEAF_CLASS}.sp-role-image.${SITE_BRAND_MARK_CLASS}.${SITE_IMAGE_CLASS}`,
      imagePlaceholder: `.${SITE_LEAF_CLASS}.sp-role-image.${SITE_IMAGE_PLACEHOLDER_CLASS}`,
      button: `button.${SITE_LEAF_CLASS}.sp-role-button`,
    }),
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

  return rules;
}

function getBaseSiteCssRules(): SharedCssRule[] {
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
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
        borderStyle: 'solid',
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
        zIndex: 2,
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
  ];
}

function appendPlanCss(plan: SiteRenderPlanNode, rules: SharedCssRule[]) {
  if (plan.kind === 'wrapper') {
    appendWrapperPlanCss(plan, rules);
    return;
  }

  appendLeafPlanCss(plan, rules);
}

function appendWrapperPlanCss(plan: SiteWrapperPlan, rules: SharedCssRule[]) {
  rules.push({
    selector: selectorFromClassName(plan.nodeClassName),
    style: declarationsToStyleRecord([
      ...cssPropertiesToDeclarations(buildWrapperStyle(plan.node, plan.isTopLevel)),
      ...(plan.selfStickyTrack ? [] : cssPropertiesToDeclarations(plan.meshPlacement)),
      ...wrapperBorderDeclarations(plan.node.style),
      ...(plan.selfSticky ? getStickyCssDeclarations(plan.node.sticky) : []),
    ]),
  });

  rules.push({
    selector: selectorFromClassName(plan.contentClassName),
    style: declarationsToStyleRecord([
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

  for (const child of plan.children) {
    appendPlanCss(child, rules);
  }
}

function appendLeafPlanCss(plan: SiteLeafPlan, rules: SharedCssRule[]) {
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
  if (!('unit' in node.rect.height.base.parsed) && node.rect.height.base.parsed.keyword === 'aspect-ratio') {
    declarations.push(`aspect-ratio: ${node.rect.height.base.parsed.ratio}`);
  }
  return declarations;
}

function leafVisualDeclarations(node: Extract<DocumentNode, { type: 'leaf' }>) {
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
