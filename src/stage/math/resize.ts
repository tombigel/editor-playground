import type { DocumentModel, DocumentNode, ViewportMeasurement } from '../../model/types';
import { convertRenderedPxToGeometryUnit } from '../../model/conversion';
import type { MeasuredNodeSizes, ResizeState } from '../types';
import { getNodeWidth, getNodeHeight, DEFAULT_STAGE_VIEWPORT } from './nodeGeometry';

const MIN_NODE_SIZE = 24;

export function getResizeStartSize(handleElement: HTMLDivElement, fallbackWidth: number, fallbackHeight: number) {
  const nodeElement = handleElement.closest<HTMLElement>('[data-node-id]');
  return getResizeStartSizeForNode(nodeElement, fallbackWidth, fallbackHeight);
}

export function getResizeStartSizeForNode(
  nodeElement: HTMLElement | null,
  fallbackWidth: number,
  fallbackHeight: number,
) {
  if (!nodeElement) {
    return { width: fallbackWidth, height: fallbackHeight };
  }

  const nodeId = nodeElement.dataset.nodeId;
  const contentWrapper =
    nodeId && nodeElement.classList.contains('stage-wrapper')
      ? nodeElement.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
      : null;
  const rect = (contentWrapper ?? nodeElement).getBoundingClientRect();
  return {
    width: rect.width > 0 ? rect.width : fallbackWidth,
    height: rect.height > 0 ? rect.height : fallbackHeight,
  };
}

export function getStructuralResizeMinHeight(handleElement: HTMLDivElement, fallbackHeight: number) {
  const nodeElement = handleElement.closest<HTMLElement>('[data-node-id]');
  return getStructuralResizeMinHeightForNode(nodeElement, fallbackHeight);
}

export function getStructuralResizeMinHeightForNode(nodeElement: HTMLElement | null, fallbackHeight: number) {
  if (!nodeElement) {
    return fallbackHeight;
  }

  const nodeId = nodeElement.dataset.nodeId;
  const contentWrapper =
    nodeId && nodeElement.classList.contains('stage-wrapper')
      ? nodeElement.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
      : null;
  if (!contentWrapper) {
    return fallbackHeight;
  }

  const ownerDocument = contentWrapper.ownerDocument;
  const defaultView = ownerDocument.defaultView;
  const contentWrapperRect = contentWrapper.getBoundingClientRect();
  if (!defaultView || contentWrapperRect.height <= 0) {
    return fallbackHeight;
  }

  const computed = defaultView.getComputedStyle(contentWrapper);
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const descendants = contentWrapper.querySelectorAll<HTMLElement>('[data-node-id]');

  let maxBottom = paddingTop;
  for (const descendant of descendants) {
    if (descendant.dataset.nodeId === nodeId) {
      continue;
    }

    const directOwner = descendant.parentElement?.closest<HTMLElement>('[data-node-id]');
    if (directOwner?.dataset.nodeId !== nodeId) {
      continue;
    }

    const rect = descendant.getBoundingClientRect();
    maxBottom = Math.max(maxBottom, rect.bottom - contentWrapperRect.top);
  }

  return Math.max(MIN_NODE_SIZE, Math.ceil(maxBottom + paddingBottom));
}

export function px(value: number) {
  return `${Math.round(value)}px`;
}

export function getResizeCommitSize(
  node: Exclude<DocumentNode, { contentType: 'site' }>,
  resizeState: Exclude<ResizeState, null>,
  nextWidth: number,
  nextHeight: number,
  documentModel?: DocumentModel,
  measuredNodeSizes: MeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_STAGE_VIEWPORT,
) {
  const changesWidth = resizeState.handle.includes('e') || resizeState.handle.includes('w');
  const changesHeight = resizeState.handle.includes('n') || resizeState.handle.includes('s');
  const parentReference = documentModel ? getResizeParentReference(node, documentModel, measuredNodeSizes, viewport) : null;

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
  parsed: Exclude<DocumentNode, { contentType: 'site' }>['rect']['width' | 'height']['base']['parsed'],
  _raw: string,
  pxValue: number,
  reference: { width: number; height: number; viewportWidth: number; viewportHeight: number } | null,
) {
  if ('unit' in parsed) {
    if (parsed.unit === '%') {
      return px(pxValue);
    }
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
  if (!reference) {
    return null;
  }
  return convertRenderedPxToGeometryUnit(pxValue, axis, unit, {
    referenceSizePx: axis === 'width' ? reference.width : reference.height,
    viewport: {
      width: reference.viewportWidth,
      height: reference.viewportHeight,
    },
  });
}

function getResizeParentReference(
  node: Exclude<DocumentNode, { contentType: 'site' }>,
  documentModel: DocumentModel,
  measuredNodeSizes: MeasuredNodeSizes,
  viewport: ViewportMeasurement,
) {
  const parent = node.parentId ? documentModel.nodes[node.parentId] : null;
  if (!parent || parent.contentType === 'site') {
    return {
      width: viewport.width,
      height: viewport.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    };
  }

  return {
    width: getNodeWidth(parent, measuredNodeSizes, viewport),
    height: getNodeHeight(parent, measuredNodeSizes, viewport),
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
}

function formatResizeNumber(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
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
  const minWidth = resizeState.minWidth ?? MIN_NODE_SIZE;
  const minHeight = resizeState.minHeight ?? MIN_NODE_SIZE;

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

  if (width < minWidth) {
    if (isWest) {
      x -= minWidth - width;
    }
    width = minWidth;
  }

  if (height < minHeight) {
    if (isNorth) {
      y -= minHeight - height;
    }
    height = minHeight;
  }

  if (shiftKey && isCornerHandle) {
    const scale = Math.max(
      1,
      minWidth / Math.max(width, 1),
      minHeight / Math.max(height, 1),
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
