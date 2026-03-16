import type { CSSProperties } from 'react';
import { getChildren } from '../model/selectors';
import type {
  ComputedWrapperStickyState,
  DocumentModel,
  StickyDefinition,
  WrapperNode,
} from '../model/types';
import { formatValue, resolveFontSizePx, resolveUnitValuePx } from '../model/units';
import { resolveWrapperStickyState } from '../sticky/resolve';
import type {
  MeshLayout,
  RenderExportableNode as ExportableNode,
  RenderLeafNode as LeafNode,
  RenderMeasuredNodeSizes,
  WrapperRenderPlan,
} from './types';
export type {
  MeshLayout,
  RenderExportableNode,
  RenderLeafNode,
  RenderMeasuredNodeSizes,
  WrapperRenderPlan,
} from './types';

export const RENDER_VIEWPORT_WIDTH = 1440;
export const RENDER_VIEWPORT_HEIGHT = 900;
export const AUTO_WRAPPER_MIN_HEIGHT_PX = 120;

export function resolveWrapperRenderPlan(
  document: DocumentModel,
  node: WrapperNode,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
): WrapperRenderPlan {
  const children = getChildren(document, node.id).filter(
    (child): child is ExportableNode => child.type !== 'site',
  );
  const stickyGeometry = {
    nodeSizes: measuredNodeSizes,
    viewportWidth: RENDER_VIEWPORT_WIDTH,
    viewportHeight: RENDER_VIEWPORT_HEIGHT,
  };
  const stickyState = resolveWrapperStickyState(node, children, stickyGeometry);
  const registrationMap = new Map(
    stickyState.registrations.map((registration) => [registration.ownerId, registration]),
  );
  const childWrapperExtraExtentMap = new Map<string, number>();

  for (const child of children) {
    if (child.type !== 'wrapper') {
      continue;
    }
    const childChildren = getChildren(document, child.id).filter(
      (candidate): candidate is ExportableNode => candidate.type !== 'site',
    );
    childWrapperExtraExtentMap.set(
      child.id,
      resolveWrapperStickyState(child, childChildren, stickyGeometry).totalExtraExtentPx,
    );
  }

  return {
    children,
    stickyState,
    registrationMap,
    extraExtent: stickyState.totalExtraExtentPx,
    meshLayout: computeMeshLayout(children, node, registrationMap, childWrapperExtraExtentMap, measuredNodeSizes),
  };
}

export function buildWrapperStyle(node: WrapperNode, isTopLevel: boolean): CSSProperties {
  return {
    width: formatValue(node.rect.width.base.parsed),
    ...(isTopLevel ? {} : { position: 'relative' }),
  };
}

export function getContentWrapperBaseStyle(node: WrapperNode): CSSProperties {
  const height = node.rect.height.base.parsed;
  const base: CSSProperties = {
    width: '100%',
  };

  if ('unit' in height) {
    base.minHeight = formatValue(height);
    return base;
  }

  if (height.keyword === 'aspect-ratio') {
    base.aspectRatio = String(height.ratio);
    return base;
  }

  base.minHeight = `${AUTO_WRAPPER_MIN_HEIGHT_PX}px`;
  return base;
}

export function getLeafCssHeight(node: LeafNode) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return formatValue(height);
  }
  if (height.keyword === 'aspect-ratio') {
    return 'auto';
  }
  return 'auto';
}

export function getTrackCssWidth(node: LeafNode) {
  return formatValue(node.rect.width.base.parsed);
}

export function usesIntrinsicHeight(node: LeafNode) {
  return !('unit' in node.rect.height.base.parsed);
}

