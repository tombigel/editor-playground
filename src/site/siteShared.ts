import type { AnimationDefinition } from '../animations/types';
import { getChildren } from '../model/selectors';
import type { ContainerNode, ContainerSubtype, DocumentModel, NodeId, StickyDefinition } from '../model/types';
import { isContainerNode } from '../model/types';
import type { PageId } from '../model/types/site';
import { formatValue } from '../model/units';
import { isTopLevelWrapperVisibleOnPage } from '../model/topLevelWrapperVisibility';
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
export const SITE_VIDEO_CLASS = 'sp-video';
export const SITE_IMAGE_PLACEHOLDER_CLASS = 'sp-image-placeholder';
export const SITE_BRAND_MARK_CLASS = 'is-brand-mark';

export function getRootWrappers(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return [];
  }
  return getChildren(document, root.id).filter((node): node is ContainerNode => isContainerNode(node) && node.visible);
}

export function getRootWrappersForPage(document: DocumentModel, pageId: PageId) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return [];
  }

  return root.children
    .map((id) => document.nodes[id])
    .filter(
      (node): node is ContainerNode =>
        !!node &&
        isContainerNode(node) &&
        isTopLevelWrapperVisibleOnPage(document, node.id, pageId),
    );
}

export function getWrapperChildren(document: DocumentModel, wrapperId: string) {
  return getChildren(document, wrapperId).filter(
    (child): child is ExportableNode => child.contentType !== 'site' && child.visible,
  );
}

export function splitRootWrappers(wrappers: ContainerNode[]) {
  const header = wrappers.find((node) => node.subtype === 'header') ?? null;
  const footer = wrappers.find((node) => node.subtype === 'footer') ?? null;
  const main = wrappers.filter((node) => node.subtype !== 'header' && node.subtype !== 'footer');

  return { header, footer, main };
}

export function getWrapperTag(subtype: ContainerSubtype): 'section' | 'header' | 'footer' | 'div' {
  if (subtype === 'header') {
    return 'header';
  }
  if (subtype === 'footer') {
    return 'footer';
  }
  if (subtype === 'section') {
    return 'section';
  }
  return 'div';
}

function getCssRole(node: ExportableNode): string {
  if (isContainerNode(node)) return node.subtype;
  if (node.contentType === 'media') return node.subtype;
  if (node.contentType === 'text') {
    if (node.style?.background) return 'button';
    if (node.link != null) return 'link';
    return 'text';
  }
  return 'site';
}

export function getNodeClassName(node: ExportableNode) {
  const cssRole = getCssRole(node);
  return `${SITE_NODE_CLASS} sp-node-${node.id} sp-role-${cssRole} ${isContainerNode(node) ? SITE_WRAPPER_CLASS : SITE_LEAF_CLASS}`;
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
    if (node.contentType === 'site') continue;
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
