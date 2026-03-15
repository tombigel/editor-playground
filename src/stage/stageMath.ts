import type { DocumentModel, DocumentNode, NodeId, StickyDefinition } from '../model/types';
import { resolveFontSizePx, resolveUnitValuePx } from '../model/units';
import type { StickyMeasuredNodeSizes } from '../sticky/resolve';

type LeafNode = Extract<DocumentModel['nodes'][string], { type: 'leaf' }>;
type WrapperNode = Extract<DocumentModel['nodes'][string], { type: 'wrapper' }>;

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

type SnapTarget = {
  value: number;
  source: 'component' | 'page';
};

type DragGeometry = {
  rect: DOMRect;
  offsetX: number;
  offsetY: number;
  useVisualOffset: boolean;
  modelShiftX: number;
  modelShiftY: number;
};

type DragResolutionOptions = {
  shiftKey: boolean;
  altKey: boolean;
  snapEnabled: boolean;
  documentRef?: Pick<Document, 'querySelector' | 'querySelectorAll'>;
  windowRef?: Pick<Window, 'innerWidth' | 'innerHeight'>;
};

export type MeasuredNodeSizes = StickyMeasuredNodeSizes;

export const VIEWPORT_WIDTH = 1440;
export const VIEWPORT_HEIGHT = 900;
const MIN_NODE_SIZE = 24;
const SNAP_THRESHOLD_PX = 8;
const DRAG_COMMIT_THRESHOLD_PX = 1;

export function numericWidth(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 160;
}

export function numericHeight(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 80;
}

export function getResizeStartSize(handleElement: HTMLDivElement, fallbackWidth: number, fallbackHeight: number) {
  const nodeElement = handleElement.closest<HTMLElement>('[data-node-id]');
  if (!nodeElement) {
    return { width: fallbackWidth, height: fallbackHeight };
  }

  const rect = nodeElement.getBoundingClientRect();
  return {
    width: rect.width > 0 ? rect.width : fallbackWidth,
    height: rect.height > 0 ? rect.height : fallbackHeight,
  };
}

export function px(value: number) {
  return `${Math.round(value)}px`;
}

export function getResizeCommitSize(
  node: Exclude<DocumentNode, { type: 'site' }>,
  resizeState: Exclude<ResizeState, null>,
  nextWidth: number,
  nextHeight: number,
  documentModel?: DocumentModel,
) {
  const changesWidth = resizeState.handle.includes('e') || resizeState.handle.includes('w');
  const changesHeight = resizeState.handle.includes('n') || resizeState.handle.includes('s');
  const parentReference = documentModel ? getResizeParentReference(node, documentModel) : null;

  return {
    width: changesWidth
      ? serializeResizedDimension('width', node.rect.width.base.parsed, node.rect.width.base.raw, nextWidth, parentReference)
      : node.rect.width.base.raw,
    height: changesHeight
      ? serializeResizedDimension('height', node.rect.height.base.parsed, node.rect.height.base.raw, nextHeight, parentReference)
      : node.rect.height.base.raw,
  };
}

function serializeResizedDimension(
  axis: 'width' | 'height',
  parsed: Exclude<DocumentNode, { type: 'site' }>['rect']['width' | 'height']['base']['parsed'],
  _raw: string,
  pxValue: number,
  reference: { width: number; height: number; viewportWidth: number; viewportHeight: number } | null,
) {
  if ('unit' in parsed) {
    const converted = convertPxToAuthorUnit(pxValue, parsed.unit, axis, reference);
    return converted == null ? px(pxValue) : `${formatResizeNumber(converted)}${parsed.unit}`;
  }

  return px(pxValue);
}

function convertPxToAuthorUnit(
  pxValue: number,
  unit: 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax',
  axis: 'width' | 'height',
  reference: { width: number; height: number; viewportWidth: number; viewportHeight: number } | null,
) {
  if (unit === 'px') {
    return Math.round(pxValue);
  }
  if (!reference) {
    return null;
  }
  if (unit === '%') {
    const base = axis === 'width' ? reference.width : reference.height;
    return base > 0 ? (pxValue / base) * 100 : null;
  }
  if (unit === 'vw') {
    return reference.viewportWidth > 0 ? (pxValue / reference.viewportWidth) * 100 : null;
  }
  if (unit === 'vh') {
    return reference.viewportHeight > 0 ? (pxValue / reference.viewportHeight) * 100 : null;
  }
  if (unit === 'vmin') {
    const base = Math.min(reference.viewportWidth, reference.viewportHeight);
    return base > 0 ? (pxValue / base) * 100 : null;
  }
  const base = Math.max(reference.viewportWidth, reference.viewportHeight);
  return base > 0 ? (pxValue / base) * 100 : null;
}

