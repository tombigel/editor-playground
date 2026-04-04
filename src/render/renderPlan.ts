import type { CSSProperties } from 'react';
import type { DocumentModel, DocumentNode, ViewportMeasurement, WrapperNode } from '../model/types';
import type { PageId } from '../model/types/site';
import { resolveWrapperRenderPlan, type RenderMeasuredNodeSizes } from './layout';
import type {
  RenderLeafPlanNode,
  RenderRootPlan,
  RenderTrackSpacerEdge,
  RenderWrapperPlanNode,
} from './types';
import {
  getContentClassName,
  getContentSpacerClassName,
  getNodeClassName,
  getRootWrappers,
  getTrackClassName,
  getTrackSpacerClassName,
  getWrapperTag,
  getStickyTrackSpacerSequence,
  isBrandMark,
  isContentWrapperSticky,
  isSelfSticky,
  SITE_BRAND_MARK_CLASS,
  SITE_IMAGE_CLASS,
  SITE_IMAGE_PLACEHOLDER_CLASS,
  splitRootWrappers,
} from '../site/siteShared';
import { usesSyntheticStickyTrack } from './sticky';

type LeafNode = Extract<DocumentNode, { type: 'leaf' }>;

export function buildRenderRootPlan(
  document: DocumentModel,
  previewSticky: boolean,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport?: ViewportMeasurement,
  pageId?: PageId,
): RenderRootPlan {
  let wrappers: WrapperNode[];

  if (pageId && document.pages) {
    const page = document.pages.find((p) => p.id === pageId);
    if (page) {
      const sharedWrappers = (document.sharedRegionIds ?? [])
        .map((id) => document.nodes[id])
        .filter((node): node is WrapperNode => !!node && node.type === 'wrapper' && node.visible);
      const { header, footer } = splitRootWrappers(sharedWrappers);

      const sectionWrappers = page.sectionIds
        .map((id) => document.nodes[id])
        .filter((node): node is WrapperNode => !!node && node.type === 'wrapper' && node.visible);

      wrappers = [
        ...(header ? [header] : []),
        ...sectionWrappers,
        ...(footer ? [footer] : []),
      ];
    } else {
      wrappers = getRootWrappers(document);
    }
  } else {
    wrappers = getRootWrappers(document);
  }

  const { header, footer, main } = splitRootWrappers(wrappers);

  return {
    header: header ? buildWrapperPlan(document, header, true, previewSticky, measuredNodeSizes, viewport) : null,
    footer: footer ? buildWrapperPlan(document, footer, true, previewSticky, measuredNodeSizes, viewport) : null,
    main: main.map((wrapper) => buildWrapperPlan(document, wrapper, true, previewSticky, measuredNodeSizes, viewport)),
  };
}

function buildWrapperPlan(
  document: DocumentModel,
  node: WrapperNode,
  isTopLevel: boolean,
  previewSticky: boolean,
  measuredNodeSizes: RenderMeasuredNodeSizes,
  viewport?: ViewportMeasurement,
  meshPlacement?: CSSProperties,
): RenderWrapperPlanNode {
  const renderPlan = resolveWrapperRenderPlan(document, node, measuredNodeSizes, viewport);
  const spacerSequence = getStickyTrackSpacerSequence(node.sticky);
  const children = renderPlan.children.map((child) =>
    child.type === 'wrapper'
      ? buildWrapperPlan(
          document,
          child,
          false,
          previewSticky,
          measuredNodeSizes,
          viewport,
          renderPlan.meshLayout.childPlacements[child.id],
        )
      : buildLeafPlan(child, previewSticky, renderPlan.meshLayout.childPlacements[child.id]),
  );

  return {
    kind: 'wrapper',
    node,
    isTopLevel,
    tag: getWrapperTag(node.role),
    nodeClassName: getNodeClassName(node),
    meshPlacement,
    selfSticky: isSelfSticky(node.sticky, previewSticky),
    selfStickyTrack: previewSticky && usesSyntheticStickyTrack(node, { isTopLevel }),
    contentSticky: isContentWrapperSticky(node.sticky, previewSticky),
    trackClassName: getTrackClassName(node.id),
    spacerEdgesBefore: spacerSequence.before,
    spacerEdgesAfter: spacerSequence.after,
    contentClassName: getContentClassName(node.id),
    contentSpacerClassName: getContentSpacerClassName(node.id),
    stickyState: renderPlan.stickyState,
    registrationMap: renderPlan.registrationMap,
    extraExtent: renderPlan.extraExtent,
    meshLayout: renderPlan.meshLayout,
    children,
  };
}

function buildLeafPlan(
  node: LeafNode,
  previewSticky: boolean,
  meshPlacement?: CSSProperties,
): RenderLeafPlanNode {
  const spacerSequence = getStickyTrackSpacerSequence(node.sticky);
  const nodeClassName = getNodeClassName(node);
  const brandMark = isBrandMark(node);

  return {
    kind: 'leaf',
    node,
    nodeClassName: brandMark ? `${nodeClassName} ${SITE_BRAND_MARK_CLASS}` : nodeClassName,
    meshPlacement,
    selfSticky: isSelfSticky(node.sticky, previewSticky),
    selfStickyTrack: previewSticky && usesSyntheticStickyTrack(node),
    trackClassName: getTrackClassName(node.id),
    spacerEdgesBefore: spacerSequence.before,
    spacerEdgesAfter: spacerSequence.after,
    imageClassName: `${brandMark ? `${nodeClassName} ${SITE_BRAND_MARK_CLASS}` : nodeClassName} ${SITE_IMAGE_CLASS}`,
    imagePlaceholderClassName: `${nodeClassName} ${SITE_IMAGE_PLACEHOLDER_CLASS}`,
    isBrandMark: brandMark,
  };
}

export function getTrackSpacerDescriptor(nodeId: string, edge: RenderTrackSpacerEdge) {
  return {
    edge,
    key: `${nodeId}-${edge}`,
    className: getTrackSpacerClassName(nodeId, edge),
  };
}
