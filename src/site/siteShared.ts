import { getChildren } from '../model/selectors';
import type { DocumentModel, DocumentNode, StickyDefinition, WrapperNode } from '../model/types';
import { formatValue } from '../model/units';

export const SITE_ROOT_CLASS = 'sp-site';
export const SITE_MAIN_CLASS = 'sp-site-main';
export const SITE_NODE_CLASS = 'sp-node';
export const SITE_WRAPPER_CLASS = 'sp-wrapper';
export const SITE_LEAF_CLASS = 'sp-leaf';
export const SITE_TRACK_CLASS = 'sp-sticky-track';
export const SITE_SPACER_CLASS = 'sp-sticky-spacer';
export const SITE_SPACER_TOP_CLASS = 'sp-sticky-spacer-top';
export const SITE_SPACER_BOTTOM_CLASS = 'sp-sticky-spacer-bottom';
export const SITE_CONTENT_CLASS = 'sp-wrapper-content';
export const SITE_CONTENT_SPACER_CLASS = 'sp-content-spacer';
export const SITE_IMAGE_CLASS = 'sp-image';
export const SITE_IMAGE_PLACEHOLDER_CLASS = 'sp-image-placeholder';
export const SITE_BRAND_MARK_CLASS = 'is-brand-mark';

type ExportableNode = Exclude<DocumentNode, { type: 'site' }>;

export function getRootWrappers(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return [];
  }
  return getChildren(document, root.id).filter((node): node is WrapperNode => node.type === 'wrapper');
}

export function getWrapperChildren(document: DocumentModel, wrapperId: string) {
  return getChildren(document, wrapperId).filter(
    (child): child is ExportableNode => child.type !== 'site',
  );
}

export function splitRootWrappers(wrappers: WrapperNode[]) {
  const header = wrappers.find((node) => node.role === 'header') ?? null;
  const footer = wrappers.find((node) => node.role === 'footer') ?? null;
  const main = wrappers.filter((node) => node.role !== 'header' && node.role !== 'footer');

  return { header, footer, main };
}

export function getWrapperTag(role: WrapperNode['role']): 'section' | 'header' | 'footer' | 'div' {
  if (role === 'header') {
    return 'header';
  }
  if (role === 'footer') {
    return 'footer';
  }
  if (role === 'section') {
    return 'section';
  }
  return 'div';
}

export function getNodeClassName(node: ExportableNode) {
  return `${SITE_NODE_CLASS} sp-node-${node.id} sp-role-${node.role} ${node.type === 'wrapper' ? SITE_WRAPPER_CLASS : SITE_LEAF_CLASS}`;
}

export function getTrackClassName(nodeId: string) {
  return `${SITE_TRACK_CLASS} sp-node-${nodeId}-track`;
}

export function getSpacerClassName(nodeId: string) {
  return `${SITE_SPACER_CLASS} sp-node-${nodeId}-spacer`;
}

export function getTrackSpacerClassName(nodeId: string, edge: 'top' | 'bottom') {
  return `${SITE_SPACER_CLASS} ${edge === 'top' ? SITE_SPACER_TOP_CLASS : SITE_SPACER_BOTTOM_CLASS} sp-node-${nodeId}-${edge}-spacer`;
}

export function getContentClassName(nodeId: string) {
  return `${SITE_CONTENT_CLASS} sp-node-${nodeId}-content`;
}

export function getContentSpacerClassName(nodeId: string) {
  return `${SITE_CONTENT_SPACER_CLASS} sp-node-${nodeId}-content-spacer`;
}

export function isSelfSticky(sticky: StickyDefinition | undefined, previewSticky: boolean) {
  return Boolean(previewSticky && sticky?.enabled && sticky.target === 'self');
}

export function isContentWrapperSticky(sticky: StickyDefinition | undefined, previewSticky: boolean) {
  return Boolean(previewSticky && sticky?.enabled && sticky.target === 'contentWrapper');
}

export function getStickyEdgeMode(sticky: StickyDefinition | undefined): 'top' | 'bottom' | 'both' {
  if (!sticky) {
    return 'top';
  }
  const bottom = sticky.edges.bottom ?? false;
  const top = sticky.edges.top ?? !bottom;
  if (top && bottom) {
    return 'both';
  }
  return bottom ? 'bottom' : 'top';
}

export function getStickyDurationCss(sticky: StickyDefinition | undefined) {
  if (!sticky?.enabled || sticky.durationMode === 'auto') {
    return '0px';
  }

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'both') {
    return `calc(${(sticky.durationTop ?? sticky.duration).raw} + ${(sticky.durationBottom ?? sticky.duration).raw})`;
  }
  if (edgeMode === 'bottom') {
    return (sticky.durationBottom ?? sticky.duration).raw;
  }
  return (sticky.durationTop ?? sticky.duration).raw;
}

export function getStickyTrackSpacerSequence(sticky: StickyDefinition | undefined) {
  if (!sticky?.enabled || sticky.target !== 'self' || sticky.durationMode === 'auto') {
    return { before: [] as Array<'top' | 'bottom'>, after: [] as Array<'top' | 'bottom'> };
  }

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'bottom') {
    return { before: ['bottom'] as Array<'top' | 'bottom'>, after: [] as Array<'top' | 'bottom'> };
  }
  if (edgeMode === 'both') {
    return { before: ['bottom'] as Array<'top' | 'bottom'>, after: ['top'] as Array<'top' | 'bottom'> };
  }
  return { before: [] as Array<'top' | 'bottom'>, after: ['top'] as Array<'top' | 'bottom'> };
}

export function getStickyTrackSpacerCss(sticky: StickyDefinition | undefined, edge: 'top' | 'bottom') {
  if (!sticky?.enabled || sticky.target !== 'self' || sticky.durationMode === 'auto') {
    return '0px';
  }

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'both') {
    return edge === 'top'
      ? (sticky.durationTop ?? sticky.duration).raw
      : (sticky.durationBottom ?? sticky.duration).raw;
  }
  if (edgeMode === 'bottom') {
    return edge === 'bottom' ? (sticky.durationBottom ?? sticky.duration).raw : '0px';
  }
  return edge === 'top' ? (sticky.durationTop ?? sticky.duration).raw : '0px';
}

export function getStickyCssDeclarations(sticky: StickyDefinition | undefined) {
  if (!sticky?.enabled) {
    return [];
  }

  const edgeMode = getStickyEdgeMode(sticky);
  const declarations = ['position: sticky', 'z-index: 1'];
  if (edgeMode === 'both' || edgeMode === 'top') {
    declarations.push(`top: ${sticky.offsetTop?.raw ?? '0px'}`);
  }
  if (edgeMode === 'both' || edgeMode === 'bottom') {
    declarations.push(`bottom: ${sticky.offsetBottom?.raw ?? '0px'}`);
  }
  return declarations;
}

export function formatNodeHeight(node: ExportableNode) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return formatValue(height);
  }
  return undefined;
}

export function getNodeTextContent(node: Extract<DocumentNode, { type: 'leaf' }>) {
  if (node.role === 'text') {
    return node.content;
  }
  if (node.role === 'image') {
    return node.alt ?? 'Image';
  }
  return node.label;
}

export function isBrandMark(node: Extract<DocumentNode, { type: 'leaf' }>) {
  return node.role === 'image' && node.name === 'Brand Mark';
}
