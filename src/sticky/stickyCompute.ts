import type {
  ComputedStickyRegistration,
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  StickyDefinition,
  WrapperNode,
} from '../model/types';
import { resolveUnitValuePx } from '../model/units';

const VIEWPORT = { width: 1440, height: 900 };

export function computeStickyState(
  document: DocumentModel,
): Record<string, ComputedWrapperStickyState> {
  const result: Record<string, ComputedWrapperStickyState> = {};
  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'wrapper') {
      continue;
    }
    result[node.id] = {
      wrapperId: node.id,
      totalExtraExtentPx: 0,
      registrations: [],
    };
  }

  for (const node of Object.values(document.nodes)) {
    if (node.type === 'site' || !node.sticky?.enabled) {
      continue;
    }
    const ownerWrapper = resolveStickyOwnerWrapper(document, node);
    if (!ownerWrapper) {
      continue;
    }
    const edgeMode = getStickyEdgeMode(node.sticky);
    const topDurationPx = resolveStickyDurationPx(
      node.sticky.durationTop ?? node.sticky.duration,
      ownerWrapper,
    );
    const bottomDurationPx = resolveStickyDurationPx(
      node.sticky.durationBottom ?? node.sticky.duration,
      ownerWrapper,
    );
    const durationPx =
      node.sticky.durationMode === 'auto'
        ? getWrapperHeight(ownerWrapper)
        : edgeMode === 'both'
          ? topDurationPx + bottomDurationPx
          : edgeMode === 'bottom'
            ? bottomDurationPx
            : topDurationPx;
    const startPx = getSpacerStartPx(node, ownerWrapper);
    const endPx = startPx + durationPx;
    const extentPx =
      node.sticky.durationMode === 'auto'
        ? 0
        : Math.max(0, endPx - getWrapperHeight(ownerWrapper));
    const registration: ComputedStickyRegistration = {
      ownerId: node.id,
      parentWrapperId: ownerWrapper.id,
      target: node.sticky.target,
      edges: node.sticky.edges,
      startPx,
      endPx,
      durationPx,
      topDurationPx,
      bottomDurationPx,
      extentPx,
    };
    result[ownerWrapper.id].registrations.push(registration);
    if (registration.target === 'contentWrapper') {
      result[ownerWrapper.id].totalExtraExtentPx = Math.max(
        result[ownerWrapper.id].totalExtraExtentPx,
        extentPx,
      );
    }
  }

  return result;
}

function resolveStickyDurationPx(duration: StickyDefinition['duration'], ownerWrapper: WrapperNode) {
  return resolveUnitValuePx(
    duration.parsed,
    {
      width: getWrapperWidth(ownerWrapper),
      height: getWrapperHeight(ownerWrapper),
      viewportWidth: VIEWPORT.width,
      viewportHeight: VIEWPORT.height,
    },
    'height',
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

function resolveStickyOwnerWrapper(
  document: DocumentModel,
  node: Exclude<DocumentNode, { type: 'site' }>,
): WrapperNode | null {
  if (node.type === 'wrapper' && node.sticky?.target === 'contentWrapper') {
    return node;
  }
  return findParentWrapper(document, node.parentId);
}

function getSpacerStartPx(node: Exclude<DocumentNode, { type: 'site' }>, parentWrapper: WrapperNode) {
  if (node.type === 'wrapper' && node.id === parentWrapper.id) {
    if (node.sticky?.target === 'contentWrapper') {
      return getWrapperHeight(parentWrapper);
    }
    return getWrapperHeight(node);
  }

  const y = parseFloat(node.rect.y.base.raw) || 0;
  const height = getNodeHeight(node);
  return y + height;
}

function findParentWrapper(
  document: DocumentModel,
  parentId: DocumentNode['parentId'],
): WrapperNode | null {
  let cursor = parentId;
  while (cursor) {
    const node = document.nodes[cursor];
    if (node?.type === 'wrapper') {
      return node;
    }
    cursor = node?.parentId ?? null;
  }
  return null;
}

function getWrapperWidth(node: WrapperNode): number {
  const width = node.rect.width.base.parsed;
  if ('unit' in width && width.unit === 'px') {
    return width.value;
  }
  return 960;
}

function getWrapperHeight(node: WrapperNode): number {
  const height = node.rect.height.base.parsed;
  if ('unit' in height && height.unit === 'px') {
    return height.value;
  }
  return 480;
}

function getNodeHeight(node: Exclude<DocumentNode, { type: 'site' }>): number {
  const height = node.rect.height.base.parsed;
  if ('unit' in height) {
    return height.value;
  }
  if (height.keyword === 'aspect-ratio') {
    return 160;
  }
  return 48;
}
