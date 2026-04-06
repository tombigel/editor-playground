import type { DocumentModel, DocumentNode } from '../model/types';
import { isSiteNode, isContainerNode, isLeafNode } from '../model/types';
import type { NodeDebugInfo, MeasuredNodeBounds } from './types';
import { getStickyEdgeMode, resolveStickyIsElevated } from '../render/sticky';

export function buildNodeDebugInfo(
  document: DocumentModel,
  node: Exclude<DocumentNode, { contentType: 'site' }>,
  options?: { documentRef?: Pick<Document, 'getElementById'> },
): NodeDebugInfo {
  const stageId = `stage-node-${node.id}`;

  // Determine htmlId
  let htmlId: string | null = null;
  if (isContainerNode(node) && node.parentId === document.rootId) {
    if (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer') {
      htmlId = node.id;
    }
  }

  // Get authored rect values
  const authoredRect = {
    x: node.rect.x.base.raw,
    y: node.rect.y.base.raw,
    width: node.rect.width.base.raw,
    height: node.rect.height.base.raw,
  };

  // Get measured bounds from DOM
  let measuredBounds: MeasuredNodeBounds | null = null;
  if (options?.documentRef) {
    const element = options.documentRef.getElementById(stageId);
    if (element) {
      const rect = element.getBoundingClientRect();
      measuredBounds = {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }
  }

  // Get global sticky elevation setting
  const siteNode = document.nodes[document.rootId];
  const globalStickyElevation = siteNode && isSiteNode(siteNode) ? (siteNode.stickyElevation ?? true) : true;

  // Build sticky info
  let sticky: NodeDebugInfo['sticky'];
  if (!node.sticky?.enabled) {
    sticky = {
      enabled: false,
      target: null,
      edges: 'none',
      durationMode: null,
      elevated: null,
      offsetTop: null,
      offsetBottom: null,
      duration: null,
      durationTop: null,
      durationBottom: null,
    };
  } else {
    const edgeMode = getStickyEdgeMode(node.sticky);
    const elevated = resolveStickyIsElevated(node.sticky, globalStickyElevation);
    sticky = {
      enabled: true,
      target: node.sticky.target,
      edges: edgeMode,
      durationMode: node.sticky.durationMode ?? null,
      elevated,
      offsetTop: node.sticky.offsetTop?.raw ?? null,
      offsetBottom: node.sticky.offsetBottom?.raw ?? null,
      duration: node.sticky.duration.raw,
      durationTop: node.sticky.durationTop?.raw ?? null,
      durationBottom: node.sticky.durationBottom?.raw ?? null,
    };
  }

  // Build animation info
  let animation: NodeDebugInfo['animation'];
  if (!node.animation) {
    animation = {
      enabled: false,
      isTriggerTarget: false,
      triggerId: null,
      trigger: null,
      effect: null,
      effectKind: null,
      requiresSticky: null,
      rawConfig: null,
    };
  } else {
    const isTriggerTarget = Object.values(document.nodes).some(
      n => !isSiteNode(n) && n.animation?.triggerId === node.id,
    );
    const effect =
      node.animation.effect.kind === 'keyframe' ? node.animation.effect.name : node.animation.effect.type;
    animation = {
      enabled: true,
      isTriggerTarget,
      triggerId: node.animation.triggerId ?? null,
      trigger: node.animation.trigger ?? null,
      effect,
      effectKind: node.animation.effect.kind,
      requiresSticky: node.animation.requiresSticky ?? null,
      rawConfig: node.animation,
    };
  }

  return {
    dataId: node.id,
    htmlId,
    stageId,
    name: node.name,
    family: node.contentType,
    subtype: isContainerNode(node) || isLeafNode(node) ? node.subtype : 'unknown',
    parentId: node.parentId,
    authoredRect,
    measuredBounds,
    sticky,
    animation,
  };
}
