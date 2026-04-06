import type { CSSProperties } from 'react';
import type {
  ContainerNode,
  DocumentModel,
  NodeId,
  RichContent,
  ViewportMeasurement,
} from '../../model/types';
import { formatValue } from '../../model/units';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../../render/leafPresentation';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  isBrandMark,
  renderLeafContent,
} from '../../render/nodePresentation';
import { useRichEditContext } from '../richEditContext';
import { RichTextEditOverlay } from './RichTextEditOverlay';
import {
  getLeafCssHeight,
  getNodeHeight,
  getTrackCssWidth,
  type RenderMeasuredNodeSizes,
  usesIntrinsicHeight,
} from '../../render/layout';
import { getStickyEdgeMode, resolveStickyIsElevated, usesSyntheticStickyTrack } from '../../render/sticky';
import { STICKY_LAYER_Z_INDEX } from '../../render/layers';
import type { RenderLeafPlanNode } from '../../render/types';
import type {
  StageSceneLeafNode as LeafNode,
  StageNodeRegistration,
  StageStickyRegistration,
} from '../types';
import { renderOffsetVisual } from './resizeHandles';
import {
  getStageStickyCssProperties,
  getStickyTrackDistances,
  renderStickyTrackShell,
  getAutoStickySpacerDistances,
  getPreviewWrapperBottomLanePx,
} from './containerRenderer';

export function renderLeaf({
  document,
  plan,
  selectedId,
  selectedIds,
  previewSticky,
  dragSourceIds,
  registerDraggableNode,
  registration,
  measuredNodeSizes,
  viewport,
  interactKeys,
}: {
  document: DocumentModel;
  plan: RenderLeafPlanNode;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  previewSticky: boolean;
  dragSourceIds: NodeId[];
  registerDraggableNode: StageNodeRegistration;
  registration?: StageStickyRegistration;
  measuredNodeSizes: RenderMeasuredNodeSizes;
  viewport: ViewportMeasurement;
  interactKeys?: Set<NodeId>;
}) {
  const child = plan.node;
  const meshPlacement = plan.meshPlacement;
  const isAutoSticky =
    child.sticky?.enabled && child.sticky.target === 'self' && child.sticky.durationMode === 'auto' && registration;
  const isSelfStickyTrack = usesSyntheticStickyTrack(child) && registration;
  const siteNode = document.nodes[document.rootId];
  const globalStickyElevation = siteNode.contentType === 'site' ? (siteNode.stickyElevation ?? true) : true;
  const isElevated = child.sticky?.enabled
    ? resolveStickyIsElevated(child.sticky, globalStickyElevation)
    : true;
  const { topDistancePx, bottomDistancePx, bottomFirst } = getStickyTrackDistances(registration, child.sticky);
  const brandMark = isBrandMark(child);
  const leafBaseWidth = formatValue(child.rect.width.base.parsed);
  const leafBaseHeight = getLeafCssHeight(child);
  const intrinsicHeightLeaf = usesIntrinsicHeight(child);
  const trackWidth = getTrackCssWidth(child);
  const isImageNode = child.contentType === 'media' && child.subtype === 'image';
  const isRichTextNode = child.contentType === 'text' && child.subtype === 'rich';
  const leafBody = (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: editor canvas node, not web content
    <div
      key={child.id}
      id={`stage-node-${child.id}`}
      ref={(element) => registerDraggableNode(child.id, element)}
      data-node-id={child.id}
      data-node-label={formatNodeLabel(child)}
      {...(interactKeys?.has(child.id) ? { 'data-interact-key': child.id } : {})}
      className={`stage-leaf subtype-${child.subtype} ${brandMark ? 'is-brand-mark' : ''} ${
        selectedIds.includes(child.id) ? 'selected' : ''
      } ${selectedIds.length > 1 && selectedIds.includes(child.id) ? 'selected-multi' : ''} ${selectedIds.length === 1 && selectedId === child.id ? 'selected-primary' : ''} ${dragSourceIds.includes(child.id) ? 'drag-source' : ''}`}
      aria-label={getNodeAriaLabel(child)}
      style={{
        ...(isSelfStickyTrack
          ? {
              width: leafBaseWidth,
            }
          : {
              ...meshPlacement,
              alignSelf: intrinsicHeightLeaf ? 'start' : meshPlacement?.alignSelf,
              width: leafBaseWidth,
            }),
        height: leafBaseHeight,
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        position: previewSticky && (isSelfStickyTrack || isAutoSticky) ? 'sticky' : 'relative',
        ...(previewSticky && child.sticky?.enabled
          ? getStageStickyCssProperties(child.sticky, { includeZIndex: true })
          : {}),
      }}
    >
      <div
        className="stage-leaf-body"
        style={isImageNode ? styleRecordToReactStyle(getLeafInlineStyle(child)) : undefined}
      >
        {isRichTextNode
          ? (
            <LeafRichBody
              child={child}
              contentStyle={styleRecordToReactStyle(getLeafInlineStyle(child))}
              document={document}
            />
          )
          : renderLeafContent(child, {
            contentStyle: isImageNode ? undefined : styleRecordToReactStyle(getLeafInlineStyle(child)),
            imageClassName: 'stage-image',
            imagePlaceholderClassName: 'image-placeholder',
            imageDraggable: false,
            disableTabNavigation: true,
          })}
      </div>
    </div>
  );

  if (!isSelfStickyTrack) {
    return leafBody;
  }

  const leafHeightPx = getNodeHeight(child, measuredNodeSizes, viewport);
  const trackHeight =
    isAutoSticky
      ? leafHeightPx
      : leafHeightPx + topDistancePx + bottomDistancePx;
  return renderStickyTrackShell({
    nodeId: child.id,
    dragSourceIds,
    style: {
      ...meshPlacement,
      width: trackWidth,
      minHeight: `${trackHeight}px`,
      ...(isElevated ? { zIndex: STICKY_LAYER_Z_INDEX } : {}),
    },
    bottomFirst,
    topDistancePx,
    bottomDistancePx,
    body: leafBody,
  });
}

