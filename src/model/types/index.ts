import type { AnimationDefinition, DocumentAnimationSettings } from '../../animations/types';
import type { DocumentPage, PageId, SiteSettings } from './site';

export type { DocumentPage, PageId, SiteSettings };

export type NodeId = string;

// ---------------------------------------------------------------------------
// Content-type discriminators (new model)
// ---------------------------------------------------------------------------
export type ContainerSubtype = 'section' | 'header' | 'footer' | 'container' | 'group';
export type TextSubtype = 'block' | 'rich' | 'code' | 'list';
export type MediaSubtype = 'image' | 'video' | 'svg' | 'embed';
export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// ---------------------------------------------------------------------------
// Shared scalar types
// ---------------------------------------------------------------------------
export type LinkKind = 'anchor' | 'external' | 'page';
export type BreakpointId = 'base' | 'tablet' | 'mobile';
export type Unit = 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax';
export type FontSizeUnit = 'px' | 'em' | 'rem';
export type SpacingUnit = 'px' | 'em' | 'rem';
export type NodeTextField =
  | 'name'
  | 'content'
  | 'htmlTag'
  | 'lang'
  | 'label'
  | 'linkEnabled'
  | 'linkType'
  | 'anchorTargetId'
  | 'href'
  | 'openInNewTab'
  | 'src'
  | 'alt'
  | 'targetPageId'
  | 'pageAnchorId'
  | 'codeLanguage'
  | 'codeTheme';
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
  | 'backgroundColor'
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
export type EditorTextField = NodeTextField | TextStyleField | LinkStyleField | ImageStyleField | ButtonStyleField | 'blockGap';
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

// ---------------------------------------------------------------------------
// Rich text content types (used by TextNode with subtype 'rich')
// ---------------------------------------------------------------------------
import type { Text as SlateText, Element as SlateElement } from 'slate';

export interface RichTextLeaf extends SlateText {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
}

export interface RichTextLink extends SlateElement {
  type: 'link';
  children: RichTextLeaf[];
  linkType: 'external' | 'page' | 'anchor';
  href?: string;
  targetPageId?: PageId;
  pageAnchorId?: NodeId;
  anchorTargetId?: NodeId;
  openInNewTab?: boolean;
}

export type RichTextBlockType = 'paragraph' | 'div' | 'blockquote' | HeadingTag;
export type RichInlineNode = RichTextLeaf | RichTextLink;
export type RichBlockStyle = {
  color?: string;
  background?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textAlign?: 'left' | 'center' | 'right';
  filter?: string;
  borderStyle?: 'solid';
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  boxSizing?: 'border-box';
  backgroundClip?: 'padding-box';
  boxShadow?: string;
};

export type StandaloneTextNodeSnapshot = {
  subtype: 'block' | 'code' | 'list';
  name: string;
  visible: boolean;
  locked: boolean;
  rect: RectModel;
  contentBlock: TextDocumentBlock;
  style?: TextNode['style'];
  lang?: string;
  htmlTag?: HeadingTag | 'p' | 'blockquote' | 'div';
  link?: LinkExtension;
  code?: { language: string; theme?: 'light' | 'dark'; highlightedHtml?: string };
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
};

export interface RichTextBlock extends SlateElement {
  type: RichTextBlockType;
  direction?: 'ltr' | 'rtl';
  lineHeight?: number;
  style?: RichBlockStyle;
  standalone?: StandaloneTextNodeSnapshot;
  children: RichInlineNode[];
}

export interface RichCodeLine extends SlateElement {
  type: 'code-line';
  children: RichTextLeaf[];
}

export interface RichCodeBlock extends SlateElement {
  type: 'code-block';
  direction?: 'ltr' | 'rtl';
  language?: string;
  theme?: 'light' | 'dark';
  highlightedHtml?: string;
  style?: RichBlockStyle;
  standalone?: StandaloneTextNodeSnapshot;
  children: RichCodeLine[];
}

export interface RichListItem extends SlateElement {
  type: 'list-item';
  direction?: 'ltr' | 'rtl';
  depth?: number;
  children: RichInlineNode[];
}

