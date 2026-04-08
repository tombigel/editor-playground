import type { CSSProperties, ReactNode } from 'react';
import { getLinkHref, shouldOpenNavigationInNewTab } from '../model/links';
import { getTextContent, isRichTextLink } from '../model/richContent';
import { isMediaNode, isTextNode } from '../model/types';
import type {
  DocumentModel,
  RichContent,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
} from '../model/types';
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
    if (node.subtype === 'block' && node.style?.background) return 'Button';
    if (node.subtype === 'block' && node.link != null) return 'Link';
    return 'Text';
  }
  return 'Image';
}

export function getNodeAriaLabel(node: StageOrSiteNode) {
  const roleLabel = formatNodeLabel(node);
  return node.name && node.name !== roleLabel ? `${roleLabel}: ${node.name}` : roleLabel;
}

export function getNodeTextContent(node: LeafNode): string {
  if (isTextNode(node)) {
    return getTextContent(node.content);
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

function richBlockKey(block: RichTextBlock, index: number): string {
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

export function renderRichContent(content: RichContent, document?: DocumentModel): ReactNode {
  return content.map((block, index) => {
    const Tag = getRichTextBlockTag(block.type);
    return (
      <Tag key={richBlockKey(block, index)}>
        {renderRichInlineContent(block.children, document)}
      </Tag>
    );
  });
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderLeafContent(node: LeafNode, options: RenderLeafContentOptions = {}): ReactNode {
  const {
    contentStyle,
    imageClassName,
    imagePlaceholderClassName,
    imageDraggable = true,
    disableTabNavigation = false,
    document,
  } = options;
  const tabIndex = disableTabNavigation ? -1 : undefined;

  if (isTextNode(node) && node.subtype === 'rich') {
    return (
      <div style={contentStyle}>
        {renderRichContent(node.content as RichContent, document)}
      </div>
    );
  }

  if (isMediaNode(node)) {
    return node.src ? (
      <img
        className={imageClassName}
        style={contentStyle}
        src={node.src}
        alt={node.alt || 'Image'}
        draggable={imageDraggable}
      />
    ) : (
      <div className={imagePlaceholderClassName} style={contentStyle}>{getNodeTextContent(node)}</div>
    );
  }

  if (isTextNode(node) && node.subtype === 'code') {
    const lang = node.code?.language ?? 'plaintext';
    const theme = node.code?.theme ?? 'light';
    const html = node.code?.highlightedHtml ?? escapeHtml(node.content as string);
    return (
      <pre className={`language-${lang}`} data-code-theme={theme} style={{ margin: 0, ...contentStyle }}>
        <code
          className={`language-${lang}`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-baked by Prism in editor layer
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    );
  }

  if (isTextNode(node) && node.subtype === 'block') {
    const { link } = node;
    const isButton = link !== undefined && node.style?.background !== undefined;
    const isLink = link !== undefined;

    if (isButton) {
      const href = getLinkHref({ linkType: link.linkType, anchorTargetId: link.anchorTargetId, href: link.href, targetPageId: link.targetPageId, pageAnchorId: link.pageAnchorId });
      return href ? (
        <a href={href} tabIndex={tabIndex} style={contentStyle} {...getExternalNavigationProps(node)}>
          {node.content as string}
        </a>
      ) : (
        <button type="button" tabIndex={tabIndex} style={contentStyle}>
          {node.content as string}
        </button>
      );
    }

    if (isLink) {
      const href = getLinkHref({ linkType: link.linkType, anchorTargetId: link.anchorTargetId, href: link.href, targetPageId: link.targetPageId, pageAnchorId: link.pageAnchorId });
      return (
        <a href={href} tabIndex={tabIndex} style={contentStyle} {...getExternalNavigationProps(node)}>
          {node.content as string}
        </a>
      );
    }

    const Tag = node.htmlTag ?? 'p';
    return <Tag style={contentStyle}>{node.content as string}</Tag>;
  }

  return null;
}
