import type { AnimationDefinition } from '../animations/types';
import { getChildren } from '../model/selectors';
import type { DocumentModel, NodeId, StickyDefinition, WrapperNode } from '../model/types';
import { formatValue } from '../model/units';
import { getStickyCssProperties, getStickyEdgeMode } from '../render/sticky';
import type { RenderExportableNode as ExportableNode } from '../render/types';

export { getNodeTextContent, isBrandMark } from '../render/nodePresentation';
export { getStickyEdgeMode } from '../render/sticky';

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

export function getRootWrappers(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return [];
  }
  return getChildren(document, root.id).filter((node): node is WrapperNode => node.type === 'wrapper' && node.visible);
}

export function getWrapperChildren(document: DocumentModel, wrapperId: string) {
  return getChildren(document, wrapperId).filter(
    (child): child is ExportableNode => child.type !== 'site' && child.visible,
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
  return Object.entries(getStickyCssProperties(sticky, { includePosition: true, includeZIndex: true })).map(
    ([key, value]) => `${toCssPropertyName(key)}: ${String(value)}`,
  );
}

export function formatNodeHeight(node: ExportableNode) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return formatValue(height);
  }
  return undefined;
}

function toCssPropertyName(property: string) {
  return property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Build the set of node IDs that need a `data-interact-key` attribute in
 * the site export. This includes:
 * - Every node that has an animation (the target)
 * - Every node referenced as a triggerId by another node's animation (the trigger)
 */
export function collectInteractKeys(document: DocumentModel): Set<NodeId> {
  const keys = new Set<NodeId>();
  for (const node of Object.values(document.nodes)) {
    if (node.type === 'site') continue;
    const anim = (node as unknown as { animation?: AnimationDefinition }).animation;
    if (anim) {
      keys.add(node.id);
      if (anim.triggerId) {
        keys.add(anim.triggerId);
      }
    }
  }
  return keys;
}
