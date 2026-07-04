import type { CSSProperties } from 'react';
import type { ContainerNode, DocumentModel, DocumentNode, ViewportMeasurement } from '../model/types';
import { isContainerNode } from '../model/types';
import type { PageId } from '../model/types/site';
import {
  collectHiddenSelectionScope,
  getEditorStageRootWrappers,
  isNodeEffectivelyHidden,
} from '../model/selectors';

import { resolveWrapperRenderPlan, type RenderMeasuredNodeSizes } from './layout';
import type {
  RenderHiddenState,
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
  getRootWrappersForPage,
  getTrackClassName,
  getTrackSpacerClassName,
  getWrapperTag,
  getStickyTrackSpacerSequence,
  isBrandMark,
  isContentWrapperSticky,
  isSelfSticky,
  SITE_BRAND_MARK_CLASS,
  SITE_IMAGE_CLASS,
  SITE_VIDEO_CLASS,
  SITE_SVG_CLASS,
  SITE_IMAGE_PLACEHOLDER_CLASS,
  splitRootWrappers,
} from '../site/siteShared';
import { usesSyntheticStickyTrack } from './sticky';

type LeafNode = Extract<DocumentNode, { contentType: 'text' | 'media' }>;

export function buildRenderRootPlan(
  document: DocumentModel,
  previewSticky: boolean,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport?: ViewportMeasurement,
  pageId?: PageId,
): RenderRootPlan {
  let wrappers: ContainerNode[];

  if (pageId && document.pages) {
    wrappers = getRootWrappersForPage(document, pageId) as ContainerNode[];
  } else {
    wrappers = getRootWrappers(document) as ContainerNode[];
  }

  const { header, footer, main } = splitRootWrappers(wrappers);

  return {
    header: header ? buildWrapperPlan(document, header, true, previewSticky, measuredNodeSizes, viewport) : null,
    footer: footer ? buildWrapperPlan(document, footer, true, previewSticky, measuredNodeSizes, viewport) : null,
    main: main.map((wrapper) => buildWrapperPlan(document, wrapper, true, previewSticky, measuredNodeSizes, viewport)),
  };
}

export function buildStageRenderRootPlan(
  document: DocumentModel,
  previewSticky: boolean,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
  viewport?: ViewportMeasurement,
  pageId?: PageId,
  options: {
    showHidden: boolean;
    selectedIds?: string[];
  } = {
    showHidden: true,
  },
): RenderRootPlan {
  const wrappers = getEditorStageRootWrappers(document, pageId);
  const { header, footer, main } = splitRootWrappers(wrappers);
  const hiddenSelectionScope =
    options.showHidden ? new Set<string>() : collectHiddenSelectionScope(document, options.selectedIds ?? []);

  return {
    header: header
      ? buildStageWrapperPlan(document, header, true, previewSticky, measuredNodeSizes, viewport, options.showHidden, hiddenSelectionScope, options.selectedIds ?? [])
      : null,
    footer: footer
      ? buildStageWrapperPlan(document, footer, true, previewSticky, measuredNodeSizes, viewport, options.showHidden, hiddenSelectionScope, options.selectedIds ?? [])
      : null,
    main: main.map((wrapper) =>
      buildStageWrapperPlan(document, wrapper, true, previewSticky, measuredNodeSizes, viewport, options.showHidden, hiddenSelectionScope, options.selectedIds ?? []),
    ),
  };
}

function buildWrapperPlan(
  document: DocumentModel,
  node: ContainerNode,
  isTopLevel: boolean,
  previewSticky: boolean,
  measuredNodeSizes: RenderMeasuredNodeSizes,
  viewport?: ViewportMeasurement,
  meshPlacement?: CSSProperties,
): RenderWrapperPlanNode {
  const renderPlan = resolveWrapperRenderPlan(document, node, measuredNodeSizes, viewport);
  const spacerSequence = getStickyTrackSpacerSequence(node.sticky);
  const children = renderPlan.children.map((child) =>
    isContainerNode(child)
      ? buildWrapperPlan(
          document,
          child,
          false,
          previewSticky,
          measuredNodeSizes,
          viewport,
          renderPlan.meshLayout.childPlacements[child.id],
        )
      : buildLeafPlan(child as LeafNode, previewSticky, renderPlan.meshLayout.childPlacements[child.id]),
  );

  return {
    kind: 'wrapper',
    node,
    hiddenState: buildVisibleHiddenState(node.id),
    isTopLevel,
    tag: getWrapperTag(node.subtype),
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
    hiddenState: buildVisibleHiddenState(node.id),
    nodeClassName: brandMark ? `${nodeClassName} ${SITE_BRAND_MARK_CLASS}` : nodeClassName,
    meshPlacement,
    selfSticky: isSelfSticky(node.sticky, previewSticky),
    selfStickyTrack: previewSticky && usesSyntheticStickyTrack(node),
    trackClassName: getTrackClassName(node.id),
    spacerEdgesBefore: spacerSequence.before,
    spacerEdgesAfter: spacerSequence.after,
    imageClassName: `${brandMark ? `${nodeClassName} ${SITE_BRAND_MARK_CLASS}` : nodeClassName} ${SITE_IMAGE_CLASS}`,
    videoClassName: `${nodeClassName} ${SITE_VIDEO_CLASS}`,
    svgClassName: `${nodeClassName} ${SITE_SVG_CLASS}`,
    imagePlaceholderClassName: `${nodeClassName} ${SITE_IMAGE_PLACEHOLDER_CLASS}`,
    isBrandMark: brandMark,
  };
}

