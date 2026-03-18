import type { DocumentModel, NodeId, ViewportMeasurement } from '../../model/types';
import type { RenderMeasuredNodeSizes } from '../../render/types';
import type { RenderLeafPlanNode, RenderWrapperPlanNode } from '../../render/types';
import type { StickyGeometrySnapshot, StickyMeasuredNodeSizes } from '../../sticky/types';

export type StageProps = {
  document: DocumentModel;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  snapEnabled: boolean;
  onStageFocus: () => void;
  onSelect: (id: NodeId, mode?: 'replace' | 'toggle') => void;
  onSelectMany: (ids: NodeId[], mode: 'replace' | 'toggle') => void;
  onClearSelection: () => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onMoveSelection?: (moves: Array<{ id: NodeId; x: string; y: string }>) => void;
  onReparent: (id: NodeId, parentId: NodeId, x: string, y: string) => void;
  onResize: (id: NodeId, width: string, height: string) => void;
  onResizeStart: (id: NodeId) => void;
  onResizeEnd: (id: NodeId) => void;
  onStickyGeometryChange?: (geometry: StickyGeometrySnapshot) => void;
};

export type DragPreviewItem = {
  nodeId: NodeId;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export type DragState = {
  nodeId: string;
  draggedNodeIds?: NodeId[];
  previewItems?: DragPreviewItem[];
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  useVisualOffset: boolean;
  modelShiftX: number;
  modelShiftY: number;
  previewWidth: number;
  previewHeight: number;
  originX: number;
  originY: number;
} | null;

export type ResizeHandle =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';

export type ResizeState = {
  nodeId: string;
  handle: ResizeHandle;
  startClientX: number;
  startClientY: number;
  originWidth: number;
  originHeight: number;
  originX: number;
  originY: number;
  minWidth?: number;
  minHeight?: number;
} | null;

export type SnapGuides = {
  x: number | null;
  y: number | null;
  xSource: 'component' | 'page' | null;
  ySource: 'component' | 'page' | null;
};

export type StageMathLeafNode = Extract<DocumentModel['nodes'][string], { type: 'leaf' }>;
export type StageMathWrapperNode = Extract<DocumentModel['nodes'][string], { type: 'wrapper' }>;

export type SnapTarget = {
  value: number;
  source: 'component' | 'page';
};

export type DragGeometry = {
  rect: DOMRect;
  offsetX: number;
  offsetY: number;
  useVisualOffset: boolean;
  modelShiftX: number;
  modelShiftY: number;
};

export type DragResolutionOptions = {
  shiftKey: boolean;
  altKey: boolean;
  snapEnabled: boolean;
  documentRef?: Pick<Document, 'querySelector' | 'querySelectorAll'>;
  windowRef?: Pick<Window, 'innerWidth' | 'innerHeight'>;
};

export type MeasuredNodeSizes = StickyMeasuredNodeSizes;

export type StageStickyRegistration = RenderWrapperPlanNode['stickyState']['registrations'][number];
export type StageSceneLeafNode = RenderLeafPlanNode['node'];

export type StageSceneProps = {
  document: DocumentModel;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  multiSelectionBounds?: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  onResizeStart: (id: NodeId) => void;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  snapGuides: SnapGuides;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  measuredNodeSizes: RenderMeasuredNodeSizes;
  viewport: ViewportMeasurement;
};

export type RenderWrapperArgs = {
  document: DocumentModel;
  plan: RenderWrapperPlanNode;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  measuredNodeSizes: RenderMeasuredNodeSizes;
  viewport: ViewportMeasurement;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resizeState: ResizeState;
  setResizeState: (state: ResizeState) => void;
  onResizeStart: (id: NodeId) => void;
  selfRegistration?: StageStickyRegistration;
  ownerWrapper?: StageMathWrapperNode;
  ownerBottomLanePx?: number;
};
