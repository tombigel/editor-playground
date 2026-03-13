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
