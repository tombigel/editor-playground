import type { CSSProperties } from 'react';
import type { DocumentModel, DocumentNode, WrapperNode } from '../../model/types';
import type { WrapperRenderPlan } from '../../render/types';

type SiteLeafNode = Extract<DocumentNode, { type: 'leaf' }>;
export type SiteWrapperTag = 'div' | 'section' | 'header' | 'footer';

export type SiteRendererProps = {
  document: DocumentModel;
  previewSticky?: boolean;
};

export type SiteExportOptions = {
  previewSticky?: boolean;
  title?: string;
  htmlFileName?: string;
  cssFileName?: string;
};

export type SiteExportBundle = {
  htmlFileName: string;
  cssFileName: string;
  bodyHtml: string;
  css: string;
  htmlDocument: string;
};

export type SiteExportableNode = Exclude<DocumentNode, { type: 'site' }>;
export type SiteTrackSpacerEdge = 'top' | 'bottom';

export type SiteLeafPlan = {
  kind: 'leaf';
  node: SiteLeafNode;
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
  tag: SiteWrapperTag;
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
