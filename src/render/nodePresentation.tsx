import type { ReactNode } from 'react';
import type {
  PresentationLeafNode as LeafNode,
  RenderLeafContentOptions,
  StageOrSiteNode,
} from './types/nodePresentation';
export type { PresentationLeafNode, RenderLeafContentOptions, StageOrSiteNode } from './types/nodePresentation';

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
    textStyle,
    imageClassName,
    imagePlaceholderClassName,
    imageDraggable = true,
    disableTabNavigation = false,
  } = options;
  const tabIndex = disableTabNavigation ? -1 : undefined;

  switch (node.role) {
    case 'text': {
      const Tag = node.htmlTag;
      return <Tag style={textStyle}>{node.content}</Tag>;
    }
    case 'image':
      return node.src ? (
        <img
          className={imageClassName}
          src={node.src}
          alt={node.alt || 'Image'}
          draggable={imageDraggable}
        />
      ) : (
        <div className={imagePlaceholderClassName}>{getNodeTextContent(node)}</div>
      );
    case 'link':
      return (
        <a href={node.href} tabIndex={tabIndex}>
          {getNodeTextContent(node)}
        </a>
      );
    case 'button':
      return (
        <button type="button" tabIndex={tabIndex}>
          {getNodeTextContent(node)}
        </button>
      );
  }
}
