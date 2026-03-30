import type { CSSProperties } from 'react';
import type { DocumentNode, StickyDefinition } from '../model/types';
import { STICKY_LAYER_Z_INDEX } from './layers';

export function getStickyEdgeMode(sticky: StickyDefinition | undefined): 'top' | 'bottom' | 'both' {
  if (!sticky) {
    return 'top';
  }
  const bottom = sticky.edges.bottom ?? false;
  const top = sticky.edges.top ?? !bottom;
  if (top && bottom) {
    return 'both';
  }
  return bottom ? 'bottom' : 'top';
}

export function getStickyCssProperties(
  sticky: StickyDefinition | undefined,
  {
    includePosition = false,
    includeZIndex = false,
    isElevated = true,
  }: { includePosition?: boolean; includeZIndex?: boolean; isElevated?: boolean } = {},
): CSSProperties {
  if (!sticky?.enabled) {
    return {};
  }

  const style: CSSProperties = {};
  if (includePosition) {
    style.position = 'sticky';
  }
  if (includeZIndex && isElevated) {
    style.zIndex = STICKY_LAYER_Z_INDEX;
  }

  const edgeMode = getStickyEdgeMode(sticky);
  if (edgeMode === 'bottom') {
    style.bottom = sticky.offsetBottom?.raw ?? '0px';
  } else if (edgeMode === 'both') {
    style.top = sticky.offsetTop?.raw ?? '0px';
    style.bottom = sticky.offsetBottom?.raw ?? '0px';
  } else {
    style.top = sticky.offsetTop?.raw ?? '0px';
  }

  return style;
}

export function resolveStickyIsElevated(
  sticky: StickyDefinition,
  globalStickyElevation: boolean,
): boolean {
  if (globalStickyElevation) {
    return true;
  }
  return sticky.elevated === true;
}

export function usesSyntheticStickyTrack(
  node: Exclude<DocumentNode, { type: 'site' }>,
  { isTopLevel = false }: { isTopLevel?: boolean } = {},
) {
  if (!node.sticky?.enabled || node.sticky.target !== 'self' || node.sticky.durationMode === 'auto') {
    return false;
  }

  if (node.type === 'wrapper' && isTopLevel && node.role !== 'container') {
    return false;
  }

  return true;
}
