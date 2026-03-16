import type { CSSProperties } from 'react';
import type { ComputedWrapperStickyState, DocumentNode, WrapperNode } from '../../model/types';
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

export type RenderTrackSpacerEdge = 'top' | 'bottom';
export type RenderWrapperTag = 'div' | 'section' | 'header' | 'footer';
export type RenderLeafPlanNode = {
  kind: 'leaf';
  node: RenderLeafNode;
  nodeClassName: string;
  meshPlacement?: CSSProperties;
  selfSticky: boolean;
  selfStickyTrack: boolean;
  trackClassName: string;
  spacerEdgesBefore: RenderTrackSpacerEdge[];
  spacerEdgesAfter: RenderTrackSpacerEdge[];
  imageClassName: string;
  imagePlaceholderClassName: string;
  isBrandMark: boolean;
};

export type RenderWrapperPlanNode = {
  kind: 'wrapper';
  node: WrapperNode;
  isTopLevel: boolean;
  tag: RenderWrapperTag;
  nodeClassName: string;
  meshPlacement?: CSSProperties;
  selfSticky: boolean;
  selfStickyTrack: boolean;
  contentSticky: boolean;
  trackClassName: string;
  spacerEdgesBefore: RenderTrackSpacerEdge[];
  spacerEdgesAfter: RenderTrackSpacerEdge[];
  contentClassName: string;
  contentSpacerClassName: string;
  stickyState: WrapperRenderPlan['stickyState'];
  registrationMap: WrapperRenderPlan['registrationMap'];
  extraExtent: number;
  meshLayout: WrapperRenderPlan['meshLayout'];
  children: RenderPlanNode[];
};

export type RenderPlanNode = RenderWrapperPlanNode | RenderLeafPlanNode;

export type RenderRootPlan = {
  header: RenderWrapperPlanNode | null;
  footer: RenderWrapperPlanNode | null;
  main: RenderWrapperPlanNode[];
};
