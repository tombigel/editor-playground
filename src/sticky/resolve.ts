import { getChildren } from '../model/selectors';
import type {
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  StickyDefinition,
  TextLeaf,
  WrapperNode,
} from '../model/types';
import { resolveFontSizePx, resolveUnitValuePx } from '../model/units';

const DEFAULT_VIEWPORT_WIDTH = 1440;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const DEFAULT_PERCENT_WIDTH_REFERENCE = 960;
const DEFAULT_PERCENT_HEIGHT_REFERENCE = 480;

export type StickyMeasuredNodeSizes = Record<string, { width: number; height: number }>;

export type StickyGeometrySnapshot = {
  nodeSizes?: StickyMeasuredNodeSizes;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type StickyLayoutState = Record<string, ComputedWrapperStickyState>;

type StickyRegistration = ComputedWrapperStickyState['registrations'][number];

type ResolvedStickyGeometry = {
  nodeSizes: StickyMeasuredNodeSizes;
  viewportWidth: number;
  viewportHeight: number;
};

export function resolveStickyLayout(
  document: DocumentModel,
  geometry: StickyGeometrySnapshot = {},
): StickyLayoutState {
  const resolvedGeometry = withDefaultGeometry(geometry);
  const result: StickyLayoutState = {};

  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'wrapper') {
      continue;
    }

    const children = getChildren(document, node.id).filter(
      (child): child is Exclude<DocumentNode, { type: 'site' }> => child.type !== 'site',
    );
    result[node.id] = resolveWrapperStickyState(node, children, resolvedGeometry);
  }

  return result;
}

export function resolveWrapperStickyState(
  wrapper: WrapperNode,
  children: Exclude<DocumentNode, { type: 'site' }>[],
  geometry: StickyGeometrySnapshot = {},
): ComputedWrapperStickyState {
  const resolvedGeometry = withDefaultGeometry(geometry);
  const registrations: StickyRegistration[] = [];
  const ownContentWrapperRegistration = getOwnContentWrapperStickyRegistration(wrapper, resolvedGeometry);
  if (ownContentWrapperRegistration) {
    registrations.push(ownContentWrapperRegistration);
  }

  for (const child of children) {
    if (!child.sticky?.enabled) {
      continue;
    }
    if (child.type === 'wrapper' && child.sticky.target === 'contentWrapper') {
      continue;
    }
    registrations.push(buildStickyRegistration(child, wrapper, resolvedGeometry));
  }

  return {
    wrapperId: wrapper.id,
    totalExtraExtentPx: Math.max(
      0,
      ...registrations
        .filter((registration) => registration.target === 'contentWrapper')
        .map((registration) => registration.extentPx),
    ),
    registrations,
  };
}

function withDefaultGeometry(geometry: StickyGeometrySnapshot): ResolvedStickyGeometry {
  return {
    nodeSizes: geometry.nodeSizes ?? {},
    viewportWidth: geometry.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH,
    viewportHeight: geometry.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT,
  };
}

function getOwnContentWrapperStickyRegistration(
  wrapper: WrapperNode,
  geometry: ResolvedStickyGeometry,
) {
  if (!wrapper.sticky?.enabled || wrapper.sticky.target !== 'contentWrapper') {
    return null;
  }
  return buildStickyRegistration(wrapper, wrapper, geometry);
}

function buildStickyRegistration(
  owner: Exclude<DocumentNode, { type: 'site' }>,
  parentWrapper: WrapperNode,
  geometry: ResolvedStickyGeometry,
): StickyRegistration {
  const sticky = owner.sticky!;
  const edgeMode = getStickyEdgeMode(sticky);
  const topDurationPx = resolveStickyDurationPx(
    sticky.durationTop ?? sticky.duration,
    parentWrapper,
    geometry,
  );
  const bottomDurationPx = resolveStickyDurationPx(
    sticky.durationBottom ?? sticky.duration,
    parentWrapper,
    geometry,
  );
  const parentHeight = getNodeHeight(parentWrapper, geometry);
  const durationPx =
    sticky.durationMode === 'auto'
      ? parentHeight
      : edgeMode === 'both'
        ? topDurationPx + bottomDurationPx
        : edgeMode === 'bottom'
          ? bottomDurationPx
          : topDurationPx;
  const startPx = getStickyStartPx(owner, parentWrapper, geometry);
  const endPx = startPx + durationPx;
  const extentPx =
    sticky.durationMode === 'auto'
      ? 0
      : Math.max(0, endPx - parentHeight);

  return {
    ownerId: owner.id,
    parentWrapperId: parentWrapper.id,
    target: sticky.target,
    edges: sticky.edges,
    startPx,
    endPx,
    durationPx,
    topDurationPx,
    bottomDurationPx,
    extentPx,
  };
}