export interface RichUnorderedListBlock extends SlateElement {
  type: 'ul';
  direction?: 'ltr' | 'rtl';
  markerStyle?: UnorderedListMarkerStyle;
  style?: RichBlockStyle;
  standalone?: StandaloneTextNodeSnapshot;
  children: RichListItem[];
}

export interface RichOrderedListBlock extends SlateElement {
  type: 'ol';
  direction?: 'ltr' | 'rtl';
  start?: number;
  markerStyle?: OrderedListMarkerStyle;
  style?: RichBlockStyle;
  standalone?: StandaloneTextNodeSnapshot;
  children: RichListItem[];
}

export type RichListBlock = RichUnorderedListBlock | RichOrderedListBlock;
export type RichBlock = RichTextBlock | RichCodeBlock | RichListBlock;
export type TextBlockContent = RichTextBlock;
export type CodeBlockContent = RichCodeBlock;
export type ListBlockContent = RichListBlock;
export type TextDocumentBlock = TextBlockContent | CodeBlockContent | ListBlockContent;
export type TextDocumentBlocks = TextDocumentBlock[];
export type TextDocumentContent = {
  blocks: TextDocumentBlocks;
  blockGap?: number;
};

/**
 * Legacy array-form rich content. Phase 1.7 introduces TextDocumentContent as the canonical
 * text-document wrapper, while later quanta migrate runtime persistence to use it directly.
 */
export type RichContent = TextDocumentBlocks;

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Style types
// ---------------------------------------------------------------------------
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

export type BackgroundStyle = {
  background?: string;
};

