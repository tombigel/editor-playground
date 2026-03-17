import type { ReactNode } from 'react';
import type {
  PresentationLeafNode as LeafNode,
  RenderLeafContentOptions,
  StageOrSiteNode,
} from './types';
export type { PresentationLeafNode, RenderLeafContentOptions, StageOrSiteNode } from './types';

export function formatNodeLabel(node: StageOrSiteNode) {
  return `${node.role.charAt(0).toUpperCase()}${node.role.slice(1)}`;
}

export function getNodeAriaLabel(node: StageOrSiteNode) {
  const roleLabel = formatNodeLabel(node);
  return node.name && node.name !== roleLabel ? `${roleLabel}: ${node.name}` : roleLabel;
}

export function getNodeTextContent(node: LeafNode) {
  if (node.role === 'text') {
    return node.content;
  }
  if (node.role === 'image') {
    return node.alt ?? 'Image';
  }
  return node.label;
}

export function isBrandMark(node: LeafNode) {
  return node.role === 'image' && node.name === 'Brand Mark';
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

  switch (node.role) {
    case 'text': {
      const Tag = node.htmlTag;
      return <Tag style={contentStyle}>{node.content}</Tag>;
    }
    case 'image':
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
    case 'link':
      return (
        <a href={node.href} tabIndex={tabIndex} style={contentStyle}>
          {getNodeTextContent(node)}
        </a>
      );
    case 'button':
      return (
        <button type="button" tabIndex={tabIndex} style={contentStyle}>
          {getNodeTextContent(node)}
        </button>
      );
  }
}