function resolveStickyDurationPx(
  duration: StickyDefinition['duration'],
  ownerWrapper: WrapperNode,
  geometry: ResolvedStickyGeometry,
) {
  return resolveUnitValuePx(
    duration.parsed,
    {
      width: getNodeWidth(ownerWrapper, geometry),
      height: getNodeHeight(ownerWrapper, geometry),
      viewportWidth: geometry.viewportWidth,
      viewportHeight: geometry.viewportHeight,
    },
    'height',
  );
}

function getStickyStartPx(
  owner: Exclude<DocumentNode, { type: 'site' }>,
  parentWrapper: WrapperNode,
  geometry: ResolvedStickyGeometry,
) {
  if (owner.type === 'wrapper' && owner.id === parentWrapper.id) {
    return getNodeHeight(parentWrapper, geometry);
  }

  const y = resolveCoordinatePx(
    owner.rect.y.base.parsed,
    getNodeWidth(parentWrapper, geometry),
    getNodeHeight(parentWrapper, geometry),
    'y',
    geometry,
  );
  return y + getNodeHeight(owner, geometry);
}

function resolveCoordinatePx(
  value: WrapperNode['rect']['x']['base']['parsed'],
  width: number,
  height: number,
  axis: 'x' | 'y',
  geometry: ResolvedStickyGeometry,
) {
  return resolveUnitValuePx(
    value,
    {
      width,
      height,
      viewportWidth: geometry.viewportWidth,
      viewportHeight: geometry.viewportHeight,
    },
    axis,
  );
}

function getStickyEdgeMode(sticky: StickyDefinition): 'top' | 'bottom' | 'both' {
  const bottom = sticky.edges.bottom ?? false;
  const top = sticky.edges.top ?? !bottom;
  if (top && bottom) {
    return 'both';
  }
  return bottom ? 'bottom' : 'top';
}

function getNodeWidth(
  node: Exclude<DocumentNode, { type: 'site' }>,
  geometry: ResolvedStickyGeometry,
) {
  const measured = geometry.nodeSizes[node.id];
  if (measured?.width && measured.width > 0) {
    return measured.width;
  }

  const width = node.rect.width.base.parsed;
  if ('unit' in width) {
    return width.unit === 'px'
      ? width.value
      : width.unit === 'vw'
        ? (width.value / 100) * geometry.viewportWidth
        : width.unit === 'vh'
          ? (width.value / 100) * geometry.viewportHeight
          : width.unit === 'vmin'
            ? (width.value / 100) * Math.min(geometry.viewportWidth, geometry.viewportHeight)
            : width.unit === 'vmax'
              ? (width.value / 100) * Math.max(geometry.viewportWidth, geometry.viewportHeight)
              : (width.value / 100) * DEFAULT_PERCENT_WIDTH_REFERENCE;
  }

  return 240;
}

function getNodeHeight(
  node: Exclude<DocumentNode, { type: 'site' }>,
  geometry: ResolvedStickyGeometry,
) {
  const measured = geometry.nodeSizes[node.id];
  if (measured?.height && measured.height > 0) {
    return measured.height;
  }

  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.unit === 'px'
      ? height.value
      : height.unit === 'vh'
        ? (height.value / 100) * geometry.viewportHeight
        : height.unit === 'vw'
          ? (height.value / 100) * geometry.viewportWidth
          : height.unit === 'vmin'
            ? (height.value / 100) * Math.min(geometry.viewportWidth, geometry.viewportHeight)
            : height.unit === 'vmax'
              ? (height.value / 100) * Math.max(geometry.viewportWidth, geometry.viewportHeight)
              : (height.value / 100) * DEFAULT_PERCENT_HEIGHT_REFERENCE;
  }
  if (height.keyword === 'aspect-ratio') {
    return getNodeWidth(node, geometry) / height.ratio;
  }
  if (node.type === 'wrapper') {
    return node.role === 'header' || node.role === 'footer' ? 0 : DEFAULT_PERCENT_HEIGHT_REFERENCE;
  }
  return estimateAutoLeafHeight(node, geometry);
}

function estimateAutoLeafHeight(node: TextLeaf | Extract<DocumentNode, { type: 'leaf'; role: 'link' | 'button' | 'image' }>, geometry: ResolvedStickyGeometry) {
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
    const widthPx = getNodeWidth(node, geometry);
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
