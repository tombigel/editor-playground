import type { NodeId } from '../../model/types';
import type {
  DragGeometry,
  DragPreviewItem,
  DragResolutionOptions,
  DragState,
} from '../types';
import { findDropWrapperElement, collectVerticalSnapTargets, collectPageSnapTargets, findHorizontalSnap, findVerticalSnap } from './snap';

const DRAG_COMMIT_THRESHOLD_PX = 1;

export function createDragState({
  nodeId,
  draggedNodeIds,
  previewItems,
  parentId,
  element,
  clientX,
  clientY,
  originX,
  originY,
}: {
  nodeId: string;
  draggedNodeIds?: NodeId[];
  previewItems?: DragPreviewItem[];
  parentId?: string;
  element: HTMLElement;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
}): Exclude<DragState, null> {
  const dragGeometry = getDragElementRect(element, clientX, clientY, parentId, originX, originY);
  return {
    nodeId,
    draggedNodeIds,
    previewItems,
    startClientX: clientX,
    startClientY: clientY,
    currentClientX: clientX,
    currentClientY: clientY,
    grabOffsetX: dragGeometry.offsetX,
    grabOffsetY: dragGeometry.offsetY,
    useVisualOffset: dragGeometry.useVisualOffset,
    modelShiftX: dragGeometry.modelShiftX,
    modelShiftY: dragGeometry.modelShiftY,
    previewWidth: dragGeometry.rect.width,
    previewHeight: dragGeometry.rect.height,
    originX,
    originY,
  };
}

export function getDragElementRect(
  element: HTMLElement,
  clientX: number,
  clientY: number,
  parentId?: string,
  originX?: number,
  originY?: number,
  documentRef: Pick<Document, 'querySelectorAll'> = window.document,
): DragGeometry {
  const rect = element.getBoundingClientRect();
  const visualOffsetX = clientX - rect.left;
  const visualOffsetY = clientY - rect.top;
  if (parentId && Number.isFinite(originX) && Number.isFinite(originY)) {
    const parentElement = findDropWrapperElement(parentId, documentRef);
    if (parentElement) {
      const parentRect = parentElement.getBoundingClientRect();
      const modelLeft = parentRect.left + (originX ?? 0);
      const modelTop = parentRect.top + (originY ?? 0);
      const stickyVisualShiftX = rect.left - modelLeft;
      const stickyVisualShiftY = rect.top - modelTop;
      const hasStickyVisualShift =
        Math.abs(stickyVisualShiftX) > 1 || Math.abs(stickyVisualShiftY) > 1;
      return {
        rect,
        offsetX: hasStickyVisualShift ? visualOffsetX : clientX - modelLeft,
        offsetY: hasStickyVisualShift ? visualOffsetY : clientY - modelTop,
        useVisualOffset: hasStickyVisualShift,
        modelShiftX: hasStickyVisualShift ? stickyVisualShiftX : 0,
        modelShiftY: hasStickyVisualShift ? stickyVisualShiftY : 0,
      };
    }
  }

  return {
    rect,
    offsetX: visualOffsetX,
    offsetY: visualOffsetY,
    useVisualOffset: false,
    modelShiftX: 0,
    modelShiftY: 0,
  };
}

export function getSnappedDragPosition(
  dragState: Exclude<DragState, null>,
  clientX: number,
  clientY: number,
  documentRef: Pick<Document, 'querySelector' | 'querySelectorAll'> = window.document,
  windowRef: Pick<Window, 'innerWidth' | 'innerHeight'> = window,
) {
  let left = clientX - dragState.grabOffsetX;
  let top = clientY - dragState.grabOffsetY;
  const width = dragState.previewWidth;
  const height = dragState.previewHeight;
  const pageTargets = collectPageSnapTargets(documentRef, windowRef);

  const horizontalSnap = findHorizontalSnap(left, width, [...pageTargets.horizontal]);
  if (horizontalSnap) {
    left += horizontalSnap.delta;
  }

  const verticalSnap = findVerticalSnap(top, height, [
    ...collectVerticalSnapTargets(dragState.nodeId, documentRef),
    ...pageTargets.vertical,
  ]);
  if (verticalSnap) {
    top += verticalSnap.delta;
  }

  return {
    clientX: left + dragState.grabOffsetX,
    clientY: top + dragState.grabOffsetY,
    guideX: horizontalSnap?.target ?? null,
    guideXSource: horizontalSnap?.source ?? null,
    guideY: verticalSnap?.target ?? null,
    guideYSource: verticalSnap?.source ?? null,
  };
}

export function didDragPointerMove(
  dragState: Pick<Exclude<DragState, null>, 'startClientX' | 'startClientY'>,
  clientX: number,
  clientY: number,
) {
  return (
    Math.abs(clientX - dragState.startClientX) > DRAG_COMMIT_THRESHOLD_PX ||
    Math.abs(clientY - dragState.startClientY) > DRAG_COMMIT_THRESHOLD_PX
  );
}

export function getShiftLockedPointer(
  dragState: Pick<Exclude<DragState, null>, 'startClientX' | 'startClientY'>,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
) {
  if (!shiftKey) {
    return { clientX, clientY };
  }

  const deltaX = clientX - dragState.startClientX;
  const deltaY = clientY - dragState.startClientY;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return { clientX, clientY: dragState.startClientY };
  }

  return { clientX: dragState.startClientX, clientY };
}

export function resolveDragPointerPosition(
  dragState: Exclude<DragState, null>,
  clientX: number,
  clientY: number,
  {
    shiftKey,
    altKey,
    snapEnabled,
    documentRef = window.document,
    windowRef = window,
  }: DragResolutionOptions,
) {
  const axisLocked = getShiftLockedPointer(dragState, clientX, clientY, shiftKey);
  const shouldSnap = altKey ? !snapEnabled : snapEnabled;
  if (!shouldSnap) {
    return {
      clientX: axisLocked.clientX,
      clientY: axisLocked.clientY,
      guideX: null,
      guideXSource: null,
      guideY: null,
      guideYSource: null,
    };
  }

  return getSnappedDragPosition(dragState, axisLocked.clientX, axisLocked.clientY, documentRef, windowRef);
}
