import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { getLinkHref, shouldOpenNavigationInNewTab } from '../model/links';
import { DEFAULT_LINK_COLOR } from '../model/styleDefaults';
import { CODE_THEME_SURFACE, TEXT_NODE_DEFAULTS } from '../model/textNodeDefaults';
import {
  getSingleCodeBlockContent,
  getSingleListBlockContent,
  getSingleTextBlockContent,
  getTextContent,
  isRichTextLink,
} from '../model/richContent';
import { isMediaNode, isTextNode } from '../model/types';
import { mediaFitToPreserveAspectRatio } from '../model/svg';
import type {
  DocumentModel,
  ListContent,
  LinkExtension,
  RichBlock,
  RichBlockStyle,
  RichCodeBlock,
  RichContent,
  RichListBlock,
  RichListItem,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  SvgStrokeCap,
  SvgStrokeJoin,
  TextNode,
} from '../model/types';
import { highlightCode, normalizeCodeLanguage } from './codeHighlight';
import type {
  PresentationLeafNode as LeafNode,
  RenderLeafContentOptions,
  StageOrSiteNode,
} from './types';
import {
  getCodeLeafStyle,
  getStandaloneCodePreStyle,
  isAuthoredCodeSurfaceValue,
  styleRecordToReactStyle,
} from './leafPresentation';
import { renderVideoElement } from './videoPresentation';
export type { PresentationLeafNode, RenderLeafContentOptions, StageOrSiteNode } from './types';

export function formatNodeLabel(node: StageOrSiteNode) {
  if (node.contentType === 'container') {
    const label = node.subtype;
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  }
  if (isTextNode(node)) {
    return 'Text';
  }
  if (node.subtype === 'video') {
    return 'Video';
  }
  if (node.subtype === 'svg') {
    return 'SVG';
  }
  return 'Image';
}

export function getNodeAriaLabel(node: StageOrSiteNode) {
  const roleLabel = formatNodeLabel(node);
  return node.name && node.name !== roleLabel ? `${roleLabel}: ${node.name}` : roleLabel;
}

function escapeXmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function deriveSvgStrokeJoinFromCap(cap: SvgStrokeCap | undefined): SvgStrokeJoin {
  if (cap === 'round') {
    return 'round';
  }
  if (cap === 'square') {
    return 'bevel';
  }
  return 'miter';
}

function resolveSvgStrokePaintOrder(value: string | undefined) {
  if (value === 'stroke') {
    return 'stroke fill markers';
  }
  if (value === 'fill') {
    return 'fill stroke markers';
  }
  return 'normal';
}

export function getNodeTextContent(node: LeafNode): string {
  if (isTextNode(node)) {
    return getTextContent(node.content.blocks, { blockSeparator: '\n' });
  }
  if (isMediaNode(node)) {
    return node.alt ?? (node.subtype === 'video' ? 'Video' : node.subtype === 'svg' ? 'SVG' : 'Image');
  }
  return '';
}

export function richLeafStyle(leaf: RichTextLeaf): CSSProperties {
  const style: CSSProperties = {};
  if (leaf.bold) style.fontWeight = 'bold';
  if (leaf.italic) style.fontStyle = 'italic';
  if (leaf.underline || leaf.strikethrough) {
    style.textDecorationLine = [
      leaf.underline ? 'underline' : '',
      leaf.strikethrough ? 'line-through' : '',
    ].filter(Boolean).join(' ') as CSSProperties['textDecorationLine'];
  }
  if (leaf.color) style.color = leaf.color;
  if (leaf.backgroundColor) style.backgroundColor = leaf.backgroundColor;
  if (leaf.fontFamily) style.fontFamily = leaf.fontFamily;
  if (leaf.fontSize) style.fontSize = leaf.fontSize;
  if (typeof leaf.fontWeight === 'number') style.fontWeight = leaf.fontWeight;
  return style;
}

export function getRichLinkStyle(): CSSProperties {
  return {
    color: DEFAULT_LINK_COLOR,
    textDecoration: 'underline',
  };
}