export function getNodeWidth(node: ExportableNode, measuredNodeSizes: RenderMeasuredNodeSizes = {}) {
  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return width.unit === 'px' ? width.value : width.unit === 'vw'
      ? (width.value / 100) * RENDER_VIEWPORT_WIDTH
      : width.unit === 'vh'
        ? (width.value / 100) * RENDER_VIEWPORT_HEIGHT
        : width.unit === 'vmin'
          ? (width.value / 100) * Math.min(RENDER_VIEWPORT_WIDTH, RENDER_VIEWPORT_HEIGHT)
          : width.unit === 'vmax'
            ? (width.value / 100) * Math.max(RENDER_VIEWPORT_WIDTH, RENDER_VIEWPORT_HEIGHT)
          : (width.value / 100) * 960;
  }
  const measured = measuredNodeSizes[node.id];
  if (measured?.width && measured.width > 0) {
    return measured.width;
  }
  return 240;
}

export function getNodeHeight(node: ExportableNode, measuredNodeSizes: RenderMeasuredNodeSizes = {}) {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.unit === 'px' ? height.value : height.unit === 'vh'
      ? (height.value / 100) * RENDER_VIEWPORT_HEIGHT
      : height.unit === 'vw'
        ? (height.value / 100) * RENDER_VIEWPORT_WIDTH
        : height.unit === 'vmin'
          ? (height.value / 100) * Math.min(RENDER_VIEWPORT_WIDTH, RENDER_VIEWPORT_HEIGHT)
          : height.unit === 'vmax'
            ? (height.value / 100) * Math.max(RENDER_VIEWPORT_WIDTH, RENDER_VIEWPORT_HEIGHT)
            : (height.value / 100) * 480;
  }
  const measured = measuredNodeSizes[node.id];
  if (height.keyword === 'auto' && measured?.height && measured.height > 0) {
    return measured.height;
  }
  if (height.keyword === 'aspect-ratio') {
    return getNodeWidth(node, measuredNodeSizes) / height.ratio;
  }
  if (node.type === 'wrapper') {
    return node.role === 'header' || node.role === 'footer' ? 0 : 480;
  }
  return estimateAutoLeafHeight(node, measuredNodeSizes);
}

export function resolveOffsetPx(
  offset: NonNullable<StickyDefinition['offsetTop']>,
  node: ExportableNode,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
) {
  return resolveUnitValuePx(
    offset.parsed,
    {
      width: getNodeWidth(node, measuredNodeSizes),
      height: getNodeHeight(node, measuredNodeSizes),
      viewportWidth: RENDER_VIEWPORT_WIDTH,
      viewportHeight: RENDER_VIEWPORT_HEIGHT,
    },
    'height',
  );
}

export function hasIntrinsicWidth(node: ExportableNode) {
  return !('unit' in node.rect.width.base.parsed);
}

export function cssPropertiesToDeclarations(style: CSSProperties | undefined): string[] {
  if (!style) {
    return [];
  }
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([property, value]) => `${toKebabCase(property)}: ${String(value)}`);
}

