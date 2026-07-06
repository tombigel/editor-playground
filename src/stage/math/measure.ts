import type { DocumentModel, ViewportMeasurement } from '../../model/types';
import { isContainerNode } from '../../model/types';
import type { MeasuredNodeSizes } from '../types';
import { DEFAULT_STAGE_VIEWPORT } from './nodeGeometry';

export function measureStageNodeSizes(root: HTMLElement, document: DocumentModel): MeasuredNodeSizes {
  const next: MeasuredNodeSizes = {};
  const elements = root.querySelectorAll<HTMLElement>('[data-node-id]');

  for (const element of elements) {
    const nodeId = element.dataset.nodeId;
    if (!nodeId) {
      continue;
    }
    const node = document.nodes[nodeId];
    if (!node || node.contentType === 'site') {
      continue;
    }

    const measured = measureStageNodeElement(element);
    if (!measured) {
      continue;
    }

    const nextWidth = shouldMeasureNodeWidth(node) ? measured.width : 0;
    const nextHeight = shouldMeasureNodeHeight(node) ? measured.height : 0;
    if (nextWidth <= 0 && nextHeight <= 0) {
      continue;
    }

    next[nodeId] = {
      width: nextWidth,
      height: nextHeight,
    };
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

export function measureStageViewport(
  root: Pick<HTMLElement, 'getBoundingClientRect' | 'ownerDocument'>,
): ViewportMeasurement | null {
  const rect = root.getBoundingClientRect();
  const defaultView = root.ownerDocument.defaultView;
  if (!defaultView || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const computed = defaultView.getComputedStyle(root as Element);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const width = rect.width - paddingLeft - paddingRight;
  const height = rect.height - paddingTop - paddingBottom;

  return width > 0 && height > 0
    ? {
        width,
        height,
      }
    : null;
}

export function measureCssViewport(
  root: Pick<HTMLElement, 'ownerDocument'> | null,
  fallback: ViewportMeasurement = DEFAULT_STAGE_VIEWPORT,
): ViewportMeasurement {
  const defaultView = root?.ownerDocument.defaultView;
  if (!defaultView || defaultView.innerWidth <= 0 || defaultView.innerHeight <= 0) {
    return fallback;
  }

  return {
    width: defaultView.innerWidth,
    height: defaultView.innerHeight,
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

function shouldMeasureNodeWidth(node: Exclude<import('../../model/types').DocumentNode, { contentType: 'site' }>) {
  const width = node.rect.width.base.parsed;
  // Only measure percentage widths.  Keyword widths (fit-content, min-content,
  // max-content) are resolved natively by the browser — feeding the measured
  // value back into the grid column template creates a resize feedback loop.
  return 'unit' in width && width.unit === '%';
}

function shouldMeasureNodeHeight(node: Exclude<import('../../model/types').DocumentNode, { contentType: 'site' }>) {
  if (isContainerNode(node) && node.subtype === 'group') {
    return false;
  }

  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.unit === '%';
  }
  return height.keyword === 'auto';
}
