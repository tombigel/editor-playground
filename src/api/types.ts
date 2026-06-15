import type { DocumentModel, DocumentNode, NodeId } from './documentApi';

export type { DocumentModel, DocumentNode, NodeId };

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DragNodeOrigin = {
  id: NodeId;
  originX: number;
  originY: number;
  parentId?: NodeId;
};

export type DragSnapSource = 'component' | 'page' | 'section' | 'header' | 'footer' | 'container';

export type DragSnapTarget = {
  value: number;
  source: DragSnapSource;
  anchor: 'edge' | 'center';
};

export type DragGuide = {
  value: number;
  source: DragSnapSource;
  anchor: 'edge' | 'center';
};

export type DragPreviewItem = {
  nodeId: NodeId;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export type DragDropTarget = {
  id: NodeId;
  contentBox: Rect;
  depth: number;
  order: number;
};

export type DragGeometrySnapshot = {
  previewItems: DragPreviewItem[];
  previewWidth: number;
  previewHeight: number;
  nodes: DragNodeOrigin[];
  sourceParentId?: NodeId;
  sourceContentBox?: Rect;
  grabOffsetX: number;
  grabOffsetY: number;
  useVisualOffset: boolean;
  modelShiftX: number;
  modelShiftY: number;
  horizontalGuides: DragSnapTarget[];
  verticalGuides: DragSnapTarget[];
  dropTargets: DragDropTarget[];
};

export type DragStartContext = {
  document: DocumentModel;
  anchorId: NodeId;
  selectedIds: NodeId[];
  startClientX: number;
  startClientY: number;
  startTimestampMs: number;
  geometry: DragGeometrySnapshot;
};

export type DragMotion = {
  deltaX: number;
  deltaY: number;
  velocityX: number;
  velocityY: number;
  speedPxPerSecond: number;
  dominantAxis: 'horizontal' | 'vertical' | null;
};

export type DragMotionSample = {
  clientX: number;
  clientY: number;
  timestampMs: number;
};

export type DragUpdateInput = {
  clientX: number;
  clientY: number;
  timestampMs: number;
  shiftKey: boolean;
  altKey: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  guideSnap: { enabled: boolean; threshold: number; power: number; maxSpeedPxPerSecond: number };
  containerSnap: { enabled: boolean; threshold: number; power: number };
};

export type DragParentExpansion = {
  parentId: NodeId;
  minHeightPx: number;
};

export type DragResolvedPlacement = {
  targetParentId: NodeId;
  localX: number;
  localY: number;
  previewLeft: number;
  previewTop: number;
  clientX: number;
  clientY: number;
  parentExpansion: DragParentExpansion | null;
};

export type DragCommitIntent =
  | { type: 'none' }
  | { type: 'move'; id: NodeId; x: string; y: string; parentExpansion?: DragParentExpansion }
  | { type: 'moveSelection'; moves: Array<{ id: NodeId; x: string; y: string }>; parentExpansion?: DragParentExpansion }
  | { type: 'reparent'; id: NodeId; parentId: NodeId; x: string; y: string; parentExpansion?: DragParentExpansion }
  | { type: 'reparentSelection'; parentId: NodeId; moves: Array<{ id: NodeId; x: string; y: string }>; parentExpansion?: DragParentExpansion };

export type DragSession = {
  phase: 'pending' | 'dragging';
  document: DocumentModel;
  anchorId: NodeId;
  dragIds: NodeId[];
  dragSourceIds: NodeId[];
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  lastMotionSample: DragMotionSample;
  motion: DragMotion;
  previewLeft: number;
  previewTop: number;
  guideX: DragGuide | null;
  guideY: DragGuide | null;
  highlightedDropId: NodeId | null;
  axisLock: 'horizontal' | 'vertical' | null;
  snapBypassed: boolean;
  duplicateRequested: boolean;
  resolvedPlacement: DragResolvedPlacement | null;
  geometry: DragGeometrySnapshot;
};
