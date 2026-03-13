export type DragState = {
  nodeId: string;
  currentClientX: number;
  currentClientY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  previewWidth: number;
  previewHeight: number;
  originX: number;
  originY: number;
} | null;

export function px(value: number) {
  return `${Math.round(value)}px`;
}
