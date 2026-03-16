import type { ComputedWrapperStickyState } from '../../model/types';

export type StickyMeasuredNodeSizes = Record<string, { width: number; height: number }>;

export type StickyGeometrySnapshot = {
  nodeSizes?: StickyMeasuredNodeSizes;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type StickyLayoutState = Record<string, ComputedWrapperStickyState>;

export type StickyRegistration = ComputedWrapperStickyState['registrations'][number];

export type ResolvedStickyGeometry = {
  nodeSizes: StickyMeasuredNodeSizes;
  viewportWidth: number;
  viewportHeight: number;
};
