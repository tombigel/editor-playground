import type { StickyMeasuredNodeSizes } from '../../sticky/resolve';
import type { DocumentModel } from '../../model/types';

export type DragState = {
  nodeId: string;
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
