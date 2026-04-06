import type { CSSProperties } from 'react';
import type { ComputedWrapperStickyState, ContainerNode, DocumentNode, MediaNode, TextNode } from '../../model/types';
import type { StickyMeasuredNodeSizes } from '../../sticky/types';

export type StyleValue = string | number;
export type StyleRecord = Record<string, StyleValue>;

export type SharedCssRule = {
  selector: string;
  style: StyleRecord;
};

export type StageOrSiteNode = ContainerNode | TextNode | MediaNode;
export type PresentationLeafNode = TextNode | MediaNode;

export type RenderLeafContentOptions = {
  contentStyle?: CSSProperties;
  imageClassName?: string;
  imagePlaceholderClassName?: string;
  imageDraggable?: boolean;
  disableTabNavigation?: boolean;
};

export type RenderLeafNode = TextNode | MediaNode;
export type RenderExportableNode = Exclude<DocumentNode, { contentType: 'site' }>;
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
  node: ContainerNode;
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

