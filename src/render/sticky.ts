import type { CSSProperties } from 'react';
import type { StickyDefinition } from '../model/types';

export const STICKY_LAYER_Z_INDEX = 14;

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
  { includePosition = false, includeZIndex = false }: { includePosition?: boolean; includeZIndex?: boolean } = {},
): CSSProperties {
  if (!sticky?.enabled) {
    return {};
  }

  const style: CSSProperties = {};
  if (includePosition) {
    style.position = 'sticky';
  }
  if (includeZIndex) {
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
