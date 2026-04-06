import type { DocumentNode, StickyDefinition, ViewportMeasurement } from '../../model/types';
import { isContainerNode, isTextNode } from '../../model/types';
import { resolveFontSizePx, resolveUnitValuePx } from '../../model/units';
import type {
  MeasuredNodeSizes,
  StageMathLeafNode as LeafNode,
} from '../types';

export const DEFAULT_STAGE_VIEWPORT: ViewportMeasurement = {
  width: 1440,
  height: 900,
};

export function numericWidth(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 160;
}

export function numericHeight(raw: string) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 80;
}

export function getNodeWidth(
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: MeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_STAGE_VIEWPORT,
) {
  const measured = measuredNodeSizes[node.id];
  if (measured?.width && measured.width > 0) {
    return measured.width;
  }

  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return width.unit === 'px' ? width.value : width.unit === 'vw'
      ? (width.value / 100) * viewport.width
      : width.unit === 'vh'
        ? (width.value / 100) * viewport.height
        : width.unit === 'vmin'
          ? (width.value / 100) * Math.min(viewport.width, viewport.height)
          : width.unit === 'vmax'
            ? (width.value / 100) * Math.max(viewport.width, viewport.height)
            : 0;
  }
  return 240;
}

export function getNodeHeight(
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: MeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_STAGE_VIEWPORT,
) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    const measured = measuredNodeSizes[node.id];
    if (height.unit === '%' && measured?.height && measured.height > 0) {
      return measured.height;
    }

    return height.unit === 'px' ? height.value : height.unit === 'vh'
      ? (height.value / 100) * viewport.height
      : height.unit === 'vw'
        ? (height.value / 100) * viewport.width
        : height.unit === 'vmin'
          ? (height.value / 100) * Math.min(viewport.width, viewport.height)
        : height.unit === 'vmax'
          ? (height.value / 100) * Math.max(viewport.width, viewport.height)
            : 0;
  }
  const measured = measuredNodeSizes[node.id];
  if (height.keyword === 'auto' && measured?.height && measured.height > 0) {
    return measured.height;
  }
  if (height.keyword === 'aspect-ratio') {
    return getNodeWidth(node, measuredNodeSizes, viewport) / height.ratio;
  }
  if (isContainerNode(node)) {
    return node.subtype === 'header' || node.subtype === 'footer' ? 0 : 0;
  }
  return estimateAutoLeafHeight(node as LeafNode, measuredNodeSizes, viewport);
}

function estimateAutoLeafHeight(
  node: LeafNode,
  measuredNodeSizes: MeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_STAGE_VIEWPORT,
) {
  if (isTextNode(node)) {
    if (node.link !== undefined && node.style?.background !== undefined) {
      return 50;
    }
    if (node.link !== undefined) {
      return 24;
    }
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
    const widthPx = getNodeWidth(node, measuredNodeSizes, viewport);
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

  return 56;
}

export function resolveOffsetPx(
  offset: NonNullable<StickyDefinition['offsetTop']>,
  node: Exclude<DocumentNode, { type: 'site' }>,
  measuredNodeSizes: MeasuredNodeSizes = {},
  viewport: ViewportMeasurement = DEFAULT_STAGE_VIEWPORT,
) {
  return resolveUnitValuePx(
    offset.parsed,
    {
      width: getNodeWidth(node, measuredNodeSizes, viewport),
      height: getNodeHeight(node, measuredNodeSizes, viewport),
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    },
    'height',
  );
}

export function hasIntrinsicWidth(node: Exclude<DocumentNode, { type: 'site' }>) {
  return !('unit' in node.rect.width.base.parsed);
}