export type PaddingStyle = {
  paddingTop?: ParsedValue<SpacingValue>;
  paddingRight?: ParsedValue<SpacingValue>;
  paddingBottom?: ParsedValue<SpacingValue>;
  paddingLeft?: ParsedValue<SpacingValue>;
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

// ---------------------------------------------------------------------------
// Link extension — shared by MediaNode and TextNode
// ---------------------------------------------------------------------------
export type LinkExtension = {
  linkType: 'external' | 'page' | 'anchor';
  href?: string;
  openInNewTab?: boolean;
  targetPageId?: PageId;
  pageAnchorId?: NodeId;
  anchorTargetId?: NodeId;
};

export type ListDirection = 'ltr' | 'rtl';
export type UnorderedListMarkerStyle = 'disc' | 'circle' | 'square';
export type OrderedListMarkerStyle = 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';
export type ListContentType = 'ul' | 'ol' | 'dl';

export type ListTextItem = {
  text: string;
  direction?: ListDirection;
  depth?: number;
  link?: LinkExtension;
};

export type DescriptionListItem = {
  term: string;
  description: string;
  direction?: ListDirection;
  link?: LinkExtension;
};

export type UnorderedListContent = {
  type: 'ul';
  markerStyle?: UnorderedListMarkerStyle;
  items: ListTextItem[];
};

export type OrderedListContent = {
  type: 'ol';
  start?: number;
  markerStyle?: OrderedListMarkerStyle;
  items: ListTextItem[];
};

export type DescriptionListContent = {
  type: 'dl';
  items: DescriptionListItem[];
};

export type ListContent = UnorderedListContent | OrderedListContent | DescriptionListContent;

// ---------------------------------------------------------------------------
// TopLevelWrapperVisibilityState — defined here to avoid a circular import
// (topLevelWrapperVisibility.ts imports from this file).
// The canonical export lives here; topLevelWrapperVisibility.ts references it.
// ---------------------------------------------------------------------------
export type TopLevelWrapperVisibilityMode =
  | 'hidden'
  | 'currentPage'
  | 'allPages'
  | 'customPages';

export type TopLevelWrapperVisibilityState = {
  mode: TopLevelWrapperVisibilityMode;
  pageIds: PageId[];
};

// ---------------------------------------------------------------------------
// Base node
// ---------------------------------------------------------------------------
export type BaseNode = {
  id: NodeId;
  parentId: NodeId | null;
  children: NodeId[];
  name: string;
  visible: boolean;
  locked: boolean;
};

// ---------------------------------------------------------------------------
// Site node (unchanged, only `type` field kept for backward compat during migration)
// ---------------------------------------------------------------------------
export type SiteNode = BaseNode & {
  contentType: 'site';
  /** @deprecated internal compat shim — will be removed after Phase 2 rename */
  type: 'site';
  stickyElevation?: boolean; // undefined/true = all stickies elevated (default); false = per-sticky control
};

// ---------------------------------------------------------------------------
// Container family
// ---------------------------------------------------------------------------
export type ContainerNode = BaseNode & {
  contentType: 'container';
  subtype: ContainerSubtype;
  children: NodeId[];
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  pageTargetIds?: PageId[];
  topLevelWrapperVisibility?: TopLevelWrapperVisibilityState;
  style?: BorderStyle & ShadowStyle & {
    background?: string;
    /** Section-only decorative bottom border color */
    sectionBorderBottomColor?: string;
    /** Section-only decorative bottom border width */
    sectionBorderBottomWidth?: ParsedValue<UnitValue>;
    paddingTop?: ParsedValue<SpacingValue>;
    paddingRight?: ParsedValue<SpacingValue>;
    paddingBottom?: ParsedValue<SpacingValue>;
    paddingLeft?: ParsedValue<SpacingValue>;
  };
};

// ---------------------------------------------------------------------------
// Text family
// ---------------------------------------------------------------------------
export type TextNode = BaseNode & {
  contentType: 'text';
  subtype: TextSubtype;
  content: TextDocumentContent;
  lang?: string;              // BCP-47 locale
  /** @deprecated transitional field during phase 1.7 migration; canonical block type lives in content */
  htmlTag?: HeadingTag | 'p' | 'blockquote' | 'div';
  link?: LinkExtension;       // block only
  /** @deprecated transitional field during phase 1.7 migration; canonical code metadata lives in content */
  code?: { language: string; theme?: 'light' | 'dark'; highlightedHtml?: string };
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: ShadowStyle & TypographyStyle & {
    textWrap?: TextWrapMode;
    background?: string;
    paddingBlock?: ParsedValue<SpacingValue>;
    paddingInline?: ParsedValue<SpacingValue>;
  } & BorderStyle;
};

// ---------------------------------------------------------------------------
// Media family
// ---------------------------------------------------------------------------
export type MediaNode = BaseNode & {
  contentType: 'media';
  subtype: MediaSubtype;
  src?: string;
  alt?: string;
  link?: LinkExtension;
  video?: { autoplay?: boolean; loop?: boolean; muted?: boolean };
  svg?: { renderMode: 'img' | 'inline' };
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: BorderStyle & ShadowStyle;
};

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------

/** Leaf nodes (non-container, non-site) */
export type LeafNode = MediaNode | TextNode;

export type DocumentNode = SiteNode | ContainerNode | MediaNode | TextNode;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isSiteNode(node: DocumentNode): node is SiteNode {
  return node.contentType === 'site';
}

export function isContainerNode(node: DocumentNode): node is ContainerNode {
  return node.contentType === 'container';
}

export function isTextNode(node: DocumentNode): node is TextNode {
  return node.contentType === 'text';
}

export function isMediaNode(node: DocumentNode): node is MediaNode {
  return node.contentType === 'media';
}

export function isLeafNode(node: DocumentNode): node is LeafNode {
  return node.contentType === 'text' || node.contentType === 'media';
}

// ---------------------------------------------------------------------------
// Document model
// ---------------------------------------------------------------------------
export type DocumentModel = {
  schemaVersion?: string;
  rootId: NodeId;
  nodes: Record<NodeId, DocumentNode>;
  fontLibrary: FontLibrary;
  animationSettings?: DocumentAnimationSettings;
  pages?: DocumentPage[];
  siteSettings?: SiteSettings;
  sharedRegionIds?: NodeId[];
};

// ---------------------------------------------------------------------------
// Computed sticky types
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Template / config helper types
// ---------------------------------------------------------------------------

/**
 * A TemplateBuild pairs a root ContainerNode with all its descendant nodes.
 * (Replaces the old WrapperNode-based TemplateBuild.)
 */
export type TemplateBuild = {
  wrapper: ContainerNode;
  nodes: Record<NodeId, DocumentNode>;
};

export type BoxPadding = {
  top: string;
  right: string;
  bottom: string;
  left?: string;
};

export type TemplateNode = DocumentNode | ContainerNode;

export type TextStyleOptions = {
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  lineHeight?: number;
  htmlTag?: HeadingTag | 'p' | 'blockquote';
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
