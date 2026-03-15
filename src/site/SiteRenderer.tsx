import type { CSSProperties } from 'react';
import { getChildren } from '../model/selectors';
import type { DocumentModel, DocumentNode, StickyDefinition, WrapperNode } from '../model/types';
import { formatValue } from '../model/units';

export type SiteRendererProps = {
  document: DocumentModel;
  previewSticky?: boolean;
};

export function SiteRenderer({ document, previewSticky = true }: SiteRendererProps) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return null;
  }

  const wrappers = getChildren(document, root.id).filter((node): node is WrapperNode => node.type === 'wrapper');

  return (
    <div className="site-renderer" style={{ width: '100%' }}>
      {wrappers.map((wrapper) => renderWrapper(document, wrapper, true, previewSticky))}
    </div>
  );
}

function renderWrapper(
  document: DocumentModel,
  node: WrapperNode,
  isTopLevel: boolean,
  previewSticky: boolean,
): JSX.Element {
  const Tag: 'section' | 'header' | 'footer' | 'div' =
    node.role === 'header' ? 'header' : node.role === 'footer' ? 'footer' : node.role === 'section' ? 'section' : 'div';
  const children = getChildren(document, node.id).filter((child): child is Exclude<DocumentNode, { type: 'site' }> => child.type !== 'site');

  const wrapperStyle: CSSProperties = {
    position: isTopLevel ? 'relative' : 'absolute',
    left: isTopLevel ? undefined : node.rect.x.base.raw,
    top: isTopLevel ? undefined : node.rect.y.base.raw,
    width: formatValue(node.rect.width.base.parsed),
    minHeight: formatNodeHeight(node),
    background: node.style.background,
    borderStyle: 'solid',
    borderColor: node.style.borderColor,
    borderWidth: node.style.borderWidth ? formatValue(node.style.borderWidth.parsed) : '1px',
    paddingTop: node.style.paddingTop ? formatValue(node.style.paddingTop.parsed) : undefined,
    paddingRight: node.style.paddingRight ? formatValue(node.style.paddingRight.parsed) : undefined,
    paddingBottom: node.style.paddingBottom ? formatValue(node.style.paddingBottom.parsed) : undefined,
    paddingLeft: node.style.paddingLeft ? formatValue(node.style.paddingLeft.parsed) : undefined,
    ...(previewSticky ? stickyCss(node.sticky) : {}),
  };

  return (
    <Tag key={node.id} style={wrapperStyle}>
      <div style={{ position: 'relative', minHeight: 1 }}>
        {children.map((child) =>
          child.type === 'wrapper'
            ? renderWrapper(document, child, false, previewSticky)
            : renderLeaf(child, previewSticky),
        )}
      </div>
    </Tag>
  );
}

function renderLeaf(node: Extract<DocumentNode, { type: 'leaf' }>, previewSticky: boolean) {
  const style: CSSProperties = {
    position: 'absolute',
    left: node.rect.x.base.raw,
    top: node.rect.y.base.raw,
    width: formatValue(node.rect.width.base.parsed),
    minHeight: formatNodeHeight(node),
    ...(previewSticky ? stickyCss(node.sticky) : {}),
  };

  if (node.role === 'text') {
    const Tag = node.htmlTag;
    return (
      <Tag key={node.id} style={{ ...style, margin: 0, color: node.style?.color, fontWeight: node.style?.fontWeight, fontStyle: node.style?.fontStyle, textDecorationLine: node.style?.textDecorationLine, lineHeight: node.style?.lineHeight, direction: node.style?.direction, fontSize: node.style?.fontSize ? formatValue(node.style.fontSize.parsed) : undefined }}>
        {node.content}
      </Tag>
    );
  }

  if (node.role === 'image') {
    return node.src ? (
      <img key={node.id} src={node.src} alt={node.alt ?? ''} style={{ ...style, display: 'block', height: 'auto' }} />
    ) : (
      <div key={node.id} style={style}>Image</div>
    );
  }

  if (node.role === 'link') {
    return (
      <a key={node.id} href={node.href} style={style}>
        {node.label}
      </a>
    );
  }

  return (
    <button key={node.id} type="button" style={style}>
      {node.label}
    </button>
  );
}

function stickyCss(sticky: StickyDefinition | undefined): CSSProperties {
  if (!sticky?.enabled || sticky.target !== 'self') {
    return {};
  }

  const bottom = sticky.edges.bottom ?? false;
  const top = sticky.edges.top ?? !bottom;
  if (top && bottom) {
    return {
      position: 'sticky',
      top: sticky.offsetTop?.raw ?? '0px',
      bottom: sticky.offsetBottom?.raw ?? '0px',
      zIndex: 1,
    };
  }

  if (bottom) {
    return {
      position: 'sticky',
      bottom: sticky.offsetBottom?.raw ?? '0px',
      zIndex: 1,
    };
  }

  return {
    position: 'sticky',
    top: sticky.offsetTop?.raw ?? '0px',
    zIndex: 1,
  };
}

function formatNodeHeight(node: Exclude<DocumentNode, { type: 'site' }>) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return formatValue(height);
  }
  if (height.keyword === 'aspect-ratio') {
    return undefined;
  }
  return undefined;
}
