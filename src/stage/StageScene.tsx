import { memo, useMemo } from 'react';
import { buildDocumentDefaultFontStack } from '../fonts/defaults';
import { buildRenderRootPlan } from '../render/renderPlan';
import type { StageSceneProps } from './types';
export type { RenderWrapperArgs, StageSceneLeafNode, StageSceneProps, StageStickyRegistration } from './types';

import { renderWrapper } from './stageRenderers/wrapperRenderer';
import { MultiSelectionOutline } from './stageRenderers/selectionVisuals';

export const StageScene = memo(function StageScene({
  document,
  selectedId,
  selectedIds = selectedId ? [selectedId] : [],
  multiSelectionBounds = null,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  onResizeStart,
  dragSourceIds,
  highlightedDropId,
  registerDraggableNode,
  registerDropTarget,
  resizeState,
  setResizeState,
  measuredNodeSizes,
  viewport,
}: StageSceneProps) {
  const plan = useMemo(
    () => buildRenderRootPlan(document, previewSticky, measuredNodeSizes, viewport),
    [document, previewSticky, measuredNodeSizes, viewport],
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
                setResizeState,
                onResizeStart,
                selfRegistration: plan.header.registrationMap.get(plan.header.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: plan.header.meshLayout.bottomLanePx,
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
                setResizeState,
                onResizeStart,
                selfRegistration: wrapper.registrationMap.get(wrapper.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: wrapper.meshLayout.bottomLanePx,
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
                setResizeState,
                onResizeStart,
                selfRegistration: plan.footer.registrationMap.get(plan.footer.node.id),
                ownerWrapper: undefined,
                ownerBottomLanePx: plan.footer.meshLayout.bottomLanePx,
              })
            : <EmptySlot label="Footer slot" />}
        </div>
        {multiSelectionBounds ? <MultiSelectionOutline bounds={multiSelectionBounds} /> : null}
      </div>
  );
}, (prev, next) =>
  prev.document === next.document &&
  prev.selectedId === next.selectedId &&
  prev.selectedIds === next.selectedIds &&
  prev.multiSelectionBounds === next.multiSelectionBounds &&
  prev.previewSticky === next.previewSticky &&
  prev.spacerVisibility === next.spacerVisibility &&
  prev.showGridLanes === next.showGridLanes &&
  prev.dragSourceIds === next.dragSourceIds &&
  prev.highlightedDropId === next.highlightedDropId &&
  prev.registerDraggableNode === next.registerDraggableNode &&
  prev.registerDropTarget === next.registerDropTarget &&
  prev.resizeState === next.resizeState &&
  prev.measuredNodeSizes === next.measuredNodeSizes &&
  prev.viewport === next.viewport,
);

function EmptySlot({ label }: { label: string }) {
  return <div className="empty-slot">{label}</div>;
}