function LeafRichBody({
  child,
  contentStyle,
  document,
}: {
  child: { id: NodeId; contentType: string; subtype: string; content: unknown; htmlTag?: string };
  contentStyle?: CSSProperties;
  document: DocumentModel;
}) {
  const { editingId, commitEdit, discardEdit } = useRichEditContext();
  if (editingId === child.id) {
    return (
      <RichTextEditOverlay
        nodeId={child.id}
        content={child.content as RichContent}
        contentStyle={contentStyle}
        htmlTag={child.htmlTag}
        document={document}
        onCommit={commitEdit}
        onDiscard={discardEdit}
      />
    );
  }
  return renderLeafContent(
    child as Parameters<typeof renderLeafContent>[0],
    { contentStyle, disableTabNavigation: true },
  );
}

export function renderLeafSpacerOverlay({
  document,
  child,
  owner,
  registration,
  meshPlacement,
  wrapperBottomLanePx,
  previewSticky,
  spacerVisibility,
  selectedId: _selectedId,
  selectedIds,
  measuredNodeSizes,
  viewport,
}: {
  document: DocumentModel;
  child: LeafNode;
  owner: ContainerNode;
  registration?: StageStickyRegistration;
  meshPlacement?: CSSProperties;
  wrapperBottomLanePx: number;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  measuredNodeSizes: RenderMeasuredNodeSizes;
  viewport: ViewportMeasurement;
}) {
  if (!registration || !child.sticky?.enabled || child.sticky.target !== 'self') {
    return null;
  }

  const showLeafSpacerVisuals = shouldShowSpacerVisuals(spacerVisibility, selectedIds, child.id);
  if (!showLeafSpacerVisuals) {
    return null;
  }

  const siteNode = document.nodes[document.rootId];
  const globalStickyElevation = siteNode.contentType === 'site' ? (siteNode.stickyElevation ?? true) : true;
  const isElevated = resolveStickyIsElevated(child.sticky, globalStickyElevation);
  const elevationClass = isElevated ? 'sticky-spacer-label-elevated' : 'sticky-spacer-label-grounded';
  const edgeMode = getStickyEdgeMode(child.sticky);
  const isBottomOnlySticky = edgeMode === 'bottom';
  const isBothSticky = edgeMode === 'both';
  const leafHeightPx = getNodeHeight(child, measuredNodeSizes, viewport);
  const autoDistances = getAutoStickySpacerDistances({
    edgeMode,
    ownerBottomLanePx: getPreviewWrapperBottomLanePx(owner, wrapperBottomLanePx, measuredNodeSizes, viewport),
    startPx: registration.startPx,
    nodeHeightPx: leafHeightPx,
  });
  const topDistancePx =
    child.sticky.durationMode === 'auto'
      ? edgeMode === 'both'
        ? autoDistances.topDistancePx
        : isBottomOnlySticky
          ? 0
          : autoDistances.topDistancePx
      : edgeMode === 'both'
        ? Math.max(0, registration.topDurationPx ?? registration.durationPx)
        : isBottomOnlySticky
          ? 0
          : Math.max(0, registration.durationPx);
  const bottomDistancePx =
    child.sticky.durationMode === 'auto'
      ? edgeMode === 'both'
        ? autoDistances.bottomDistancePx
        : isBottomOnlySticky
          ? autoDistances.bottomDistancePx
          : 0
      : edgeMode === 'both'
        ? Math.max(0, registration.bottomDurationPx ?? registration.durationPx)
        : isBottomOnlySticky
          ? Math.max(0, registration.durationPx)
          : 0;
  const trackOffsetPx =
    (isBottomOnlySticky || isBothSticky) && child.sticky.durationMode !== 'auto'
      ? bottomDistancePx
      : 0;
  const topSpacerAnchorStyle = { top: '100%', bottom: 'auto' };
  const bottomSpacerAnchorStyle = { top: 'auto', bottom: '100%' };

  return (
    <div
      key={`${child.id}-overlay`}
      className="leaf-spacer-overlay"
      style={{
        ...meshPlacement,
        position: previewSticky ? 'sticky' : 'relative',
        width: '100%',
        height: `${leafHeightPx}px`,
        minHeight: `${leafHeightPx}px`,
        alignSelf: 'start',
        marginTop: trackOffsetPx > 0 ? `${trackOffsetPx}px` : undefined,
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        ...(previewSticky ? getStageStickyCssProperties(child.sticky) : {}),
      }}
    >
      {renderOffsetVisual(child.sticky, child, measuredNodeSizes, viewport, owner)}
      {child.sticky.durationMode === 'auto' ? (
        <>
          {bottomDistancePx > 0 ? (
            <div
              className={`sticky-auto-spacer sticky-auto-spacer-bottom ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...bottomSpacerAnchorStyle,
                height: `${bottomDistancePx}px`,
              }}
            >
              <span className={`sticky-spacer-label sticky-spacer-label-auto ${elevationClass}`}>
                {isBothSticky ? 'Bottom Distance: auto' : 'Distance: auto'}
              </span>
            </div>
          ) : null}
          {topDistancePx > 0 ? (
            <div
              className={`sticky-auto-spacer sticky-auto-spacer-top ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...topSpacerAnchorStyle,
                height: `${topDistancePx}px`,
              }}
            >
              <span className={`sticky-spacer-label sticky-spacer-label-auto ${elevationClass}`}>
                {isBothSticky ? 'Top Distance: auto' : 'Distance: auto'}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {bottomDistancePx > 0 ? (
            <div
              className={`sticky-distance-spacer-visual sticky-distance-spacer-visual-bottom ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...bottomSpacerAnchorStyle,
                height: `${bottomDistancePx}px`,
              }}
            >
              <span className={`sticky-spacer-label ${elevationClass}`}>
                {isBothSticky
                  ? `Bottom Distance · ${Math.round(bottomDistancePx)}px`
                  : `Distance · ${Math.round(bottomDistancePx)}px`}
              </span>
            </div>
          ) : null}
          {topDistancePx > 0 ? (
            <div
              className={`sticky-distance-spacer-visual sticky-distance-spacer-visual-top ${isBothSticky ? 'sticky-guide-dual' : ''}`}
              style={{
                ...topSpacerAnchorStyle,
                height: `${topDistancePx}px`,
              }}
            >
              <span className={`sticky-spacer-label ${elevationClass}`}>
                {isBothSticky
                  ? `Top Distance · ${Math.round(topDistancePx)}px`
                  : `Distance · ${Math.round(topDistancePx)}px`}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function shouldShowSpacerVisuals(
  spacerVisibility: 'selected' | 'all',
  selectedIds: NodeId[],
  ownerId: NodeId,
) {
  return spacerVisibility === 'all' || selectedIds.includes(ownerId);
}