function buildRenderPath(parentPath: string, index: number): string {
  return parentPath ? `${parentPath}.${index}` : String(index);
}

function mapWithRenderPaths<T>(
  items: readonly T[],
  parentPath: string,
  render: (item: T, path: string) => ReactNode,
): ReactNode[] {
  return items.map((item, index) => render(item, buildRenderPath(parentPath, index)));
}

export function getRichTextBlockTag(type: RichTextBlockType): 'p' | 'div' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  if (type === 'paragraph') {
    return 'p';
  }
  return type;
}

function renderRichInlineContent(
  content: RichTextBlock['children'],
  document?: DocumentModel,
  parentPath = 'inline',
): ReactNode {
  return mapWithRenderPaths(content, parentPath, (node, path) => {
    if (isRichTextLink(node)) {
      const href = getLinkHref(node, document);
      const externalProps = node.linkType === 'external' && node.openInNewTab
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {};
      return (
        <a key={path} href={href} style={getRichLinkStyle()} {...externalProps}>
          {mapWithRenderPaths(node.children, `${path}.leaf`, (leaf, leafPath) => (
            <span key={leafPath} style={richLeafStyle(leaf)}>{leaf.text}</span>
          ))}
        </a>
      );
    }
    const leaf = node as RichTextLeaf;
    const style = richLeafStyle(leaf);
    return Object.keys(style).length > 0
      ? <span key={path} style={style}>{leaf.text}</span>
      : <Fragment key={path}>{leaf.text}</Fragment>;
  });
}

function renderRichListItemContent(item: RichListItem, document?: DocumentModel, path = 'item'): ReactNode {
  return renderRichInlineContent(item.children, document, `${path}.inline`);
}

