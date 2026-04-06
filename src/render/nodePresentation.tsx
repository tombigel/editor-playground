import type { ReactNode } from 'react';
import { getLinkHref, shouldOpenNavigationInNewTab } from '../model/links';
import { isMediaNode, isTextNode } from '../model/types';
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
    if (node.style?.background) return 'Button';
    if (node.link != null) return 'Link';
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
    // RichContent rendering handled by renderRichContent; here return plain text for labels/aria
    return typeof node.content === 'string' ? node.content : '';
  }
  if (isMediaNode(node)) {
    return node.alt ?? 'Image';
  }
  return '';
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

export function renderLeafContent(node: LeafNode, options: RenderLeafContentOptions = {}): ReactNode {
  const {
    contentStyle,
    imageClassName,
    imagePlaceholderClassName,
    imageDraggable = true,
    disableTabNavigation = false,
  } = options;
  const tabIndex = disableTabNavigation ? -1 : undefined;

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

  if (isTextNode(node)) {
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
