export type NodeId = string;

export type NodeType = 'site' | 'wrapper' | 'leaf';
export type WrapperRole = 'section' | 'header' | 'footer' | 'container';
export type LeafRole = 'text' | 'image' | 'link' | 'button';
export type BreakpointId = 'base' | 'tablet' | 'mobile';
export type Unit = 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax';
export type FontSizeUnit = 'px' | 'em' | 'rem';
export type NodeTextField = 'name' | 'content' | 'htmlTag' | 'label' | 'href' | 'src' | 'alt';
export type TextStyleField =
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecorationLine'
  | 'lineHeight'
  | 'direction'
  | 'textAlign';
export type EditorTextField = NodeTextField | TextStyleField;

export type UnitValue = {
  value: number;
  unit: Unit;
};

export type FontSizeValue = {
  value: number;
  unit: FontSizeUnit;
};

export type WidthValue = UnitValue | { keyword: 'fit-content' | 'min-content' | 'max-content' };

export type HeightValue =
  | UnitValue
  | { keyword: 'auto' }
  | { keyword: 'aspect-ratio'; ratio: number };

export type ParsedValue<T> = {
  raw: string;
  parsed: T;
};

export type ResponsiveValue<T> = {
  base: T;
  tablet?: T;
  mobile?: T;
};

export type RectModel = {
  x: ResponsiveValue<ParsedValue<UnitValue>>;
  y: ResponsiveValue<ParsedValue<UnitValue>>;
  width: ResponsiveValue<ParsedValue<WidthValue>>;
  height: ResponsiveValue<ParsedValue<HeightValue>>;
};

export type StickyEdges = {
  top?: boolean;
  bottom?: boolean;
};

export type StickyTarget = 'self' | 'contentWrapper';

export type StickyDefinition = {
  enabled: boolean;
  target: StickyTarget;
  edges: StickyEdges;
  offsetTop?: ParsedValue<UnitValue>;
  offsetBottom?: ParsedValue<UnitValue>;
  durationMode?: 'auto' | 'custom';
  duration: ParsedValue<UnitValue>;
  durationTop?: ParsedValue<UnitValue>;
  durationBottom?: ParsedValue<UnitValue>;
};

export type BaseNode = {
  id: NodeId;
  type: NodeType;
  parentId: NodeId | null;
  children: NodeId[];
  name: string;
  visible: boolean;
  locked: boolean;
};

export type SiteNode = BaseNode & {
  type: 'site';
};

export type WrapperNode = BaseNode & {
  type: 'wrapper';
  role: WrapperRole;
  rect: RectModel;
  sticky?: StickyDefinition;
  style: {
    background?: string;
    borderColor?: string;
    borderWidth?: ParsedValue<UnitValue>;
    paddingTop?: ParsedValue<UnitValue>;
    paddingRight?: ParsedValue<UnitValue>;
    paddingBottom?: ParsedValue<UnitValue>;
    paddingLeft?: ParsedValue<UnitValue>;
  };
};

export type TextLeaf = BaseNode & {
  type: 'leaf';
  role: 'text';
  rect: RectModel;
  content: string;
  htmlTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'blockquote' | 'div';
  sticky?: StickyDefinition;
  style?: {
    color?: string;
    fontSize?: ParsedValue<FontSizeValue>;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    lineHeight?: number;
    direction?: 'ltr' | 'rtl';
    textAlign?: 'left' | 'center' | 'right';
  };
};

export type ImageLeaf = BaseNode & {
  type: 'leaf';
  role: 'image';
  rect: RectModel;
  src?: string;
  alt?: string;
  sticky?: StickyDefinition;
};

export type LinkLeaf = BaseNode & {
  type: 'leaf';
  role: 'link';
  rect: RectModel;
  label: string;
  href?: string;
  sticky?: StickyDefinition;
};

export type ButtonLeaf = BaseNode & {
  type: 'leaf';
  role: 'button';
  rect: RectModel;
  label: string;
  sticky?: StickyDefinition;
};

export type DocumentNode =
  | SiteNode
  | WrapperNode
  | TextLeaf
  | ImageLeaf
  | LinkLeaf
  | ButtonLeaf;

export type DocumentModel = {
  rootId: NodeId;
  nodes: Record<NodeId, DocumentNode>;
};

export type ComputedStickyRegistration = {
  ownerId: NodeId;
  parentWrapperId: NodeId;
  target: StickyTarget;
  edges: StickyEdges;
  startPx: number;
  endPx: number;
  durationPx: number;
  topDurationPx?: number;
  bottomDurationPx?: number;
  extentPx: number;
};

export type ComputedWrapperStickyState = {
  wrapperId: NodeId;
  totalExtraExtentPx: number;
  registrations: ComputedStickyRegistration[];
};

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
