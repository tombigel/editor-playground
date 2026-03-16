import type {
  DocumentNode,
  NodeId,
  StickyDefinition,
  TextLeaf,
  WrapperNode,
} from './index';

export type TemplateBuild = {
  wrapper: WrapperNode;
  nodes: Record<NodeId, DocumentNode>;
};

export type BoxPadding = {
  top: string;
  right: string;
  bottom: string;
  left?: string;
};

export type TemplateNode = DocumentNode | WrapperNode;

export type TextStyleOptions = {
  color?: string;
  fontSize?: string;
  fontWeight?: 'normal' | 'bold';
  lineHeight?: number;
  htmlTag?: TextLeaf['htmlTag'];
};

export type RectConfig = {
  x: string;
  y: string;
  width: string;
  height?: string;
};

export type TextNodeConfig = RectConfig & {
  name: string;
  content: string;
  style?: TextStyleOptions;
};

export type LinkNodeConfig = RectConfig & {
  name: string;
  label: string;
  href?: string;
};

export type ImageNodeConfig = RectConfig & {
  name: string;
  src?: string;
  alt?: string;
  sticky?: StickyDefinition;
};

export type SectionTemplateId =
  | 'blank'
  | 'post'
  | 'stickyStaggeredImages'
  | 'stickyPinnedCards'
  | 'stickyMediaReveal'
  | 'stickySteps';

export type SectionTemplateSummary = {
  id: SectionTemplateId;
  name: string;
  description: string;
  category: 'basic' | 'sticky';
};
