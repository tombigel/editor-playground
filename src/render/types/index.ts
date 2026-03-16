import type { CSSProperties } from 'react';
import type { ComputedWrapperStickyState, DocumentNode } from '../../model/types';
import type { StickyMeasuredNodeSizes } from '../../sticky/types';

export type StyleValue = string | number;
export type StyleRecord = Record<string, StyleValue>;

export type SharedCssRule = {
  selector: string;
  style: StyleRecord;
};

export type StageOrSiteNode = Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>;
export type PresentationLeafNode = Extract<DocumentNode, { type: 'leaf' }>;

export type RenderLeafContentOptions = {
  textStyle?: CSSProperties;
  imageClassName?: string;
  imagePlaceholderClassName?: string;
  imageDraggable?: boolean;
  disableTabNavigation?: boolean;
};

export type RenderLeafNode = Extract<DocumentNode, { type: 'leaf' }>;
export type RenderExportableNode = Exclude<DocumentNode, { type: 'site' }>;
export type RenderMeasuredNodeSizes = StickyMeasuredNodeSizes;

export type MeshLayout = {
  columnTemplate: string;
  rowTemplate: string;
  childPlacements: Record<string, CSSProperties>;
  columnLines: number[];
  rowLines: number[];
  bottomLanePx: number;
};

export type WrapperRenderPlan = {
  children: RenderExportableNode[];
  stickyState: ComputedWrapperStickyState;
  registrationMap: Map<string, ComputedWrapperStickyState['registrations'][number]>;
  extraExtent: number;
  meshLayout: MeshLayout;
};