function renderRichCodeBlock(block: RichCodeBlock, path: string): ReactNode {
  const language = normalizeCodeLanguage(block.language ?? 'plaintext');
  const rawText = block.children
    .map((line) => line.children.map((leaf) => leaf.text).join(''))
    .join('\n');
  const html = highlightCode(rawText, language);
  const hasColorOverride = hasCodeColorOverride(block.style);

  return (
    <div
      key={path}
      dir={block.direction ?? 'ltr'}
      style={richCodeBlockWrapperStyleToCss(block.style)}
    >
      <pre
        className={`language-${language}`}
        data-code-theme={block.theme ?? 'light'}
        data-code-color={hasColorOverride ? 'author' : undefined}
        style={richCodeBlockPreStyleToCss(block.style)}
      >
        <code
          className={`language-${language}`}
          style={richCodeBlockCodeStyleToCss(block.style)}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: recomputed from code text through Prism at render time
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}

function renderRichListBlock(
  block: RichListBlock,
  path: string,
  document?: DocumentModel,
  options: {
    style?: CSSProperties;
    className?: string;
    dataNodeId?: string;
    tabIndex?: number;
  } = {},
): ReactNode {
  const { style, className, dataNodeId, tabIndex } = options;
  const sharedStyle = { ...getRichBlockRenderStyle(block), ...style };

  if (block.type === 'ol') {
    return (
      <ol
        key={path}
        className={className}
        data-node-id={dataNodeId}
        dir={block.direction ?? 'ltr'}
        start={block.start}
        style={sharedStyle}
      >
        {mapWithRenderPaths(block.children, `${path}.item`, (item, itemPath) => (
          <li
            key={itemPath}
            dir={item.direction ?? block.direction ?? 'ltr'}
            tabIndex={tabIndex}
            style={getRichListItemRenderStyle(item)}
          >
            {renderRichListItemContent(item, document, itemPath)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul
      key={path}
      className={className}
      data-node-id={dataNodeId}
      dir={block.direction ?? 'ltr'}
      style={sharedStyle}
    >
      {mapWithRenderPaths(block.children, `${path}.item`, (item, itemPath) => (
        <li
          key={itemPath}
          dir={item.direction ?? block.direction ?? 'ltr'}
          tabIndex={tabIndex}
          style={getRichListItemRenderStyle(item)}
        >
          {renderRichListItemContent(item, document, itemPath)}
        </li>
      ))}
    </ul>
  );
}

function getRichListItemRenderStyle(item: RichListItem): CSSProperties | undefined {
  return item.depth && item.depth > 0
    ? { marginInlineStart: `${item.depth * 1.25}em` }
    : undefined;
}

export function getDefaultListContainerStyle(): CSSProperties {
  return {
    margin: 0,
    listStylePosition: 'outside',
    paddingInlineStart: '1.25em',
  };
}

export function getRichBlockRenderStyle(block: RichBlock): CSSProperties {
  if (block.type === 'code-block') {
    return richCodeBlockWrapperStyleToCss(block.style);
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return {
      ...getDefaultListContainerStyle(),
      listStyleType: block.markerStyle,
      ...richBlockStyleToCss(block.style),
    };
  }

  return {
    margin: 0,
    ...(typeof block.lineHeight === 'number' ? { lineHeight: block.lineHeight } : {}),
    ...richBlockStyleToCss(block.style),
  };
}

export function renderRichContent(content: RichContent, document?: DocumentModel): ReactNode {
  return mapWithRenderPaths(content, 'block', (block, path) => {
    if (block.type === 'code-block') {
      return renderRichCodeBlock(block, path);
    }

    if (block.type === 'ul' || block.type === 'ol') {
      return renderRichListBlock(block, path, document);
    }

    const Tag = getRichTextBlockTag(block.type);
    return (
      <Tag
        key={path}
        dir={block.direction ?? 'ltr'}
        style={getRichBlockRenderStyle(block)}
      >
        {renderRichInlineContent(block.children, document, `${path}.inline`)}
      </Tag>
    );
  });
}

function richBlockStyleToCss(
  style: RichBlockStyle | undefined,
  options: {
    includeBorder?: boolean;
    includeBoxShadow?: boolean;
  } = {},
): CSSProperties {
  if (!style) {
    return {};
  }

  const css: CSSProperties = {
    ...(style.color ? { color: style.color } : {}),
    ...(style.background ? { background: style.background } : {}),
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(style.textDecorationLine ? { textDecorationLine: style.textDecorationLine } : {}),
    ...(style.textAlign ? { textAlign: style.textAlign } : {}),
    ...(style.filter ? { filter: style.filter } : {}),
  };

  if (options.includeBorder) {
    if (style.borderStyle) css.borderStyle = style.borderStyle;
    if (style.borderWidth) css.borderWidth = style.borderWidth;
    if (style.borderColor) css.borderColor = style.borderColor;
    if (style.borderRadius) css.borderRadius = style.borderRadius;
    if (style.boxSizing) css.boxSizing = style.boxSizing;
    if (style.backgroundClip) css.backgroundClip = style.backgroundClip;
  }

  if (options.includeBoxShadow && style.boxShadow) {
    css.boxShadow = style.boxShadow;
  }

  return css;
}

function richCodeBlockWrapperStyleToCss(style: RichBlockStyle | undefined): CSSProperties {
  if (!style) {
    return {};
  }

  return {
    ...(style.color ? { color: style.color } : {}),
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(style.textDecorationLine ? { textDecorationLine: style.textDecorationLine } : {}),
    ...(style.textAlign ? { textAlign: style.textAlign } : {}),
  };
}

function richCodeBlockPreStyleToCss(style: RichBlockStyle | undefined): CSSProperties {
  const wrap = style?.textWrap !== 'single-line';
  const css: CSSProperties = {
    display: 'block',
    width: '100%',
    margin: 0,
    whiteSpace: wrap ? 'pre-wrap' : 'pre',
    wordBreak: wrap ? 'break-word' : 'normal',
    overflowWrap: wrap ? 'anywhere' : 'normal',
    wordWrap: wrap ? 'break-word' : 'normal',
    overflowX: wrap ? 'hidden' : 'auto',
    ...richCodeBlockTypographyStyleToCss(style),
    ...richCodeBlockTabStyleToCss(style),
    ...(isAuthoredCodeSurfaceValue(style?.background) ? { background: style.background } : {}),
  };

  if (style?.borderStyle) css.borderStyle = style.borderStyle;
  if (style?.borderWidth) css.borderWidth = style.borderWidth;
  if (style?.borderColor) css.borderColor = style.borderColor;
  if (style?.borderRadius) css.borderRadius = style.borderRadius;
  if (style?.boxSizing) css.boxSizing = style.boxSizing;
  if (style?.backgroundClip) css.backgroundClip = style.backgroundClip;
  if (style?.boxShadow) css.boxShadow = style.boxShadow;

  return css;
}

function richCodeBlockCodeStyleToCss(style: RichBlockStyle | undefined): CSSProperties | undefined {
  const css = richCodeBlockTypographyStyleToCss(style);
  return Object.keys(css).length > 0 ? css : undefined;
}

function richCodeBlockTypographyStyleToCss(style: RichBlockStyle | undefined): CSSProperties {
  return {
    ...(isAuthoredCodeSurfaceValue(style?.color) ? { color: style.color } : {}),
    ...(style?.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style?.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style?.fontWeight != null ? { fontWeight: style.fontWeight } : {}),
    ...(style?.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(style?.textDecorationLine ? { textDecorationLine: style.textDecorationLine } : {}),
    ...((style as (RichBlockStyle & { lineHeight?: number }) | undefined)?.lineHeight != null
      ? { lineHeight: (style as RichBlockStyle & { lineHeight?: number }).lineHeight }
      : {}),
  };
}

function richCodeBlockTabStyleToCss(style: RichBlockStyle | undefined): CSSProperties {
  const tabSize = (style as (RichBlockStyle & { tabSize?: number }) | undefined)?.tabSize;
  return tabSize != null ? { tabSize } : {};
}

function hasCodeColorOverride(style: RichBlockStyle | undefined): boolean {
  return isAuthoredCodeSurfaceValue(style?.color);
}

function getExternalLinkProps(link: LinkExtension | undefined) {
  if (!link) {
    return {};
  }
  return shouldOpenNavigationInNewTab({ linkType: link.linkType, openInNewTab: link.openInNewTab })
    ? {
        target: '_blank',
        rel: 'noopener noreferrer',
      }
    : {};
}

function renderListItemText(
  text: string,
  link: LinkExtension | undefined,
  document: DocumentModel | undefined,
) {
  if (!link) {
    return text;
  }

  return (
    <a href={getLinkHref(link, document)} {...getExternalLinkProps(link)}>
      {text}
    </a>
  );
}

export function renderListContent(
  content: ListContent,
  options: {
    document?: DocumentModel;
    style?: CSSProperties;
    className?: string;
    dataNodeId?: string;
    tabIndex?: number;
  } = {},
): ReactNode {
  const { document, style, className, dataNodeId, tabIndex } = options;

  if (content.type === 'dl') {
    return (
      <dl className={className} data-node-id={dataNodeId} style={style}>
        {mapWithRenderPaths(content.items, 'dl-item', (item, path) => (
          <Fragment key={path}>
            <dt dir={item.direction ?? 'ltr'} tabIndex={tabIndex}>
              {renderListItemText(item.term, item.link, document)}
            </dt>
            <dd dir={item.direction ?? 'ltr'} tabIndex={tabIndex}>
              {renderListItemText(item.description, item.link, document)}
            </dd>
          </Fragment>
        ))}
      </dl>
    );
  }

  if (content.type === 'ol') {
    return (
      <ol
        className={className}
        data-node-id={dataNodeId}
        start={content.start}
        style={{ ...getDefaultListContainerStyle(), listStyleType: content.markerStyle, ...style }}
      >
        {mapWithRenderPaths(content.items, 'ol-item', (item, path) => (
          <li
            key={path}
            dir={item.direction ?? 'ltr'}
            tabIndex={tabIndex}
            style={'depth' in item && item.depth ? { marginInlineStart: `${item.depth * 1.25}em` } : undefined}
          >
            {renderListItemText(item.text, item.link, document)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul
      className={className}
      data-node-id={dataNodeId}
      style={{ ...getDefaultListContainerStyle(), listStyleType: content.markerStyle, ...style }}
    >
      {mapWithRenderPaths(content.items, 'ul-item', (item, path) => (
        <li
          key={path}
          dir={item.direction ?? 'ltr'}
          tabIndex={tabIndex}
          style={'depth' in item && item.depth ? { marginInlineStart: `${item.depth * 1.25}em` } : undefined}
        >
          {renderListItemText(item.text, item.link, document)}
        </li>
      ))}
    </ul>
  );
}

export function isBrandMark(node: LeafNode) {
  return isMediaNode(node) && node.subtype === 'image' && node.name === 'Brand Mark';
}

function getExternalNavigationProps(node: LeafNode) {
  if (!node.link) {
    return {};
  }
  return shouldOpenNavigationInNewTab({ linkType: node.link.linkType, openInNewTab: node.link.openInNewTab })
    ? {
        target: '_blank',
        rel: 'noopener noreferrer',
      }
    : {};
}

function getPageCurrentProps(
  link: LinkExtension | undefined,
  currentPageId: string | undefined,
) {
  return link?.linkType === 'page' && link.targetPageId && link.targetPageId === currentPageId && !link.pageAnchorId
    ? { 'aria-current': 'page' as const }
    : {};
}

export function renderLeafContent(
  node: LeafNode,
  options: RenderLeafContentOptions & {
    leafClassName?: string;
    dataNodeId?: string;
    currentPageId?: string;
  } = {},
): ReactNode {
  const {
    contentStyle,
    imageClassName,
    imagePlaceholderClassName,
    imageDraggable = true,
    videoClassName,
    svgClassName,
    videoPreviewOnly = false,
    onVideoIntrinsicRatio,
    disableTabNavigation = false,
    document,
    codeSurfaceMinHeight,
    leafClassName,
    dataNodeId,
    currentPageId,
  } = options;
  const tabIndex = disableTabNavigation ? -1 : undefined;

  if (isTextNode(node) && node.subtype === 'rich') {
    const blockGap = typeof node.content.blockGap === 'number'
      ? `${node.content.blockGap}px`
      : undefined;
    return (
      <div
        className={leafClassName}
        data-node-id={dataNodeId}
        style={{
          ...contentStyle,
          display: 'grid',
          ...(blockGap ? { rowGap: blockGap } : {}),
        }}
      >
        {renderRichContent(node.content.blocks, document)}
      </div>
    );
  }

  if (isMediaNode(node)) {
    const mediaFitStyle: CSSProperties = {
      ...(node.style?.objectFit ? { objectFit: node.style.objectFit } : {}),
      ...(node.style?.objectPosition ? { objectPosition: node.style.objectPosition } : {}),
    };
    const renderMediaElement = (standalone: boolean): ReactNode => {
      const elementStyle: CSSProperties | undefined = standalone
        ? { ...contentStyle, ...mediaFitStyle }
        : Object.keys(mediaFitStyle).length > 0
          ? mediaFitStyle
          : undefined;

      if (node.subtype === 'video') {
        if (!node.src) {
          return (
            <div
              className={imagePlaceholderClassName}
              data-node-id={standalone ? dataNodeId : undefined}
              style={standalone ? contentStyle : undefined}
            >
              {getNodeTextContent(node)}
            </div>
          );
        }
        return renderVideoElement({
          node,
          standalone,
          dataNodeId,
          videoClassName,
          contentStyle: elementStyle,
          mediaFitStyle,
          previewOnly: videoPreviewOnly,
          tabIndex,
          onVideoIntrinsicRatio,
        });
      }

      if (node.subtype === 'svg' && node.svg?.renderMode === 'inline') {
        const svg = node.svg;
        if (!svg.innerMarkup) {
          return (
            <div
              className={imagePlaceholderClassName}
              data-node-id={standalone ? dataNodeId : undefined}
              style={standalone ? contentStyle : undefined}
            >
              {getNodeTextContent(node)}
            </div>
          );
        }

        const a11y = svg.a11y;
        // Decorative (aria-hidden) and an accessible name are mutually exclusive:
        // aria-hidden cannot coexist with role="img" + aria-label.
        const decorative = a11y?.hidden === true;
        const describedById = !decorative && a11y?.desc ? `sp-svg-desc-${node.id}` : undefined;
        const monochrome = svg.monochrome?.enabled ? svg.monochrome : undefined;
        const stroke = svg.stroke?.enabled ? svg.stroke : undefined;
        const svgStyle: CSSProperties & Record<string, string | number> = { ...elementStyle };
        if (svg.overflow === 'visible') {
          svgStyle.overflow = 'visible !important' as CSSProperties['overflow'];
        }
        if (monochrome?.fill) {
          // Alpha rides on the color itself; there is no separate fill-opacity.
          svgStyle.color = monochrome.fill;
        }
        if (stroke) {
          if (stroke.color) {
            svgStyle['--sp-svg-stroke-color'] = stroke.color;
          }
          if (stroke.width !== undefined) {
            svgStyle['--sp-svg-stroke-width'] = stroke.width;
          }
          svgStyle['--sp-svg-stroke-linecap'] = stroke.cap ?? 'butt';
          svgStyle['--sp-svg-stroke-linejoin'] = stroke.join ?? deriveSvgStrokeJoinFromCap(stroke.cap);
          if (stroke.dashArray) {
            svgStyle['--sp-svg-stroke-dasharray'] = stroke.dashArray;
          }
          if (stroke.dashOffset) {
            svgStyle['--sp-svg-stroke-dashoffset'] = stroke.dashOffset;
          }
          if (stroke.nonScaling) {
            svgStyle['--sp-svg-stroke-vector-effect'] = 'non-scaling-stroke';
          }
          svgStyle['--sp-svg-stroke-paint-order'] = resolveSvgStrokePaintOrder(stroke.paintOrder);
        }
        const accessibleMarkup =
          (describedById ? `<desc id="${describedById}">${escapeXmlText(a11y?.desc ?? '')}</desc>` : '') +
          svg.innerMarkup;

        return (
          <svg
            className={[svgClassName, monochrome ? 'sp-svg-mono' : '', stroke ? 'sp-svg-stroke' : '']
              .filter(Boolean)
              .join(' ') || undefined}
            data-node-id={standalone ? dataNodeId : undefined}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={svg.viewBox ?? svg.originalViewBox}
            preserveAspectRatio={mediaFitToPreserveAspectRatio(node.style?.objectFit, node.style?.objectPosition)}
            focusable="false"
            {...(decorative
              ? { 'aria-hidden': true }
              : {
                  role: 'img',
                  ...(a11y?.title ? { 'aria-label': a11y.title } : {}),
                  ...(describedById ? { 'aria-describedby': describedById } : {}),
                })}
            style={svgStyle}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: markup is DOMPurify-sanitized at input time before storage
            dangerouslySetInnerHTML={{ __html: accessibleMarkup }}
          />
        );
      }

      return node.src ? (
        <img
          className={imageClassName}
          data-node-id={standalone ? dataNodeId : undefined}
          style={elementStyle}
          src={node.src}
          alt={node.alt || 'Image'}
          draggable={imageDraggable}
        />
      ) : (
        <div
          className={imagePlaceholderClassName}
          data-node-id={standalone ? dataNodeId : undefined}
          style={standalone ? contentStyle : undefined}
        >
          {getNodeTextContent(node)}
        </div>
      );
    };

    // Videos are always interactive players and never anchor-wrapped (a11y).
    if (node.link && node.subtype !== 'video') {
      return (
        <a
          className={leafClassName}
          data-node-id={dataNodeId}
          href={getLinkHref(node.link, document)}
          tabIndex={tabIndex}
          style={contentStyle}
          {...getExternalNavigationProps(node)}
          {...getPageCurrentProps(node.link, currentPageId)}
        >
          {renderMediaElement(false)}
        </a>
      );
    }

    return renderMediaElement(true);
  }

  if (isTextNode(node) && node.subtype === 'code') {
    const codeBlock = getSingleCodeBlockContent(node.content);
    const codeText = getTextContent(node.content.blocks, { blockSeparator: '\n' });
    const lang = normalizeCodeLanguage(getStandaloneCodeLanguage(node, codeBlock));
    const theme = getStandaloneCodeTheme(node, codeBlock);
    const html = highlightCode(codeText, lang);
    const codeStyle = {
      ...(codeBlock?.style ? richCodeBlockPreStyleToCss(codeBlock.style) : {}),
      ...getStandaloneCodeOverrideStyleToCss(node, codeBlock?.style != null),
      ...(codeSurfaceMinHeight ? { minHeight: codeSurfaceMinHeight } : {}),
    };
    const codeElementStyle = mergeOptionalStyles(
      codeBlock?.style ? richCodeBlockCodeStyleToCss(codeBlock.style) : undefined,
      getStandaloneCodeElementOverrideStyleToCss(node, codeBlock?.style != null),
    );
    applyExplicitCodeThemeSurface(codeStyle, codeElementStyle, theme);
    const hasColorOverride =
      isAuthoredCodeSurfaceValue(node.style?.color) || hasCodeColorOverride(codeBlock?.style);
    return (
      <div
        className={leafClassName}
        data-node-id={dataNodeId}
        style={contentStyle}
      >
        <pre
          className={`language-${lang}`}
          data-code-theme={theme}
          data-code-color={hasColorOverride ? 'author' : undefined}
          style={codeStyle}
        >
          <code
            className={`language-${lang}`}
            style={codeElementStyle}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: recomputed from code text through Prism at render time
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    );
  }

  if (isTextNode(node) && node.subtype === 'list') {
    const listBlock = getSingleListBlockContent(node.content);
    return listBlock
      ? renderRichListBlock(listBlock, 'standalone-list', document, {
          style: contentStyle,
          className: leafClassName,
          dataNodeId,
          tabIndex,
        })
      : null;
  }

  if (isTextNode(node) && node.subtype === 'block') {
    const textBlock = getSingleTextBlockContent(node.content);
    const text = getTextContent(node.content.blocks);
    const { link } = node;
    const blockType = textBlock?.type ?? (node.htmlTag === 'blockquote' ? 'blockquote' : node.htmlTag && node.htmlTag !== 'p' ? node.htmlTag : 'paragraph');
    const Tag = getRichTextBlockTag(blockType === 'paragraph' ? 'paragraph' : blockType);
    const blockStyle = {
      ...contentStyle,
      whiteSpace: 'pre-wrap' as const,
      ...(typeof textBlock?.lineHeight === 'number' ? { lineHeight: textBlock.lineHeight } : {}),
      ...richBlockStyleToCss(textBlock?.style),
    };
    const isButton = link !== undefined && node.style?.background !== undefined;
    const isLink = link !== undefined;

    if (isButton) {
      const href = getLinkHref(link, document);
      return href ? (
        <a
          className={leafClassName}
          data-node-id={dataNodeId}
          href={href}
          tabIndex={tabIndex}
          style={contentStyle}
          {...getExternalNavigationProps(node)}
          {...getPageCurrentProps(link, currentPageId)}
        >
          {text}
        </a>
      ) : (
        <button className={leafClassName} data-node-id={dataNodeId} type="button" tabIndex={tabIndex} style={contentStyle}>
          {text}
        </button>
      );
    }

    if (isLink) {
      const href = getLinkHref(link, document);
      return (
        <Tag
          className={leafClassName}
          data-node-id={dataNodeId}
          style={blockStyle}
        >
          <a
            href={href}
            tabIndex={tabIndex}
            {...getExternalNavigationProps(node)}
            {...getPageCurrentProps(link, currentPageId)}
          >
            {text}
          </a>
        </Tag>
      );
    }

    return (
      <Tag
        className={leafClassName}
        data-node-id={dataNodeId}
        style={blockStyle}
      >
        {textBlock
          ? renderRichInlineContent(textBlock.children, document, 'block.inline')
          : text}
      </Tag>
    );
  }

  return null;
}

function getStandaloneCodePreStyleToCss(node: TextNode): CSSProperties {
  return styleRecordToReactStyle({
    ...getCodeLeafStyle(node),
    ...getStandaloneCodePreStyle(node),
  });
}

function getStandaloneCodeOverrideStyleToCss(
  node: TextNode,
  stripDefaults: boolean,
): CSSProperties {
  const css = getStandaloneCodePreStyleToCss(node);
  return stripDefaults ? stripDefaultCodeTypography(css, node) : css;
}

function getStandaloneCodeElementStyleToCss(node: TextNode): CSSProperties | undefined {
  const { display: _display, margin: _margin, maxWidth: _maxWidth, whiteSpace: _whiteSpace, ...style } = getCodeLeafStyle(node);
  const css = styleRecordToReactStyle(style);
  return Object.keys(css).length > 0 ? css : undefined;
}

function getStandaloneCodeElementOverrideStyleToCss(
  node: TextNode,
  stripDefaults: boolean,
): CSSProperties | undefined {
  const css = getStandaloneCodeElementStyleToCss(node);
  if (!css) {
    return undefined;
  }
  const next = stripDefaults ? stripDefaultCodeTypography(css, node) : css;
  return Object.keys(next).length > 0 ? next : undefined;
}

function getStandaloneCodeLanguage(
  node: TextNode,
  codeBlock: RichCodeBlock | undefined,
): string {
  const defaultLanguage = TEXT_NODE_DEFAULTS.code.language;
  return node.code?.language && node.code.language !== defaultLanguage
    ? node.code.language
    : codeBlock?.language ?? node.code?.language ?? defaultLanguage;
}

function getStandaloneCodeTheme(
  node: TextNode,
  codeBlock: RichCodeBlock | undefined,
): string {
  const defaultTheme = TEXT_NODE_DEFAULTS.code.theme;
  return node.code?.theme && node.code.theme !== defaultTheme
    ? node.code.theme
    : codeBlock?.theme ?? node.code?.theme ?? defaultTheme;
}

function stripDefaultCodeTypography(style: CSSProperties, node: TextNode): CSSProperties {
  const next = { ...style };
  const defaults = TEXT_NODE_DEFAULTS.code.style;
  if (node.style?.fontFamily === defaults.fontFamily) {
    delete next.fontFamily;
  }
  if (node.style?.fontSize?.raw === defaults.fontSize.raw) {
    delete next.fontSize;
  }
  if (node.style?.lineHeight === defaults.lineHeight) {
    delete next.lineHeight;
  }
  if (node.style?.direction === defaults.direction) {
    delete next.direction;
  }
  if (node.style?.textWrap === undefined) {
    delete next.whiteSpace;
    delete next.wordBreak;
    delete next.overflowX;
  }
  return next;
}

function mergeOptionalStyles(
  base: CSSProperties | undefined,
  override: CSSProperties | undefined,
): CSSProperties | undefined {
  const css = {
    ...(base ?? {}),
    ...(override ?? {}),
  };
  return Object.keys(css).length > 0 ? css : undefined;
}

function applyExplicitCodeThemeSurface(
  preStyle: CSSProperties,
  codeStyle: CSSProperties | undefined,
  theme: string,
): void {
  if (theme !== 'light' && theme !== 'dark') {
    return;
  }
  const surface = CODE_THEME_SURFACE[theme];
  if (!isAuthoredCodeSurfaceValue(preStyle.background)) {
    preStyle.background = surface.background;
  }
  if (!isAuthoredCodeSurfaceValue(preStyle.color)) {
    preStyle.color = surface.color;
  }
  if (codeStyle && !isAuthoredCodeSurfaceValue(codeStyle.color)) {
    codeStyle.color = surface.color;
  }
}