function getResizeParentReference(
  node: Exclude<DocumentNode, { type: 'site' }>,
  documentModel: DocumentModel,
) {
  const parent = node.parentId ? documentModel.nodes[node.parentId] : null;
  if (!parent || parent.type === 'site') {
    return {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    };
  }

  return {
    width: getNodeWidth(parent, {}),
    height: getNodeHeight(parent, {}),
    viewportWidth: VIEWPORT_WIDTH,
    viewportHeight: VIEWPORT_HEIGHT,
  };
}

function formatResizeNumber(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
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

export function computeResizeFrame(
  resizeState: Exclude<ResizeState, null>,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
) {
  const deltaX = clientX - resizeState.startClientX;
  const deltaY = clientY - resizeState.startClientY;

  const isEast = resizeState.handle.includes('e');
  const isWest = resizeState.handle.includes('w');
  const isSouth = resizeState.handle.includes('s');
  const isNorth = resizeState.handle.includes('n');
  const isCornerHandle = (isEast || isWest) && (isSouth || isNorth);
  const ratio = resizeState.originWidth / Math.max(1, resizeState.originHeight);

  let width = resizeState.originWidth;
  let height = resizeState.originHeight;
  let x = resizeState.originX;
  let y = resizeState.originY;

  if (isEast) {
    width = resizeState.originWidth + deltaX;
  } else if (isWest) {
    width = resizeState.originWidth - deltaX;
    x = resizeState.originX + deltaX;
  }

  if (isSouth) {
    height = resizeState.originHeight + deltaY;
  } else if (isNorth) {
    height = resizeState.originHeight - deltaY;
    y = resizeState.originY + deltaY;
  }

  if (shiftKey && isCornerHandle) {
    const widthChange = Math.abs(width - resizeState.originWidth) / Math.max(1, resizeState.originWidth);
    const heightChange = Math.abs(height - resizeState.originHeight) / Math.max(1, resizeState.originHeight);

    if (widthChange >= heightChange) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }

    if (isWest) {
      x = resizeState.originX + (resizeState.originWidth - width);
    }
    if (isNorth) {
      y = resizeState.originY + (resizeState.originHeight - height);
    }
  }

  if (width < MIN_NODE_SIZE) {
    if (isWest) {
      x -= MIN_NODE_SIZE - width;
    }
    width = MIN_NODE_SIZE;
  }

  if (height < MIN_NODE_SIZE) {
    if (isNorth) {
      y -= MIN_NODE_SIZE - height;
    }
    height = MIN_NODE_SIZE;
  }

  if (shiftKey && isCornerHandle) {
    const scale = Math.max(
      1,
      MIN_NODE_SIZE / Math.max(width, 1),
      MIN_NODE_SIZE / Math.max(height, 1),
    );
    if (scale > 1) {
      width *= scale;
      height *= scale;
      if (isWest) {
        x = resizeState.originX + (resizeState.originWidth - width);
      }
      if (isNorth) {
        y = resizeState.originY + (resizeState.originHeight - height);
      }
    }
  }

  return { width, height, x, y };
}