function estimateAutoLeafHeight(node: LeafNode, measuredNodeSizes: RenderMeasuredNodeSizes = {}) {
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

function computeMeshLayout(
  children: ExportableNode[],
  wrapper: WrapperNode,
  registrations: Map<string, ComputedWrapperStickyState['registrations'][number]>,
  childWrapperExtraExtents: Map<string, number>,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
): MeshLayout {
  const width = getNodeWidth(wrapper, measuredNodeSizes);
  const baseHeight = getWrapperMeshBaseHeight(wrapper, measuredNodeSizes);
  const xLines = new Set<number>([0, width]);
  const yLines = new Set<number>([0, baseHeight]);

  for (const child of children) {
    const childX = resolveCoordinatePx(child.rect.x.base.parsed, width, baseHeight, 'x');
    const childY = resolveCoordinatePx(child.rect.y.base.parsed, width, baseHeight, 'y');
    const childWidth = getNodeWidth(child, measuredNodeSizes);
    const childHeight = getMeshNodeHeight(
      child,
      registrations.get(child.id),
      childWrapperExtraExtents.get(child.id) ?? 0,
      measuredNodeSizes,
    );
    xLines.add(clampLine(childX, width));
    xLines.add(clampLine(childX + childWidth, width));
    yLines.add(Math.max(0, childY));
    yLines.add(Math.max(0, childY + childHeight));
  }

  const columns = sortedLines(xLines);
  const rows = sortedLines(yLines);
  const childPlacements: Record<string, CSSProperties> = {};

  for (const child of children) {
    const childX = resolveCoordinatePx(child.rect.x.base.parsed, width, baseHeight, 'x');
    const childY = resolveCoordinatePx(child.rect.y.base.parsed, width, baseHeight, 'y');
    const childWidth = getNodeWidth(child, measuredNodeSizes);
    const childHeight = getMeshNodeHeight(
      child,
      registrations.get(child.id),
      childWrapperExtraExtents.get(child.id) ?? 0,
      measuredNodeSizes,
    );
    const colStart = lineIndex(columns, clampLine(childX, width));
    const colEnd = lineIndex(columns, clampLine(childX + childWidth, width));
    const rowStart = lineIndex(rows, Math.max(0, childY));
    const rowEnd = lineIndex(rows, Math.max(0, childY + childHeight));

    childPlacements[child.id] = {
      gridColumn: `${colStart} / ${Math.max(colStart + 1, colEnd)}`,
      gridRow: `${rowStart} / ${Math.max(rowStart + 1, rowEnd)}`,
      justifySelf: 'stretch',
      alignSelf: 'stretch',
      minWidth: 0,
      minHeight: 0,
    };
  }

  return {
    columnTemplate: templateFromLines(columns),
    rowTemplate: templateFromLines(rows),
    childPlacements,
    columnLines: columns,
    rowLines: rows,
    bottomLanePx: rows[rows.length - 1] ?? baseHeight,
  };
}

function getMeshNodeHeight(
  node: ExportableNode,
  registration?: ComputedWrapperStickyState['registrations'][number],
  childWrapperExtraExtentPx = 0,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
) {
  let baseHeight = getNodeHeight(node, measuredNodeSizes);
  if (node.type === 'wrapper' && childWrapperExtraExtentPx > 0) {
    baseHeight += childWrapperExtraExtentPx;
  }
  if (
    registration &&
    node.sticky?.enabled &&
    node.sticky.target === 'self' &&
    node.sticky.durationMode !== 'auto' &&
    registration.target === 'self'
  ) {
    return baseHeight + registration.durationPx;
  }
  return baseHeight;
}

function getWrapperMeshBaseHeight(
  wrapper: WrapperNode,
  measuredNodeSizes: RenderMeasuredNodeSizes = {},
) {
  const height = wrapper.rect.height.base.parsed;
  if ('unit' in height || height.keyword === 'aspect-ratio') {
    return getNodeHeight(wrapper, measuredNodeSizes);
  }
  if (wrapper.role === 'header' || wrapper.role === 'footer') {
    return 0;
  }
  return AUTO_WRAPPER_MIN_HEIGHT_PX;
}

function resolveCoordinatePx(
  value: WrapperNode['rect']['x']['base']['parsed'],
  width: number,
  height: number,
  axis: 'x' | 'y',
) {
  return resolveUnitValuePx(
    value,
    {
      width,
      height,
      viewportWidth: RENDER_VIEWPORT_WIDTH,
      viewportHeight: RENDER_VIEWPORT_HEIGHT,
    },
    axis,
  );
}

function clampLine(value: number, max: number) {
  return Math.min(Math.max(0, value), Math.max(max, value));
}

function sortedLines(values: Set<number>) {
  return Array.from(values).sort((a, b) => a - b);
}

function templateFromLines(lines: number[]) {
  if (lines.length < 2) {
    return '1fr';
  }
  return lines
    .slice(0, -1)
    .map((line, index) => `${Math.max(1, lines[index + 1] - line)}px`)
    .join(' ');
}

function lineIndex(lines: number[], value: number) {
  const index = lines.findIndex((line) => Math.abs(line - value) < 0.5);
  return index === -1 ? lines.length : index + 1;
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
