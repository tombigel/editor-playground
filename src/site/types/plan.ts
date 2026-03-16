import type { CSSProperties } from 'react';
import type { DocumentNode, WrapperNode } from '../../model/types';
import type { resolveWrapperRenderPlan } from '../../render/layout';
import type { getWrapperTag } from '../siteShared';

type LeafNode = Extract<DocumentNode, { type: 'leaf' }>;
type WrapperRenderPlan = ReturnType<typeof resolveWrapperRenderPlan>;

export type SiteTrackSpacerEdge = 'top' | 'bottom';

export type SiteLeafPlan = {
  kind: 'leaf';
  node: LeafNode;
  nodeClassName: string;
  meshPlacement?: CSSProperties;
  selfSticky: boolean;
  trackClassName: string;
  spacerEdgesBefore: SiteTrackSpacerEdge[];
  spacerEdgesAfter: SiteTrackSpacerEdge[];
  imageClassName: string;
  imagePlaceholderClassName: string;
  isBrandMark: boolean;
};

export type SiteWrapperPlan = {
  kind: 'wrapper';
  node: WrapperNode;
  isTopLevel: boolean;
  tag: ReturnType<typeof getWrapperTag>;
  nodeClassName: string;
  meshPlacement?: CSSProperties;
  selfSticky: boolean;
  contentSticky: boolean;
  trackClassName: string;
  spacerEdgesBefore: SiteTrackSpacerEdge[];
  spacerEdgesAfter: SiteTrackSpacerEdge[];
  contentClassName: string;
  contentSpacerClassName: string;
  stickyState: WrapperRenderPlan['stickyState'];
  registrationMap: WrapperRenderPlan['registrationMap'];
  extraExtent: number;
  meshLayout: WrapperRenderPlan['meshLayout'];
  children: SiteRenderPlanNode[];
};

export type SiteRenderPlanNode = SiteWrapperPlan | SiteLeafPlan;

export type SiteRootPlan = {
  header: SiteWrapperPlan | null;
  footer: SiteWrapperPlan | null;
  main: SiteWrapperPlan[];
};