export function createDragState({
  nodeId,
  parentId,
  element,
  clientX,
  clientY,
  originX,
  originY,
}: {
  nodeId: string;
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

export function collectVerticalSnapTargets(
  draggedId: string,
  documentRef: Pick<Document, 'querySelectorAll'> = document,
) {
  const targets: SnapTarget[] = [];
  const nodes = documentRef.querySelectorAll<HTMLElement>('.stage-canvas [data-node-id]');
  for (const element of nodes) {
    if (element.dataset.nodeId === draggedId) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.height < 1 || rect.width < 1) {
      continue;
    }
    targets.push(
      { value: rect.top, source: 'component' },
      { value: rect.top + rect.height / 2, source: 'component' },
      { value: rect.bottom, source: 'component' },
    );
  }
  return targets;
}

export function collectPageSnapTargets(
  documentRef: Pick<Document, 'querySelector'> = window.document,
  windowRef: Pick<Window, 'innerWidth' | 'innerHeight'> = window,
) {
  const frame = documentRef.querySelector<HTMLElement>('.stage-frame');
  if (!frame) {
    return {
      horizontal: [
        { value: 0, source: 'page' as const },
        { value: windowRef.innerWidth / 2, source: 'page' as const },
        { value: windowRef.innerWidth, source: 'page' as const },
      ],
      vertical: [
        { value: 0, source: 'page' as const },
        { value: windowRef.innerHeight / 2, source: 'page' as const },
        { value: windowRef.innerHeight, source: 'page' as const },
      ],
    };
  }

  const rect = frame.getBoundingClientRect();
  return {
    horizontal: [
      { value: rect.left, source: 'page' as const },
      { value: rect.left + rect.width / 2, source: 'page' as const },
      { value: rect.right, source: 'page' as const },
    ],
    vertical: [
      { value: rect.top, source: 'page' as const },
      { value: rect.top + rect.height / 2, source: 'page' as const },
      { value: rect.bottom, source: 'page' as const },
    ],
  };
}

function findHorizontalSnap(left: number, width: number, targets: SnapTarget[]) {
  const anchors = [left, left + width / 2, left + width];
  let best: { delta: number; distance: number; target: number; source: 'component' | 'page' } | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { delta, distance, target: target.value, source: target.source };
      }
    }
  }

  return best;
}

function findVerticalSnap(top: number, height: number, targets: SnapTarget[]) {
  const anchors = [top, top + height / 2, top + height];
  let best: { delta: number; distance: number; target: number; source: 'component' | 'page' } | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { delta, distance, target: target.value, source: target.source };
      }
    }
  }

  return best;
}

export function findDropWrapper(
  model: DocumentModel,
  draggedId: NodeId,
  clientX: number,
  clientY: number,
  documentRef: Pick<Document, 'elementFromPoint' | 'querySelectorAll'> = window.document,
) {
  const target = documentRef.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const draggedNode = model.nodes[draggedId];
  if (!target || !draggedNode || draggedNode.type === 'site' || !draggedNode.parentId) {
    return null;
  }

  const visited = new Set<string>();
  let current: HTMLElement | null = target;
  while (current) {
    const wrapperId = current.dataset.dropWrapperId;
    if (wrapperId && !visited.has(wrapperId)) {
      visited.add(wrapperId);
      const candidate = model.nodes[wrapperId];
      if (
        candidate &&
        candidate.type === 'wrapper' &&
        isValidDropParent(model, draggedNode, candidate)
      ) {
        return {
          wrapperId,
          rect: current.getBoundingClientRect(),
        };
      }
    }
    current = current.parentElement;
  }

  const fallback = findDropWrapperElement(draggedNode.parentId, documentRef);
  if (!fallback) {
    return null;
  }

  return {
    wrapperId: draggedNode.parentId,
    rect: fallback.getBoundingClientRect(),
  };
}

export function findDropWrapperElement(
  wrapperId: string,
  documentRef: Pick<Document, 'querySelectorAll'> = window.document,
) {
  const wrappers = documentRef.querySelectorAll<HTMLElement>('[data-drop-wrapper-id]');
  for (const wrapper of wrappers) {
    if (wrapper.dataset.dropWrapperId === wrapperId) {
      return wrapper;
    }
  }
  return null;
}

function isValidDropParent(
  model: DocumentModel,
  draggedNode: Exclude<DocumentNode, { type: 'site' }>,
  candidate: WrapperNode,
) {
  if (candidate.id === draggedNode.id) {
    return false;
  }

  if (isDescendant(model, candidate.id, draggedNode.id)) {
    return false;
  }

  if (draggedNode.type === 'leaf') {
    return true;
  }

  if (draggedNode.role !== 'container') {
    return false;
  }

  if (candidate.role === 'container') {
    return true;
  }

  return candidate.role === 'section' || candidate.role === 'header' || candidate.role === 'footer';
}

function isDescendant(model: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  let current: DocumentNode | undefined = model.nodes[candidateId];
  while (current && current.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = model.nodes[current.parentId];
  }
  return false;
}

export function measureStageNodeSizes(root: HTMLElement): MeasuredNodeSizes {
  const next: MeasuredNodeSizes = {};
  const elements = root.querySelectorAll<HTMLElement>('[data-node-id]');

  for (const element of elements) {
    const nodeId = element.dataset.nodeId;
    if (!nodeId) {
      continue;
    }

    const measured = measureStageNodeElement(element);
    if (!measured) {
      continue;
    }

    next[nodeId] = measured;
  }

  return next;
}

