import type { CSSProperties } from 'react';
import type {
  ContainerNode,
  DocumentModel,
  NodeId,
  TextDocumentContent,
  TextNode,
  ViewportMeasurement,
} from '../../model/types';
import { formatValue } from '../../model/units';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../../render/leafPresentation';
import {
  createRichListBlock,
  createRichListItem,
  createTextDocumentContent,
  getSingleCodeBlockContent,
  getSingleListBlockContent,
  prepareStandaloneBlockEditContent,
} from '../../model/richContent';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  isBrandMark,
  renderLeafContent,
} from '../../render/nodePresentation';
import { useRichEditContext } from '../richEditContext';
import { CodeTextEditOverlay } from './CodeTextEditOverlay';
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
  return (
    <StageLeaf
      key={plan.node.id}
      document={document}
      plan={plan}
      selectedId={selectedId}
      selectedIds={selectedIds}
      previewSticky={previewSticky}
      dragSourceIds={dragSourceIds}
      registerDraggableNode={registerDraggableNode}
      registration={registration}
      measuredNodeSizes={measuredNodeSizes}
      viewport={viewport}
      interactKeys={interactKeys}
    />
  );
}

function StageLeaf({
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
  const { editingId, commitEdit, updateBlockGap, discardEdit, onOpenManageFonts } = useRichEditContext();
  const child = plan.node;
  const hiddenStyle = getStageHiddenStyle(plan.hiddenState);
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
  const isEditableTextNode = child.contentType === 'text' && isEditableTextSubtype(child.subtype);
  const isEditingTextNode = isEditableTextNode && editingId === child.id;
  const contentPresentationStyle = styleRecordToReactStyle(getLeafInlineStyle(child));
  const leafBodyStyle = isImageNode ? styleRecordToReactStyle(getLeafInlineStyle(child)) : undefined;
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
      } ${selectedIds.length > 1 && selectedIds.includes(child.id) ? 'selected-multi' : ''} ${selectedIds.length === 1 && selectedId === child.id ? 'selected-primary' : ''} ${dragSourceIds.includes(child.id) ? 'drag-source' : ''} ${
        plan.hiddenState.isEffectivelyHidden ? 'is-effectively-hidden' : ''
      } ${plan.hiddenState.isGhostVisible ? 'is-hidden-ghost' : ''} ${
        plan.hiddenState.isHiddenSelected ? 'is-hidden-selected' : ''
      }`}
      data-hidden={plan.hiddenState.isEffectivelyHidden ? 'true' : 'false'}
      data-ghost-visible={plan.hiddenState.isGhostVisible ? 'true' : 'false'}
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
        height: isEditingTextNode ? 'auto' : leafBaseHeight,
        minHeight: isEditingTextNode ? leafBaseHeight : undefined,
        aspectRatio:
          !('unit' in child.rect.height.base.parsed) &&
          child.rect.height.base.parsed.keyword === 'aspect-ratio'
            ? String(child.rect.height.base.parsed.ratio)
            : undefined,
        position: previewSticky && (isSelfStickyTrack || isAutoSticky) ? 'sticky' : 'relative',
        ...(isEditingTextNode ? { zIndex: STICKY_LAYER_Z_INDEX + 1 } : {}),
        ...(previewSticky && child.sticky?.enabled
          ? getStageStickyCssProperties(child.sticky, { includeZIndex: true })
          : {}),
        ...hiddenStyle,
      }}
    >
      <div
        className="stage-leaf-body"
        style={{
          ...(leafBodyStyle ?? {}),
          ...(isEditingTextNode
            ? {
                height: 'auto',
                minHeight: leafBaseHeight,
              }
            : {}),
        }}
      >
        {isEditableTextNode
          ? (
            <LeafTextEditBody
              child={child as TextNode}
              contentStyle={contentPresentationStyle}
              isEditing={isEditingTextNode}
              document={document}
              minHeight={leafBaseHeight}
              onCommit={commitEdit}
              onUpdateBlockGap={updateBlockGap}
              onDiscard={discardEdit}
              onOpenManageFonts={onOpenManageFonts}
            />
          )
          : renderLeafContent(child, {
            contentStyle: isImageNode ? undefined : contentPresentationStyle,
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

function getStageHiddenStyle(hiddenState: RenderLeafPlanNode['hiddenState']): CSSProperties | undefined {
  if (!hiddenState.isEffectivelyHidden || hiddenState.isGhostVisible) {
    return undefined;
  }

  return {
    visibility: 'hidden',
    pointerEvents: 'none',
  };
}

function LeafTextEditBody({
  child,
  contentStyle,
  isEditing,
  document,
  minHeight,
  onCommit,
  onUpdateBlockGap,
  onDiscard,
  onOpenManageFonts,
}: {
  child: TextNode;
  contentStyle?: CSSProperties;
  isEditing: boolean;
  document: DocumentModel;
  minHeight: string;
  onCommit: (
    id: NodeId,
    content: TextDocumentContent,
    options?: { clearBlockNodeLink?: boolean },
  ) => void;
  onUpdateBlockGap: (id: NodeId, value: number) => void;
  onDiscard: () => void;
  onOpenManageFonts: (options?: { category?: string }) => void;
}) {
  if (isEditing) {
    if (child.subtype === 'code') {
      const codeBlock = getSingleCodeBlockContent(child.content);
      return (
        <CodeTextEditOverlay
          nodeId={child.id}
          content={child.content}
          contentStyle={contentStyle}
          minHeight={minHeight}
          tabSize={codeBlock?.style?.tabSize ?? child.style?.tabSize ?? 2}
          onCommit={onCommit}
          onDiscard={onDiscard}
        />
      );
    }
    const mode = child.subtype === 'block' ? 'block' : child.subtype === 'list' ? 'list' : 'rich';
    const editableContent =
      mode === 'block'
        ? prepareStandaloneBlockEditContent(child)
        : mode === 'list'
          ? prepareStandaloneListEditContent(child)
        : { content: child.content, promotedNodeLink: false };
    return (
      <RichTextEditOverlay
        nodeId={child.id}
        mode={mode}
        content={editableContent.content}
        contentStyle={contentStyle}
        minHeight={minHeight}
        document={document}
        onCommit={(id, content, options) =>
          onCommit(id, content, {
            ...options,
            clearBlockNodeLink:
              mode === 'block' && editableContent.promotedNodeLink
                ? true
                : options?.clearBlockNodeLink,
          })
        }
        onUpdateBlockGap={onUpdateBlockGap}
        onDiscard={onDiscard}
        onOpenManageFonts={onOpenManageFonts}
      />
    );
  }
  return renderLeafContent(
    child as Parameters<typeof renderLeafContent>[0],
    { contentStyle, disableTabNavigation: true },
  );
}

function isEditableTextSubtype(subtype: string): subtype is 'rich' | 'block' | 'list' | 'code' {
  return subtype === 'rich' || subtype === 'block' || subtype === 'list' || subtype === 'code';
}

function prepareStandaloneListEditContent(node: TextNode) {
  if (node.subtype !== 'list') {
    return {
      content: createTextDocumentContent([
        createRichListBlock('ul', [createRichListItem('')]),
      ]),
      promotedNodeLink: false,
    };
  }

  const listBlock = getSingleListBlockContent(node.content);
  return {
    content: createTextDocumentContent([
      listBlock
        ? structuredClone(listBlock)
        : createRichListBlock('ul', [createRichListItem('')]),
    ]),
    promotedNodeLink: false,
  };
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
