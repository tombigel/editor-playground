import type { DocumentModel, NodeId } from '../../model/types';
import type { RenderMeasuredNodeSizes } from '../../render/layout';
import type { SiteLeafPlan, SiteWrapperPlan } from '../../site/sitePlan';
import type { DragState, ResizeState } from './stageMath';

export type StageStickyRegistration = SiteWrapperPlan['stickyState']['registrations'][number];
export type StageSceneLeafNode = SiteLeafPlan['node'];

export type StageSceneProps = {
  document: DocumentModel;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onResizeStart: (id: NodeId) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  snapGuides: import('./stageMath').SnapGuides;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  measuredNodeSizes: RenderMeasuredNodeSizes;
};

export type RenderWrapperArgs = {
  document: DocumentModel;
  plan: SiteWrapperPlan;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  measuredNodeSizes: RenderMeasuredNodeSizes;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  selfRegistration?: StageStickyRegistration;
  ownerBottomLanePx?: number;
};