export function measureStageNodeElement(
  element: Pick<HTMLElement, 'dataset' | 'classList' | 'getBoundingClientRect' | 'querySelector'>,
) {
  const nodeId = element.dataset.nodeId;
  if (!nodeId) {
    return null;
  }

  const contentWrapper =
    element.classList.contains('stage-wrapper')
      ? element.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
      : null;
  const rect = (contentWrapper ?? element).getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    width: rect.width,
    height: rect.height,
  };
}

export function areMeasuredNodeSizesEqual(current: MeasuredNodeSizes, next: MeasuredNodeSizes) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of nextKeys) {
    const currentSize = current[key];
    const nextSize = next[key];
    if (!currentSize || !nextSize) {
      return false;
    }

    if (Math.abs(currentSize.width - nextSize.width) > 0.5 || Math.abs(currentSize.height - nextSize.height) > 0.5) {
      return false;
    }
  }

  return true;
}

export function getNodeWidth(node: Exclude<DocumentNode, { type: 'site' }>, measuredNodeSizes: MeasuredNodeSizes = {}) {
  const measured = measuredNodeSizes[node.id];
  if (measured?.width && measured.width > 0) {
    return measured.width;
  }

  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return width.unit === 'px' ? width.value : width.unit === 'vw'
      ? (width.value / 100) * VIEWPORT_WIDTH
      : width.unit === 'vh'
        ? (width.value / 100) * VIEWPORT_HEIGHT
        : width.unit === 'vmin'
          ? (width.value / 100) * Math.min(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
          : width.unit === 'vmax'
            ? (width.value / 100) * Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
            : (width.value / 100) * 960;
  }
  return 240;
}

export function getNodeHeight(node: Exclude<DocumentNode, { type: 'site' }>, measuredNodeSizes: MeasuredNodeSizes = {}) {
  const measured = measuredNodeSizes[node.id];
  if (measured?.height && measured.height > 0) {
    return measured.height;
  }

  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.unit === 'px' ? height.value : height.unit === 'vh'
      ? (height.value / 100) * VIEWPORT_HEIGHT
      : height.unit === 'vw'
        ? (height.value / 100) * VIEWPORT_WIDTH
        : height.unit === 'vmin'
          ? (height.value / 100) * Math.min(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
          : height.unit === 'vmax'
            ? (height.value / 100) * Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
            : (height.value / 100) * 480;
  }
  if (height.keyword === 'aspect-ratio') {
    return getNodeWidth(node, measuredNodeSizes) / height.ratio;
  }
  if (node.type === 'wrapper') {
    return node.role === 'header' || node.role === 'footer' ? 0 : 480;
  }
  return estimateAutoLeafHeight(node, measuredNodeSizes);
}

function estimateAutoLeafHeight(node: LeafNode, measuredNodeSizes: MeasuredNodeSizes = {}) {
  if (node.role === 'text') {
    const fontSize =
      node.style?.fontSize && 'unit' in node.style.fontSize.parsed
        ? resolveFontSizePx(
            node.style.fontSize.parsed,
            {
              rootFontSizePx: 16,
              inheritedFontSizePx: 16,
            },
          )
        : 18;
    const widthPx = getNodeWidth(node, measuredNodeSizes);
    const content = node.content || '';
    const charsPerLine = Math.max(10, Math.floor(widthPx / Math.max(fontSize * 0.58, 1)));
    const lineCount = Math.max(
      1,
      content.split('\n').reduce(
        (count, line) => count + Math.max(1, Math.ceil(line.length / charsPerLine)),
        0,
      ),
    );
    return Math.ceil(lineCount * fontSize * 1.24);
  }

  if (node.role === 'link') {
    return 24;
  }

  if (node.role === 'button') {
    return 50;
  }

  return 56;
}

export function resolveOffsetPx(
  offset: NonNullable<StickyDefinition['offsetTop']>,
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: MeasuredNodeSizes = {},
) {
  return resolveUnitValuePx(
    offset.parsed,
    {
      width: getNodeWidth(node, measuredNodeSizes),
      height: getNodeHeight(node, measuredNodeSizes),
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    },
    'height',
  );
}

export function hasIntrinsicWidth(node: Exclude<DocumentNode, { type: 'site' }>) {
  return !('unit' in node.rect.width.base.parsed);
}
