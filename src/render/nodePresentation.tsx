import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { getLinkHref, shouldOpenNavigationInNewTab } from '../model/links';
import { getListTextContent } from '../model/listContent';
import { getTextContent, isRichTextLink } from '../model/richContent';
import { isMediaNode, isTextNode } from '../model/types';
import type {
  DocumentModel,
  DescriptionListItem,
  ListContent,
  LinkExtension,
  RichBlock,
  RichCodeBlock,
  RichContent,
  RichListBlock,
  RichListItem,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
  ListTextItem,
} from '../model/types';
import { highlightCode } from './codeHighlight';
import type {
  PresentationLeafNode as LeafNode,
  RenderLeafContentOptions,
  StageOrSiteNode,
} from './types';
export type { PresentationLeafNode, RenderLeafContentOptions, StageOrSiteNode } from './types';

export function formatNodeLabel(node: StageOrSiteNode) {
  if (node.contentType === 'container') {
    const label = node.subtype;
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  }
  if (isTextNode(node)) {
    return `Text: ${node.subtype}`;
  }
  return 'Image';
}

export function getNodeAriaLabel(node: StageOrSiteNode) {
  const roleLabel = formatNodeLabel(node);
  return node.name && node.name !== roleLabel ? `${roleLabel}: ${node.name}` : roleLabel;
}

export function getNodeTextContent(node: LeafNode): string {
  if (isTextNode(node)) {
    if (typeof node.content === 'string') {
      return node.content;
    }
    if (node.subtype === 'list') {
      return getListTextContent(node.content as ListContent);
    }
    return getTextContent(node.content as RichContent);
  }
  if (isMediaNode(node)) {
    return node.alt ?? 'Image';
  }
  return '';
}

export function richLeafStyle(leaf: RichTextLeaf): CSSProperties {
  const style: CSSProperties = {};
  if (leaf.bold) style.fontWeight = 'bold';
  if (leaf.italic) style.fontStyle = 'italic';
  if (leaf.color) style.color = leaf.color;
  if (leaf.fontFamily) style.fontFamily = leaf.fontFamily;
  if (leaf.fontSize) style.fontSize = leaf.fontSize;
  return style;
}

function richLeafKey(leaf: RichTextLeaf): string {
  return `${leaf.text}|${leaf.bold ? 'b' : ''}${leaf.italic ? 'i' : ''}|${leaf.color ?? ''}|${leaf.fontFamily ?? ''}|${leaf.fontSize ?? ''}`;
}

function richLinkKey(node: RichTextLink): string {
  return `link|${node.linkType}|${node.href ?? ''}|${node.children.map((l) => l.text).join('')}`;
}

function richBlockKey(block: RichBlock, index: number): string {
  if (block.type === 'code-block') {
    return `block|${index}|code|${block.language ?? 'plaintext'}|${block.children.map((line) => line.children.map((leaf) => richLeafKey(leaf)).join('|')).join('||')}`;
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return `block|${index}|${block.type}|${block.children.map((item) => item.children.map((child) => (isRichTextLink(child) ? richLinkKey(child) : richLeafKey(child as RichTextLeaf))).join('|')).join('||')}`;
  }

  return `block|${index}|${block.type}|${block.children.map((child) => (isRichTextLink(child) ? richLinkKey(child) : richLeafKey(child as RichTextLeaf))).join('|')}`;
}

export function getRichTextBlockTag(type: RichTextBlockType): 'p' | 'div' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  if (type === 'paragraph') {
    return 'p';
  }
  return type;
}

function renderRichInlineContent(content: RichTextBlock['children'], document?: DocumentModel): ReactNode {
  return content.map((node) => {
    if (isRichTextLink(node)) {
      const href = getLinkHref(node, document);
      const externalProps = node.linkType === 'external' && node.openInNewTab
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {};
      return (
        <a key={richLinkKey(node)} href={href} {...externalProps}>
          {node.children.map((leaf) => (
            <span key={richLeafKey(leaf)} style={richLeafStyle(leaf)}>{leaf.text}</span>
          ))}
        </a>
      );
    }
    const leaf = node as RichTextLeaf;
    const style = richLeafStyle(leaf);
    return Object.keys(style).length > 0
      ? <span key={richLeafKey(leaf)} style={style}>{leaf.text}</span>
      : leaf.text;
  });
}

function renderRichListItemContent(item: RichListItem, document?: DocumentModel): ReactNode {
  return renderRichInlineContent(item.children, document);
}

function richListItemKey(item: RichListItem): string {
  return `rich-list-item|${item.children.map((child) => (isRichTextLink(child) ? richLinkKey(child) : richLeafKey(child as RichTextLeaf))).join('|')}`;
}

