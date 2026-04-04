import type { AnimationDefinition, DocumentAnimationSettings } from '../../animations/types';
import type { DocumentPage, PageId, SiteSettings } from './site';

export type { DocumentPage, PageId, SiteSettings };

export type NodeId = string;

export type NodeType = 'site' | 'wrapper' | 'leaf';
export type WrapperRole = 'section' | 'header' | 'footer' | 'container';
export type LeafRole = 'text' | 'image' | 'link' | 'button';
export type LinkKind = 'anchor' | 'external' | 'page';
export type BreakpointId = 'base' | 'tablet' | 'mobile';
export type Unit = 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax';
export type FontSizeUnit = 'px' | 'em' | 'rem';
export type SpacingUnit = 'px' | 'em' | 'rem';
export type NodeTextField =
  | 'name'
  | 'content'
  | 'htmlTag'
  | 'label'
  | 'linkType'
  | 'anchorTargetId'
  | 'href'
  | 'openInNewTab'
  | 'src'
  | 'alt';
export type BorderColorField =
  | 'borderColor'
  | 'borderTopColor'
  | 'borderRightColor'
  | 'borderBottomColor'
  | 'borderLeftColor';
export type BorderWidthField =
  | 'borderWidth'
  | 'borderTopWidth'
  | 'borderRightWidth'
  | 'borderBottomWidth'
  | 'borderLeftWidth';
export type BorderRadiusField =
  | 'borderRadius'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderBottomRightRadius'
  | 'borderBottomLeftRadius';
export type ShadowStyleField =
  | 'shadowColor'
  | 'shadowBlur'
  | 'shadowSpread'
  | 'shadowOffsetX'
  | 'shadowOffsetY';
export type LeafTypographyField =
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecorationLine'
  | 'lineHeight'
  | 'direction'
  | 'textAlign';
export type TextWrapField = 'textWrap';
export type TextStyleField =
  | LeafTypographyField
  | ShadowStyleField;
export type LinkStyleField = LeafTypographyField | TextWrapField | ShadowStyleField;
export type ImageStyleField = BorderColorField | BorderWidthField | BorderRadiusField | ShadowStyleField;
export type ButtonStyleField =
  | LeafTypographyField
  | 'background'
  | 'paddingBlock'
  | 'paddingInline'
  | TextWrapField
  | BorderColorField
  | BorderWidthField
  | BorderRadiusField
  | ShadowStyleField;
export type EditorTextField = NodeTextField | TextStyleField | LinkStyleField | ImageStyleField | ButtonStyleField;
export type WrapperStyleField =
  | 'background'
  | BorderColorField
  | BorderWidthField
  | BorderRadiusField
  | ShadowStyleField
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'sectionBorderBottomColor'
  | 'sectionBorderBottomWidth';

export type UnitValue = {
  value: number;
  unit: Unit;
};

export type FontSizeValue = {
  value: number;
  unit: FontSizeUnit;
};

export type SpacingValue = {
  value: number;
  unit: SpacingUnit;
};

export type ViewportMeasurement = {
  width: number;
  height: number;
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

export type BorderStyle = {
  borderColor?: string;
  borderTopColor?: string;
  borderRightColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  borderWidth?: ParsedValue<UnitValue>;
  borderTopWidth?: ParsedValue<UnitValue>;
  borderRightWidth?: ParsedValue<UnitValue>;
  borderBottomWidth?: ParsedValue<UnitValue>;
  borderLeftWidth?: ParsedValue<UnitValue>;
  borderRadius?: ParsedValue<UnitValue>;
  borderTopLeftRadius?: ParsedValue<UnitValue>;
  borderTopRightRadius?: ParsedValue<UnitValue>;
  borderBottomRightRadius?: ParsedValue<UnitValue>;
  borderBottomLeftRadius?: ParsedValue<UnitValue>;
};

export type ShadowStyle = {
  shadowColor?: string;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

export type FontSource = 'google-fonts';
export type DocumentFontOrigin = 'default' | 'added';

export type FontAxis = {
  tag: string;
  min: number;
  max: number;
};

export type DocumentFontFamily = {
  family: string;
  category: string;
  subsets: string[];
  variants: string[];
  axes?: FontAxis[];
  isVariable: boolean;
  source: FontSource;
  lastModified?: string;
  popularityRank?: number;
  favorite: boolean;
  origin: DocumentFontOrigin;
};

export type FontLibrary = {
  defaults: string[];
  favorites: string[];
  usedFamilies: DocumentFontFamily[];
};

export type TypographyStyle = {
  color?: string;
  fontFamily?: string;
  fontSize?: ParsedValue<FontSizeValue>;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  lineHeight?: number;
  direction?: 'ltr' | 'rtl';
  textAlign?: 'left' | 'center' | 'right';
};

export type TextWrapMode = 'single-line' | 'wrap';

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
  elevated?: boolean; // only meaningful when siteNode.stickyElevation === false
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
  stickyElevation?: boolean; // undefined/true = all stickies elevated (default); false = per-sticky control
};

export type WrapperNode = BaseNode & {
  type: 'wrapper';
  role: WrapperRole;
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style: BorderStyle &
    ShadowStyle & {
    background?: string;
    sectionBorderBottomColor?: string;
    sectionBorderBottomWidth?: ParsedValue<UnitValue>;
    paddingTop?: ParsedValue<SpacingValue>;
    paddingRight?: ParsedValue<SpacingValue>;
    paddingBottom?: ParsedValue<SpacingValue>;
    paddingLeft?: ParsedValue<SpacingValue>;
  };
};

export type TextLeaf = BaseNode & {
  type: 'leaf';
  role: 'text';
  rect: RectModel;
  content: string;
  htmlTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'blockquote' | 'div';
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: ShadowStyle & TypographyStyle;
};

export type ImageLeaf = BaseNode & {
  type: 'leaf';
  role: 'image';
  rect: RectModel;
  src?: string;
  alt?: string;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: BorderStyle & ShadowStyle;
};

export type LinkLeaf = BaseNode & {
  type: 'leaf';
  role: 'link';
  rect: RectModel;
  label: string;
  linkType?: LinkKind;
  anchorTargetId?: NodeId;
  href?: string;
  openInNewTab?: boolean;
  targetPageId?: PageId;
  pageAnchorId?: NodeId;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: TypographyStyle &
    ShadowStyle & {
      textWrap?: TextWrapMode;
    };
};

export type ButtonLeaf = BaseNode & {
  type: 'leaf';
  role: 'button';
  rect: RectModel;
  label: string;
  linkType?: LinkKind;
  anchorTargetId?: NodeId;
  href?: string;
  openInNewTab?: boolean;
  targetPageId?: PageId;
  pageAnchorId?: NodeId;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: TypographyStyle &
    BorderStyle &
    ShadowStyle & {
      background?: string;
      textWrap?: TextWrapMode;
      paddingBlock?: ParsedValue<SpacingValue>;
      paddingInline?: ParsedValue<SpacingValue>;
    };
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
  fontLibrary: FontLibrary;
  animationSettings?: DocumentAnimationSettings;
  pages?: DocumentPage[];
  siteSettings?: SiteSettings;
  sharedRegionIds?: NodeId[];
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
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
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
  linkType?: LinkKind;
  anchorTargetId?: NodeId;
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
