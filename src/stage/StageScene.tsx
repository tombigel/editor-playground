import { memo, useMemo } from 'react';
import { buildDocumentDefaultFontStack } from '../fonts/defaults';
import { buildRenderRootPlan } from '../render/renderPlan';
import { collectInteractKeys } from '../site/siteShared';
import type { StageSceneProps } from './types';
export type { RenderWrapperArgs, StageSceneLeafNode, StageSceneProps, StageStickyRegistration } from './types';

import { renderContainer as renderWrapper } from './stageRenderers/containerRenderer';
import { MultiSelectionOutline, SingleSelectionOverlay } from './stageRenderers/selectionVisuals';
import { FollowLinkPopup } from '../panels/FollowLinkPopup';

export const StageScene = memo(function StageScene({
  document,
  activePageId,
  selectedId,
  selectedIds = selectedId ? [selectedId] : [],
  singleSelectionOverlay = null,
  multiSelectionBounds = null,
  previewSticky,
  animationPreview,
  spacerVisibility,
  showGridLanes,
  dragSourceIds,
  highlightedDropId,
  registerDraggableNode,
  registerDropTarget,
  resizeState,
  measuredNodeSizes,
  viewport,
  onSelectionOverlayHandleMouseDown,
  followLinkPopup = null,
}: StageSceneProps) {
  const plan = useMemo(
    () => buildRenderRootPlan(document, previewSticky, measuredNodeSizes, viewport, activePageId ?? undefined),
    [document, previewSticky, measuredNodeSizes, viewport, activePageId],
  );

  const interactKeys = useMemo(
    () => (animationPreview?.enabled ? collectInteractKeys(document) : new Set<string>()),
    [document, animationPreview?.enabled],
  );

  return (
      <div className="stage-frame">
        <div className="stage-canvas" style={{ fontFamily: buildDocumentDefaultFontStack(document) }}>
          {plan.header
            ? renderWrapper({
                document,
                plan: plan.header,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragSourceIds,
                highlightedDropId,
                registerDraggableNode,
                registerDropTarget,
                resizeState,
                selfRegistration: plan.header.registrationMap.get(plan.header.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: plan.header.meshLayout.bottomLanePx,
                interactKeys,
              })
            : <EmptySlot label="Header slot" />}
          <main className="site-main">
            {plan.main.map((wrapper) =>
              renderWrapper({
                document,
                plan: wrapper,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragSourceIds,
                highlightedDropId,
                registerDraggableNode,
                registerDropTarget,
                resizeState,
                selfRegistration: wrapper.registrationMap.get(wrapper.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: wrapper.meshLayout.bottomLanePx,
                interactKeys,
              }),
            )}
          </main>
          {plan.footer
            ? renderWrapper({
                document,
                plan: plan.footer,
                selectedId,
                selectedIds,
                previewSticky,
                spacerVisibility,
                showGridLanes,
                measuredNodeSizes,
                viewport,
                dragSourceIds,
                highlightedDropId,
                registerDraggableNode,
                registerDropTarget,
                resizeState,
                selfRegistration: plan.footer.registrationMap.get(plan.footer.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: plan.footer.meshLayout.bottomLanePx,
                interactKeys,
              })
            : <EmptySlot label="Footer slot" />}
        </div>
        {singleSelectionOverlay ? (
          <SingleSelectionOverlay
            overlay={singleSelectionOverlay}
            onHandleMouseDown={onSelectionOverlayHandleMouseDown}
          />
        ) : null}
        {followLinkPopup && singleSelectionOverlay ? (
          <FollowLinkPopup
            node={followLinkPopup.node}
            document={followLinkPopup.document}
            bounds={singleSelectionOverlay.bounds}
            onNavigateToPage={followLinkPopup.onNavigateToPage}
            onScrollToAnchor={followLinkPopup.onScrollToAnchor}
          />
        ) : null}
        {multiSelectionBounds ? <MultiSelectionOutline bounds={multiSelectionBounds} /> : null}
      </div>
  );
}, (prev, next) =>
  prev.document === next.document &&
  prev.activePageId === next.activePageId &&
  prev.selectedId === next.selectedId &&
  prev.selectedIds === next.selectedIds &&
  prev.singleSelectionOverlay === next.singleSelectionOverlay &&
  prev.multiSelectionBounds === next.multiSelectionBounds &&
  prev.previewSticky === next.previewSticky &&
  prev.animationPreview === next.animationPreview &&
  prev.spacerVisibility === next.spacerVisibility &&
  prev.showGridLanes === next.showGridLanes &&
  prev.dragSourceIds === next.dragSourceIds &&
  prev.highlightedDropId === next.highlightedDropId &&
  prev.registerDraggableNode === next.registerDraggableNode &&
  prev.registerDropTarget === next.registerDropTarget &&
  prev.resizeState === next.resizeState &&
  prev.measuredNodeSizes === next.measuredNodeSizes &&
  prev.viewport === next.viewport &&
  prev.onSelectionOverlayHandleMouseDown === next.onSelectionOverlayHandleMouseDown &&
  prev.followLinkPopup === next.followLinkPopup,
);

function EmptySlot({ label }: { label: string }) {
  return <div className="empty-slot">{label}</div>;
}
