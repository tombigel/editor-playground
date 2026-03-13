import type {
  ComputedStickyRegistration,
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
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
    const durationPx = resolveUnitValuePx(
      node.sticky.duration.parsed,
      {
        width: getWrapperWidth(ownerWrapper),
        height: getWrapperHeight(ownerWrapper),
        viewportWidth: VIEWPORT.width,
        viewportHeight: VIEWPORT.height,
      },
      'height',
    );
    const startPx = getSpacerStartPx(node, ownerWrapper);
    const endPx = startPx + durationPx;
    const extentPx = Math.max(0, endPx - getWrapperHeight(ownerWrapper));
    const registration: ComputedStickyRegistration = {
      ownerId: node.id,
      parentWrapperId: ownerWrapper.id,
      target: node.sticky.target,
      edges: node.sticky.edges,
      startPx,
      endPx,
      durationPx,
      extentPx,
    };
    result[ownerWrapper.id].registrations.push(registration);
    result[ownerWrapper.id].totalExtraExtentPx = Math.max(
      result[ownerWrapper.id].totalExtraExtentPx,
      extentPx,
    );
  }

  return result;
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