function buildStageWrapperPlan(
  document: DocumentModel,
  node: ContainerNode,
  isTopLevel: boolean,
  previewSticky: boolean,
  measuredNodeSizes: RenderMeasuredNodeSizes,
  viewport: ViewportMeasurement | undefined,
  showHidden: boolean,
  hiddenSelectionScope: ReadonlySet<string>,
  selectedIds: string[],
  meshPlacement?: CSSProperties,
): RenderWrapperPlanNode {
  const renderPlan = resolveWrapperRenderPlan(document, node, measuredNodeSizes, viewport, { includeHidden: true });
  const spacerSequence = getStickyTrackSpacerSequence(node.sticky);
  const children = renderPlan.children.map((child) =>
    isContainerNode(child)
      ? buildStageWrapperPlan(
          document,
          child,
          false,
          previewSticky,
          measuredNodeSizes,
          viewport,
          showHidden,
          hiddenSelectionScope,
          selectedIds,
          renderPlan.meshLayout.childPlacements[child.id],
        )
      : buildStageLeafPlan(
          document,
          child as LeafNode,
          previewSticky,
          showHidden,
          hiddenSelectionScope,
          selectedIds,
          renderPlan.meshLayout.childPlacements[child.id],
        ),
  );

  return {
    kind: 'wrapper',
    node,
    hiddenState: buildStageHiddenState(document, node.id, showHidden, hiddenSelectionScope, selectedIds),
    isTopLevel,
    tag: getWrapperTag(node.subtype),
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

function buildStageLeafPlan(
  document: DocumentModel,
  node: LeafNode,
  previewSticky: boolean,
  showHidden: boolean,
  hiddenSelectionScope: ReadonlySet<string>,
  selectedIds: string[],
  meshPlacement?: CSSProperties,
): RenderLeafPlanNode {
  const spacerSequence = getStickyTrackSpacerSequence(node.sticky);
  const nodeClassName = getNodeClassName(node);
  const brandMark = isBrandMark(node);

  return {
    kind: 'leaf',
    node,
    hiddenState: buildStageHiddenState(document, node.id, showHidden, hiddenSelectionScope, selectedIds),
    nodeClassName: brandMark ? `${nodeClassName} ${SITE_BRAND_MARK_CLASS}` : nodeClassName,
    meshPlacement,
    selfSticky: isSelfSticky(node.sticky, previewSticky),
    selfStickyTrack: previewSticky && usesSyntheticStickyTrack(node),
    trackClassName: getTrackClassName(node.id),
    spacerEdgesBefore: spacerSequence.before,
    spacerEdgesAfter: spacerSequence.after,
    imageClassName: `${brandMark ? `${nodeClassName} ${SITE_BRAND_MARK_CLASS}` : nodeClassName} ${SITE_IMAGE_CLASS}`,
    videoClassName: `${nodeClassName} ${SITE_VIDEO_CLASS}`,
    svgClassName: `${nodeClassName} ${SITE_SVG_CLASS}`,
    imagePlaceholderClassName: `${nodeClassName} ${SITE_IMAGE_PLACEHOLDER_CLASS}`,
    isBrandMark: brandMark,
  };
}

function buildVisibleHiddenState(_nodeId: string): RenderHiddenState {
  return {
    isEffectivelyHidden: false,
    isGhostVisible: false,
    isHiddenSelected: false,
  };
}

function buildStageHiddenState(
  document: DocumentModel,
  nodeId: string,
  showHidden: boolean,
  hiddenSelectionScope: ReadonlySet<string>,
  selectedIds: string[],
): RenderHiddenState {
  const isEffectivelyHidden = isNodeEffectivelyHidden(document, nodeId);
  return {
    isEffectivelyHidden,
    isGhostVisible: isEffectivelyHidden && (showHidden || hiddenSelectionScope.has(nodeId)),
    isHiddenSelected: isEffectivelyHidden && selectedIds.includes(nodeId),
  };
}

export function getTrackSpacerDescriptor(nodeId: string, edge: RenderTrackSpacerEdge) {
  return {
    edge,
    key: `${nodeId}-${edge}`,
    className: getTrackSpacerClassName(nodeId, edge),
  };
}