function renderRichCodeBlock(block: RichCodeBlock, index: number): ReactNode {
  const language = block.language ?? 'plaintext';
  const rawText = block.children
    .map((line) => line.children.map((leaf) => leaf.text).join(''))
    .join('\n');
  const html = block.highlightedHtml ?? highlightCode(rawText, language);

  return (
    <pre
      key={richBlockKey(block, index)}
      className={`language-${language}`}
      data-code-theme={block.theme ?? 'light'}
      dir={block.direction ?? 'ltr'}
      style={{ margin: 0 }}
    >
      <code
        className={`language-${language}`}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-baked by Prism in editor/model layer
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}

function renderRichListBlock(
  block: RichListBlock,
  index: number,
  document?: DocumentModel,
): ReactNode {
  const sharedStyle: CSSProperties = {
    margin: 0,
    listStyleType: block.markerStyle,
  };

  if (block.type === 'ol') {
    return (
      <ol
        key={richBlockKey(block, index)}
        dir={block.direction ?? 'ltr'}
        start={block.start}
        style={sharedStyle}
      >
        {block.children.map((item) => (
          <li key={richListItemKey(item)}>
            {renderRichListItemContent(item, document)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul
      key={richBlockKey(block, index)}
      dir={block.direction ?? 'ltr'}
      style={sharedStyle}
    >
      {block.children.map((item) => (
        <li key={richListItemKey(item)}>
          {renderRichListItemContent(item, document)}
        </li>
      ))}
    </ul>
  );
}

export function renderRichContent(content: RichContent, document?: DocumentModel): ReactNode {
  return content.map((block, index) => {
    if (block.type === 'code-block') {
      return renderRichCodeBlock(block, index);
    }

    if (block.type === 'ul' || block.type === 'ol') {
      return renderRichListBlock(block, index, document);
    }

    const Tag = getRichTextBlockTag(block.type);
    return (
      <Tag
        key={richBlockKey(block, index)}
        dir={block.direction ?? 'ltr'}
        style={{
          margin: 0,
          ...(typeof block.lineHeight === 'number' ? { lineHeight: block.lineHeight } : {}),
        }}
      >
        {renderRichInlineContent(block.children, document)}
      </Tag>
    );
  });
}

function listItemKey(item: ListTextItem | DescriptionListItem, index: number): string {
  if ('text' in item) {
    return `${index}|${item.text}|${item.direction ?? 'ltr'}|${item.link?.href ?? ''}`;
  }
  return `${index}|${item.term}|${item.description}|${item.direction ?? 'ltr'}|${item.link?.href ?? ''}`;
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
        {content.items.map((item, index) => (
          <Fragment key={listItemKey(item, index)}>
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
        style={{ listStyleType: content.markerStyle, ...style }}
      >
        {content.items.map((item, index) => (
          <li key={listItemKey(item, index)} dir={item.direction ?? 'ltr'} tabIndex={tabIndex}>
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
      style={{ listStyleType: content.markerStyle, ...style }}
    >
      {content.items.map((item, index) => (
        <li key={listItemKey(item, index)} dir={item.direction ?? 'ltr'} tabIndex={tabIndex}>
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
  if (!isTextNode(node) || !node.link) {
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

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ') || undefined;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    disableTabNavigation = false,
    document,
    leafClassName,
    dataNodeId,
    currentPageId,
  } = options;
  const tabIndex = disableTabNavigation ? -1 : undefined;

  if (isTextNode(node) && node.subtype === 'rich') {
    const blockGap = typeof node.style?.blockGap === 'number'
      ? `${node.style.blockGap}px`
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
        {renderRichContent(node.content as RichContent, document)}
      </div>
    );
  }

  if (isMediaNode(node)) {
    return node.src ? (
      <img
        className={imageClassName}
        data-node-id={dataNodeId}
        style={contentStyle}
        src={node.src}
        alt={node.alt || 'Image'}
        draggable={imageDraggable}
      />
    ) : (
      <div className={imagePlaceholderClassName} data-node-id={dataNodeId} style={contentStyle}>{getNodeTextContent(node)}</div>
    );
  }

  if (isTextNode(node) && node.subtype === 'code') {
    const lang = node.code?.language ?? 'plaintext';
    const theme = node.code?.theme ?? 'light';
    const html = node.code?.highlightedHtml ?? escapeHtml(node.content as string);
    return (
      <pre
        className={joinClassNames(leafClassName, `language-${lang}`)}
        data-node-id={dataNodeId}
        data-code-theme={theme}
        style={{ margin: 0, ...contentStyle }}
      >
        <code
          className={`language-${lang}`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-baked by Prism in editor layer
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    );
  }

  if (isTextNode(node) && node.subtype === 'list') {
    return renderListContent(node.content as ListContent, {
      document,
      style: contentStyle,
      tabIndex,
      className: leafClassName,
      dataNodeId,
    });
  }

  if (isTextNode(node) && node.subtype === 'block') {
    const { link } = node;
    const isButton = link !== undefined && node.style?.background !== undefined;
    const isLink = link !== undefined;

    if (isButton) {
      const href = getLinkHref({ linkType: link.linkType, anchorTargetId: link.anchorTargetId, href: link.href, targetPageId: link.targetPageId, pageAnchorId: link.pageAnchorId });
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
          {node.content as string}
        </a>
      ) : (
        <button className={leafClassName} data-node-id={dataNodeId} type="button" tabIndex={tabIndex} style={contentStyle}>
          {node.content as string}
        </button>
      );
    }

    if (isLink) {
      const href = getLinkHref({ linkType: link.linkType, anchorTargetId: link.anchorTargetId, href: link.href, targetPageId: link.targetPageId, pageAnchorId: link.pageAnchorId });
      return (
        <a
          className={leafClassName}
          data-node-id={dataNodeId}
          href={href}
          tabIndex={tabIndex}
          style={contentStyle}
          {...getExternalNavigationProps(node)}
          {...getPageCurrentProps(link, currentPageId)}
        >
          {node.content as string}
        </a>
      );
    }

    const Tag = node.htmlTag ?? 'p';
    return <Tag className={leafClassName} data-node-id={dataNodeId} style={contentStyle}>{node.content as string}</Tag>;
  }

  return null;
}
