import type {
  CodeBlockContent,
  LinkKind,
  LinkExtension,
  ListBlockContent,
  ListContent,
  ListDirection,
  OrderedListMarkerStyle,
  RichBlock,
  RichBlockStyle,
  RichCodeBlock,
  RichCodeLine,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichListItem,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
  StandaloneTextNodeSnapshot,
  TextBlockContent,
  TextDocumentBlock,
  TextDocumentBlocks,
  TextDocumentContent,
  TextNode,
  UnorderedListMarkerStyle,
} from './types';

type NormalizeTextContentOptions = {
  blockSeparator?: string;
};

type UnknownRecord = Record<string, unknown>;

const RICH_TEXT_BLOCK_TYPES = new Set<RichTextBlockType>([
  'paragraph',
  'div',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);
const RICH_LIST_BLOCK_TYPES = new Set<RichListBlock['type']>(['ul', 'ol']);
const RICH_TEXT_LINK_TYPES = new Set<LinkKind>(['external', 'page', 'anchor']);
const ORDERED_MARKER_STYLES = new Set<OrderedListMarkerStyle>([
  'decimal',
  'lower-alpha',
  'upper-alpha',
  'lower-roman',
  'upper-roman',
]);
const UNORDERED_MARKER_STYLES = new Set<UnorderedListMarkerStyle>(['disc', 'circle', 'square']);

function isObjectRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDirection(value: unknown): 'ltr' | 'rtl' | undefined {
  if (value === 'ltr' || value === 'rtl') {
    return value;
  }
  return undefined;
}

function normalizeListItemDirection(value: unknown): ListDirection | undefined {
  if (value === 'ltr' || value === 'rtl') {
    return value;
  }
  return undefined;
}

function normalizeLineHeight(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function normalizeBlockGap(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

const RICH_BLOCK_STYLE_KEYS = new Set<keyof RichBlockStyle>([
  'color',
  'background',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecorationLine',
  'textAlign',
  'filter',
  'borderStyle',
  'borderWidth',
  'borderColor',
  'borderRadius',
  'boxSizing',
  'backgroundClip',
  'boxShadow',
]);

function normalizeRichBlockStyle(value: unknown): RichBlockStyle | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const style: RichBlockStyle = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!RICH_BLOCK_STYLE_KEYS.has(key as keyof RichBlockStyle)) {
      continue;
    }
    if (typeof rawValue === 'string' || typeof rawValue === 'number') {
      (style as Record<string, string | number>)[key] = rawValue;
    }
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function normalizeStandaloneTextNodeSnapshot(value: unknown): StandaloneTextNodeSnapshot | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const subtype = value.subtype;
  if (subtype !== 'block' && subtype !== 'code' && subtype !== 'list') {
    return undefined;
  }

  if (typeof value.name !== 'string'
    || typeof value.visible !== 'boolean'
    || typeof value.locked !== 'boolean'
    || !isObjectRecord(value.rect)) {
    return undefined;
  }

  const contentBlock = normalizeRichBlock(value.contentBlock);
  if (!contentBlock) {
    return undefined;
  }

  return {
    subtype,
    name: value.name,
    visible: value.visible,
    locked: value.locked,
    rect: structuredClone(value.rect) as StandaloneTextNodeSnapshot['rect'],
    contentBlock,
    ...(isObjectRecord(value.style) ? { style: structuredClone(value.style) as StandaloneTextNodeSnapshot['style'] } : {}),
    ...(typeof value.lang === 'string' ? { lang: value.lang } : {}),
    ...(value.htmlTag === 'p'
      || value.htmlTag === 'blockquote'
      || isRichTextBlockType(value.htmlTag)
      ? { htmlTag: value.htmlTag as NonNullable<StandaloneTextNodeSnapshot['htmlTag']> }
      : {}),
    ...(isObjectRecord(value.link) ? { link: structuredClone(value.link) as StandaloneTextNodeSnapshot['link'] } : {}),
    ...(isObjectRecord(value.code) && typeof value.code.language === 'string'
      ? {
          code: {
            language: value.code.language,
            ...(value.code.theme === 'light' || value.code.theme === 'dark' ? { theme: value.code.theme } : {}),
            ...(typeof value.code.highlightedHtml === 'string' ? { highlightedHtml: value.code.highlightedHtml } : {}),
          },
        }
      : {}),
    ...(isObjectRecord(value.sticky) ? { sticky: structuredClone(value.sticky) as StandaloneTextNodeSnapshot['sticky'] } : {}),
    ...(isObjectRecord(value.animation) ? { animation: structuredClone(value.animation) as StandaloneTextNodeSnapshot['animation'] } : {}),
  };
}

function isRichTextBlockType(value: unknown): value is RichTextBlockType {
  return typeof value === 'string' && RICH_TEXT_BLOCK_TYPES.has(value as RichTextBlockType);
}

function isRichListBlockType(value: unknown): value is RichListBlock['type'] {
  return typeof value === 'string' && RICH_LIST_BLOCK_TYPES.has(value as RichListBlock['type']);
}

function normalizeLinkKind(value: unknown): LinkKind {
  return typeof value === 'string' && RICH_TEXT_LINK_TYPES.has(value as LinkKind)
    ? value as LinkKind
    : 'external';
}

function normalizeLeaf(node: unknown): RichTextLeaf | null {
  if (!isObjectRecord(node) || typeof node.text !== 'string') {
    return null;
  }

  return {
    text: node.text,
    ...(node.bold === true ? { bold: true } : {}),
    ...(node.italic === true ? { italic: true } : {}),
    ...(node.underline === true ? { underline: true } : {}),
    ...(node.strikethrough === true ? { strikethrough: true } : {}),
    ...(typeof node.color === 'string' ? { color: node.color } : {}),
    ...(typeof node.backgroundColor === 'string' ? { backgroundColor: node.backgroundColor } : {}),
    ...(typeof node.fontFamily === 'string' ? { fontFamily: node.fontFamily } : {}),
    ...(typeof node.fontSize === 'string' ? { fontSize: node.fontSize } : {}),
  };
}

export function isRichTextLeaf(node: unknown): node is RichTextLeaf {
  return normalizeLeaf(node) !== null;
}

function normalizeRichTextLink(node: unknown): RichTextLink | null {
  if (!isObjectRecord(node) || node.type !== 'link' || !Array.isArray(node.children)) {
    return null;
  }

  const children = node.children
    .map((child) => normalizeLeaf(child))
    .filter((child): child is RichTextLeaf => child !== null);

  return {
    type: 'link',
    linkType: normalizeLinkKind(node.linkType),
    children: children.length > 0 ? children : [createRichTextLeaf('')],
    ...(typeof node.href === 'string' ? { href: node.href } : {}),
    ...(typeof node.targetPageId === 'string' ? { targetPageId: node.targetPageId } : {}),
    ...(typeof node.pageAnchorId === 'string' ? { pageAnchorId: node.pageAnchorId } : {}),
    ...(typeof node.anchorTargetId === 'string' ? { anchorTargetId: node.anchorTargetId } : {}),
    ...(typeof node.openInNewTab === 'boolean' ? { openInNewTab: node.openInNewTab } : {}),
  };
}

export function isRichTextLink(node: unknown): node is RichTextLink {
  return normalizeRichTextLink(node) !== null;
}

function normalizeInlineNode(node: unknown): RichInlineNode | null {
  return normalizeRichTextLink(node) ?? normalizeLeaf(node);
}

function normalizeInlineChildren(children: unknown): RichInlineNode[] {
  if (!Array.isArray(children)) {
    return [createRichTextLeaf('')];
  }

  const normalized = children
    .map((child) => normalizeInlineNode(child))
    .filter((child): child is RichInlineNode => child !== null);

  return normalized.length > 0 ? normalized : [createRichTextLeaf('')];
}

export function createRichTextLeaf(text: string, marks?: Partial<RichTextLeaf>): RichTextLeaf {
  return {
    text,
    ...(marks?.bold ? { bold: true } : {}),
    ...(marks?.italic ? { italic: true } : {}),
    ...(marks?.underline ? { underline: true } : {}),
    ...(marks?.strikethrough ? { strikethrough: true } : {}),
    ...(typeof marks?.color === 'string' ? { color: marks.color } : {}),
    ...(typeof marks?.backgroundColor === 'string' ? { backgroundColor: marks.backgroundColor } : {}),
    ...(typeof marks?.fontFamily === 'string' ? { fontFamily: marks.fontFamily } : {}),
    ...(typeof marks?.fontSize === 'string' ? { fontSize: marks.fontSize } : {}),
  };
}

export function createRichTextBlock(
  type: RichTextBlockType,
  children: RichInlineNode[],
  options: Pick<RichTextBlock, 'direction' | 'lineHeight' | 'style' | 'standalone'> = {},
): RichTextBlock {
  return {
    type,
    ...(options.direction ? { direction: options.direction } : {}),
    ...(typeof options.lineHeight === 'number' ? { lineHeight: options.lineHeight } : {}),
    ...(options.style ? { style: options.style } : {}),
    ...(options.standalone ? { standalone: options.standalone } : {}),
    children: children.length > 0 ? children : [createRichTextLeaf('')],
  };
}

export function createRichCodeLine(text = ''): RichCodeLine {
  return {
    type: 'code-line',
    children: [createRichTextLeaf(text)],
  };
}

export function createRichCodeBlock(
  text = '',
  options: Pick<RichCodeBlock, 'direction' | 'language' | 'theme' | 'highlightedHtml' | 'style' | 'standalone'> = {},
): RichCodeBlock {
  return {
    type: 'code-block',
    ...(options.direction ? { direction: options.direction } : {}),
    ...(typeof options.language === 'string' ? { language: options.language } : {}),
    ...(options.theme === 'light' || options.theme === 'dark' ? { theme: options.theme } : {}),
    ...(typeof options.highlightedHtml === 'string' ? { highlightedHtml: options.highlightedHtml } : {}),
    ...(options.style ? { style: options.style } : {}),
    ...(options.standalone ? { standalone: options.standalone } : {}),
    children: [createRichCodeLine(text)],
  };
}

export function createRichListItem(text = ''): RichListItem {
  return {
    type: 'list-item',
    children: [createRichTextLeaf(text)],
  };
}

function createInlineLinkFromExtension(link: LinkExtension, text: string): RichTextLink {
  return {
    type: 'link',
    linkType: link.linkType,
    ...(typeof link.href === 'string' ? { href: link.href } : {}),
    ...(typeof link.targetPageId === 'string' ? { targetPageId: link.targetPageId } : {}),
    ...(typeof link.pageAnchorId === 'string' ? { pageAnchorId: link.pageAnchorId } : {}),
    ...(typeof link.anchorTargetId === 'string' ? { anchorTargetId: link.anchorTargetId } : {}),
    ...(typeof link.openInNewTab === 'boolean' ? { openInNewTab: link.openInNewTab } : {}),
    children: [createRichTextLeaf(text)],
  };
}

export function createRichListItemFromText(
  text = '',
  options: {
    direction?: ListDirection;
    link?: LinkExtension;
  } = {},
): RichListItem {
  return {
    type: 'list-item',
    ...(options.direction ? { direction: options.direction } : {}),
    children: options.link ? [createInlineLinkFromExtension(options.link, text)] : [createRichTextLeaf(text)],
  };
}

export function createRichListBlock(
  type: RichListBlock['type'],
  items: RichListItem[],
  options: Pick<RichListBlock, 'direction' | 'style' | 'standalone'> & { markerStyle?: string; start?: number } = {},
): RichListBlock {
  if (type === 'ol') {
    return {
      type: 'ol',
      ...(options.direction ? { direction: options.direction } : {}),
      ...(options.style ? { style: options.style } : {}),
      ...(options.standalone ? { standalone: options.standalone } : {}),
      ...(typeof options.start === 'number' && Number.isFinite(options.start) ? { start: Math.max(1, Math.trunc(options.start)) } : {}),
      ...(typeof options.markerStyle === 'string' && ORDERED_MARKER_STYLES.has(options.markerStyle as OrderedListMarkerStyle)
        ? { markerStyle: options.markerStyle as OrderedListMarkerStyle }
        : {}),
      children: items.length > 0 ? items : [createRichListItem('')],
    };
  }

  return {
    type: 'ul',
    ...(options.direction ? { direction: options.direction } : {}),
    ...(options.style ? { style: options.style } : {}),
    ...(options.standalone ? { standalone: options.standalone } : {}),
    ...(typeof options.markerStyle === 'string' && UNORDERED_MARKER_STYLES.has(options.markerStyle as UnorderedListMarkerStyle)
      ? { markerStyle: options.markerStyle as UnorderedListMarkerStyle }
      : {}),
    children: items.length > 0 ? items : [createRichListItem('')],
  };
}

function normalizeCodeLine(node: unknown): RichCodeLine | null {
  if (!isObjectRecord(node) || node.type !== 'code-line') {
    return null;
  }

  return {
    type: 'code-line',
    children: normalizeInlineChildren(node.children)
      .flatMap((child) => (isRichTextLink(child) ? child.children : [child]))
      .map((child) => ({ ...child })),
  };
}

function normalizeCodeLines(children: unknown): RichCodeLine[] {
  if (!Array.isArray(children)) {
    return [createRichCodeLine('')];
  }

  const normalized = children
    .map((child) => normalizeCodeLine(child))
    .filter((child): child is RichCodeLine => child !== null);

  return normalized.length > 0 ? normalized : [createRichCodeLine('')];
}

function normalizeListItem(node: unknown): RichListItem | null {
  if (!isObjectRecord(node) || node.type !== 'list-item') {
    return null;
  }

  return {
    type: 'list-item',
    ...(normalizeListItemDirection(node.direction) ? { direction: normalizeListItemDirection(node.direction) } : {}),
    children: normalizeInlineChildren(node.children),
  };
}

function normalizeListItems(children: unknown): RichListItem[] {
  if (!Array.isArray(children)) {
    return [createRichListItem('')];
  }

  const normalized = children
    .map((child) => normalizeListItem(child))
    .filter((child): child is RichListItem => child !== null);

  return normalized.length > 0 ? normalized : [createRichListItem('')];
}

export function isRichTextBlock(node: unknown): node is RichBlock {
  return isObjectRecord(node) && typeof node.type === 'string' && (
    isRichTextBlockType(node.type) ||
    node.type === 'code-block' ||
    isRichListBlockType(node.type)
  ) && Array.isArray(node.children);
}

export function isTextBlockContent(node: unknown): node is TextBlockContent {
  return isObjectRecord(node) && isRichTextBlockType(node.type) && Array.isArray(node.children);
}

export function isCodeBlockContent(node: unknown): node is CodeBlockContent {
  return isObjectRecord(node) && node.type === 'code-block' && Array.isArray(node.children);
}

export function isListBlockContent(node: unknown): node is ListBlockContent {
  return isObjectRecord(node) && isRichListBlockType(node.type) && Array.isArray(node.children);
}

export function isTextDocumentBlock(node: unknown): node is TextDocumentBlock {
  return isTextBlockContent(node) || isCodeBlockContent(node) || isListBlockContent(node);
}

export function isTextDocumentContent(value: unknown): value is TextDocumentContent {
  return isObjectRecord(value) && Array.isArray(value.blocks);
}

function normalizeRichBlock(node: unknown): RichBlock | null {
  if (!isObjectRecord(node) || typeof node.type !== 'string') {
    return null;
  }

  if (isRichTextBlockType(node.type)) {
    return createRichTextBlock(node.type, normalizeInlineChildren(node.children), {
      direction: normalizeDirection(node.direction),
      lineHeight: normalizeLineHeight(node.lineHeight),
      style: normalizeRichBlockStyle(node.style),
      standalone: normalizeStandaloneTextNodeSnapshot(node.standalone),
    });
  }

  if (node.type === 'code-block') {
    return {
      type: 'code-block',
      ...(normalizeDirection(node.direction) ? { direction: normalizeDirection(node.direction) } : {}),
      ...(typeof node.language === 'string' ? { language: node.language } : {}),
      ...(node.theme === 'light' || node.theme === 'dark' ? { theme: node.theme } : {}),
      ...(typeof node.highlightedHtml === 'string' ? { highlightedHtml: node.highlightedHtml } : {}),
      ...(normalizeRichBlockStyle(node.style) ? { style: normalizeRichBlockStyle(node.style) } : {}),
      ...(normalizeStandaloneTextNodeSnapshot(node.standalone) ? { standalone: normalizeStandaloneTextNodeSnapshot(node.standalone) } : {}),
      children: normalizeCodeLines(node.children),
    };
  }

  if (isRichListBlockType(node.type)) {
    return createRichListBlock(node.type, normalizeListItems(node.children), {
      direction: normalizeDirection(node.direction),
      style: normalizeRichBlockStyle(node.style),
      standalone: normalizeStandaloneTextNodeSnapshot(node.standalone),
      ...(node.type === 'ol' && typeof node.start === 'number' ? { start: node.start } : {}),
      ...(typeof node.markerStyle === 'string' ? { markerStyle: node.markerStyle } : {}),
    });
  }

  return null;
}

function createParagraphBlock(children: RichInlineNode[]): RichTextBlock {
  return createRichTextBlock('paragraph', children);
}

function blockText(block: RichBlock): string {
  if (block.type === 'code-block') {
    return block.children
      .map((line) => line.children.map((leaf) => leaf.text).join(''))
      .join('\n');
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return block.children
      .map((item) =>
        item.children
          .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [node.text]))
          .join(''),
      )
      .join('\n');
  }

  return block.children
    .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [node.text]))
    .join('');
}

function flattenRichInlineChildren(children: RichInlineNode[]): string {
  return children
    .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [node.text]))
    .join('');
}

/**
 * Returns the plain-text string for any content value.
 * For RichContent, concatenates all leaf text values.
 * Useful for height estimation, search, and other string-only operations.
 */
export function getTextContent(
  content: string | RichContent,
  options: NormalizeTextContentOptions = {},
): string {
  if (typeof content === 'string') return content;
  const blockSeparator = options.blockSeparator ?? '';
  return content.map((block) => blockText(block)).join(blockSeparator);
}

export function createParagraphRichText(text: string, marks?: Partial<RichTextLeaf>): RichContent {
  return [createParagraphBlock([createRichTextLeaf(text, marks)])];
}

export function listContentToRichListBlock(
  content: ListContent,
  options: Pick<RichListBlock, 'direction' | 'style'> = {},
): RichListBlock {
  if (content.type === 'ol') {
    return createRichListBlock('ol', content.items.map((item) => createRichListItemFromText(item.text, {
      direction: item.direction,
      link: item.link,
    })), {
      direction: options.direction,
      style: options.style,
      start: content.start,
      markerStyle: content.markerStyle,
    });
  }

  return createRichListBlock('ul', content.items.map((item) => createRichListItemFromText('text' in item ? item.text : `${item.term}${item.description ? `: ${item.description}` : ''}`, {
    direction: item.direction,
    link: item.link,
  })), {
    direction: options.direction,
    style: options.style,
    markerStyle: content.type === 'ul' ? content.markerStyle : undefined,
  });
}

export function createTextDocumentContent(
  blocks: TextDocumentBlocks,
  options: Pick<TextDocumentContent, 'blockGap'> = {},
): TextDocumentContent {
  return {
    blocks,
    ...(typeof options.blockGap === 'number' ? { blockGap: options.blockGap } : {}),
  };
}

export function createTextBlockContent(
  type: RichTextBlockType,
  text: string,
  options: Pick<RichTextBlock, 'direction' | 'lineHeight' | 'style' | 'standalone'> = {},
): TextBlockContent {
  return createRichTextBlock(type, [createRichTextLeaf(text)], options);
}

export function createCodeBlockContent(
  text: string,
  options: Pick<RichCodeBlock, 'direction' | 'language' | 'theme' | 'highlightedHtml' | 'style' | 'standalone'> = {},
): CodeBlockContent {
  return createRichCodeBlock(text, options);
}

export function createListBlockContent(
  type: RichListBlock['type'],
  items: RichListItem[],
  options: Pick<RichListBlock, 'direction' | 'style' | 'standalone'> & { markerStyle?: string; start?: number } = {},
): ListBlockContent {
  return createRichListBlock(type, items, options);
}

export function getTextDocumentBlockGap(content: RichContent | TextDocumentContent): number | undefined {
  return isTextDocumentContent(content) ? content.blockGap : undefined;
}

export function setTextDocumentBlockGap(
  content: TextDocumentContent,
  blockGap: number | undefined,
): TextDocumentContent {
  return {
    blocks: content.blocks,
    ...(typeof blockGap === 'number' ? { blockGap } : {}),
  };
}

export function getFirstTextDocumentBlock(content: RichContent | TextDocumentContent): TextDocumentBlock | undefined {
  return getTextDocumentBlocks(content)[0];
}

export function getSingleTextBlockContent(content: RichContent | TextDocumentContent): TextBlockContent | undefined {
  const block = getFirstTextDocumentBlock(content);
  return block && isTextBlockContent(block) ? block : undefined;
}

export function getSingleCodeBlockContent(content: RichContent | TextDocumentContent): CodeBlockContent | undefined {
  const block = getFirstTextDocumentBlock(content);
  return block && isCodeBlockContent(block) ? block : undefined;
}

export function getSingleListBlockContent(content: RichContent | TextDocumentContent): ListBlockContent | undefined {
  const block = getFirstTextDocumentBlock(content);
  return block && isListBlockContent(block) ? block : undefined;
}

export function replaceTextDocumentBlocks(content: TextDocumentContent, blocks: TextDocumentBlocks): TextDocumentContent {
  return {
    blocks,
    ...(typeof content.blockGap === 'number' ? { blockGap: content.blockGap } : {}),
  };
}

export function textBlockTypeToHtmlTag(type: RichTextBlockType): TextNode['htmlTag'] {
  if (type === 'blockquote') {
    return 'blockquote';
  }
  if (type === 'paragraph') {
    return 'p';
  }
  if (type === 'div') {
    return 'div';
  }
  return type;
}

export function htmlTagToTextBlockType(htmlTag: TextNode['htmlTag']): RichTextBlockType {
  if (htmlTag === 'blockquote') {
    return 'blockquote';
  }
  if (htmlTag && htmlTag !== 'p') {
    return htmlTag;
  }
  return 'paragraph';
}

export function createTextDocumentFromText(
  text: string,
  options: Pick<TextBlockContent, 'direction' | 'lineHeight' | 'style'> & { type?: RichTextBlockType; blockGap?: number } = {},
): TextDocumentContent {
  return createTextDocumentContent([
    createTextBlockContent(options.type ?? 'paragraph', text, {
      direction: options.direction,
      lineHeight: options.lineHeight,
      style: options.style,
    }),
  ], { blockGap: options.blockGap });
}

export function createTextDocumentFromCode(
  text: string,
  options: Pick<CodeBlockContent, 'direction' | 'language' | 'theme' | 'highlightedHtml' | 'style'> = {},
): TextDocumentContent {
  return createTextDocumentContent([
    createCodeBlockContent(text, options),
  ]);
}

export function richListBlockToListContent(block: RichListBlock): ListContent {
  if (block.type === 'ol') {
    return {
      type: 'ol',
      start: block.start,
      markerStyle: block.markerStyle,
      items: block.children.map((item) => {
        const linkNode = item.children.find((child) => isRichTextLink(child));
        return {
          text: flattenRichInlineChildren(item.children),
          direction: item.direction ?? 'ltr',
          ...(linkNode ? {
            link: {
              linkType: linkNode.linkType,
              ...(typeof linkNode.href === 'string' ? { href: linkNode.href } : {}),
              ...(typeof linkNode.targetPageId === 'string' ? { targetPageId: linkNode.targetPageId } : {}),
              ...(typeof linkNode.pageAnchorId === 'string' ? { pageAnchorId: linkNode.pageAnchorId } : {}),
              ...(typeof linkNode.anchorTargetId === 'string' ? { anchorTargetId: linkNode.anchorTargetId } : {}),
              ...(typeof linkNode.openInNewTab === 'boolean' ? { openInNewTab: linkNode.openInNewTab } : {}),
            },
          } : {}),
        };
      }),
    };
  }

  return {
    type: 'ul',
    markerStyle: block.markerStyle,
    items: block.children.map((item) => {
      const linkNode = item.children.find((child) => isRichTextLink(child));
      return {
        text: flattenRichInlineChildren(item.children),
        direction: item.direction ?? 'ltr',
        ...(linkNode ? {
          link: {
            linkType: linkNode.linkType,
            ...(typeof linkNode.href === 'string' ? { href: linkNode.href } : {}),
            ...(typeof linkNode.targetPageId === 'string' ? { targetPageId: linkNode.targetPageId } : {}),
            ...(typeof linkNode.pageAnchorId === 'string' ? { pageAnchorId: linkNode.pageAnchorId } : {}),
            ...(typeof linkNode.anchorTargetId === 'string' ? { anchorTargetId: linkNode.anchorTargetId } : {}),
            ...(typeof linkNode.openInNewTab === 'boolean' ? { openInNewTab: linkNode.openInNewTab } : {}),
          },
        } : {}),
      };
    }),
  };
}

export function normalizeRichContent(content: unknown): RichContent {
  if (!Array.isArray(content)) {
    return [];
  }

  const blocks: RichContent = [];
  let inlineBuffer: RichInlineNode[] = [];

  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) {
      return;
    }
    blocks.push(createParagraphBlock(inlineBuffer));
    inlineBuffer = [];
  };

  for (const node of content) {
    const block = normalizeRichBlock(node);
    if (block) {
      flushInlineBuffer();
      blocks.push(block);
      continue;
    }

    const inlineNode = normalizeInlineNode(node);
    if (inlineNode) {
      inlineBuffer.push(inlineNode);
    }
  }

  flushInlineBuffer();
  return blocks;
}

export function normalizeTextDocumentContent(content: unknown): TextDocumentContent {
  if (isTextDocumentContent(content)) {
    const blockGap = normalizeBlockGap(content.blockGap);
    return {
      blocks: normalizeRichContent(content.blocks),
      ...(blockGap !== undefined ? { blockGap } : {}),
    };
  }

  return {
    blocks: normalizeRichContent(content),
  };
}

export function validateRichContentStructure(content: unknown): string[] {
  if (!Array.isArray(content)) {
    return ['Rich content root must be an array of blocks.'];
  }

  const errors: string[] = [];

  content.forEach((block, blockIndex) => {
    if (!isObjectRecord(block)) {
      errors.push(`Rich content root item ${blockIndex} must be a block.`);
      return;
    }

    if (isRichTextBlockType(block.type)) {
      if (!Array.isArray(block.children)) {
        errors.push(`Rich text block ${blockIndex} must define a children array.`);
        return;
      }

      if (block.direction !== undefined && block.direction !== 'ltr' && block.direction !== 'rtl') {
        errors.push(`Rich text block ${blockIndex} direction must be ltr or rtl.`);
      }

      if (block.lineHeight !== undefined && (typeof block.lineHeight !== 'number' || !Number.isFinite(block.lineHeight) || block.lineHeight <= 0)) {
        errors.push(`Rich text block ${blockIndex} lineHeight must be a positive number.`);
      }

      block.children.forEach((child, childIndex) => {
        if (isObjectRecord(child) && child.type === 'link') {
          if (!Array.isArray(child.children)) {
            errors.push(`Rich link ${blockIndex}.${childIndex} must define leaf children.`);
            return;
          }
          child.children.forEach((linkChild, linkChildIndex) => {
            if (!isRichTextLeaf(linkChild)) {
              errors.push(`Rich link ${blockIndex}.${childIndex} child ${linkChildIndex} must be a text leaf.`);
            }
          });
          return;
        }

        if (!isRichTextLeaf(child)) {
          errors.push(`Rich text block ${blockIndex} child ${childIndex} must be a text leaf or link.`);
        }
      });
      return;
    }

    if (block.type === 'code-block') {
      if (!Array.isArray(block.children)) {
        errors.push(`Rich code block ${blockIndex} must define a code-line children array.`);
        return;
      }

      if (block.direction !== undefined && block.direction !== 'ltr' && block.direction !== 'rtl') {
        errors.push(`Rich code block ${blockIndex} direction must be ltr or rtl.`);
      }

      block.children.forEach((child, childIndex) => {
        if (!isObjectRecord(child) || child.type !== 'code-line' || !Array.isArray(child.children)) {
          errors.push(`Rich code block ${blockIndex} child ${childIndex} must be a code-line element.`);
          return;
        }

        child.children.forEach((lineChild, lineChildIndex) => {
          if (!isRichTextLeaf(lineChild)) {
            errors.push(`Rich code line ${blockIndex}.${childIndex} child ${lineChildIndex} must be a text leaf.`);
          }
        });
      });
      return;
    }

    if (block.type === 'ul' || block.type === 'ol') {
      if (!Array.isArray(block.children)) {
        errors.push(`Rich list block ${blockIndex} must define list-item children.`);
        return;
      }

      if (block.direction !== undefined && block.direction !== 'ltr' && block.direction !== 'rtl') {
        errors.push(`Rich list block ${blockIndex} direction must be ltr or rtl.`);
      }

      if (block.type === 'ol' && block.start !== undefined && (typeof block.start !== 'number' || !Number.isFinite(block.start) || block.start < 1)) {
        errors.push(`Rich ordered list block ${blockIndex} start must be a positive number.`);
      }

      block.children.forEach((child, childIndex) => {
        if (!isObjectRecord(child) || child.type !== 'list-item' || !Array.isArray(child.children)) {
          errors.push(`Rich list block ${blockIndex} child ${childIndex} must be a list-item element.`);
          return;
        }

        child.children.forEach((itemChild, itemChildIndex) => {
          if (isObjectRecord(itemChild) && itemChild.type === 'link') {
            if (!Array.isArray(itemChild.children)) {
              errors.push(`Rich list item link ${blockIndex}.${childIndex}.${itemChildIndex} must define leaf children.`);
              return;
            }
            itemChild.children.forEach((linkChild, linkChildIndex) => {
              if (!isRichTextLeaf(linkChild)) {
                errors.push(`Rich list item link ${blockIndex}.${childIndex}.${itemChildIndex}.${linkChildIndex} must be a text leaf.`);
              }
            });
            return;
          }

          if (!isRichTextLeaf(itemChild)) {
            errors.push(`Rich list item ${blockIndex}.${childIndex} child ${itemChildIndex} must be a text leaf or link.`);
          }
        });
      });
      return;
    }

    errors.push(`Rich content root item ${blockIndex} must be a supported block.`);
  });

  return errors;
}

export function validateTextDocumentContentStructure(content: unknown): string[] {
  if (isTextDocumentContent(content)) {
    const errors = validateRichContentStructure(content.blocks);
    if (content.blockGap !== undefined && normalizeBlockGap(content.blockGap) === undefined) {
      errors.push('Text document blockGap must be a non-negative number.');
    }
    return errors;
  }

  return validateRichContentStructure(content);
}

export function validateTextSubtypeContentStructure(
  subtype: 'block' | 'rich' | 'code' | 'list',
  content: TextDocumentContent,
): string[] {
  const errors = validateTextDocumentContentStructure(content);
  const blockCount = content.blocks.length;

  if (subtype !== 'rich' && content.blockGap !== undefined) {
    errors.push(`Text subtype "${subtype}" cannot define blockGap.`);
  }

  if (subtype === 'block') {
    if (blockCount !== 1 || !isTextBlockContent(content.blocks[0])) {
      errors.push('Block subtype content must contain exactly one text block.');
    }
    return errors;
  }

  if (subtype === 'code') {
    if (blockCount !== 1 || !isCodeBlockContent(content.blocks[0])) {
      errors.push('Code subtype content must contain exactly one code block.');
    }
    return errors;
  }

  if (subtype === 'list') {
    if (blockCount !== 1 || !isListBlockContent(content.blocks[0])) {
      errors.push('List subtype content must contain exactly one list block.');
    }
    return errors;
  }

  if (blockCount === 0) {
    errors.push('Rich subtype content must contain at least one block.');
  }

  return errors;
}

export function getTextDocumentBlocks(content: RichContent | TextDocumentContent): TextDocumentBlocks {
  return isTextDocumentContent(content) ? content.blocks : content;
}

/**
 * Returns true if every leaf in the content has an empty text string.
 */
export function isEmpty(content: RichContent): boolean {
  return content.every((block) => blockText(block) === '');
}

/**
 * Calls visitor for every RichTextLink in the content (does not descend into link children).
 */
export function walkLinks(content: RichContent, visitor: (link: RichTextLink) => void): void {
  for (const block of content) {
    if (block.type === 'code-block') {
      continue;
    }

    const nodes = block.type === 'ul' || block.type === 'ol'
      ? block.children.flatMap((item) => item.children)
      : block.children;

    for (const node of nodes) {
      if (isRichTextLink(node)) {
        visitor(node);
      }
    }
  }
}

/**
 * Returns a new RichContent array with each RichTextLink replaced by the result of mapper.
 * Returns the original array reference if no links are present or mapper returns the same object.
 */
export function mapLinks(
  content: RichContent,
  mapper: (link: RichTextLink) => RichTextLink,
): RichContent {
  let changed = false;

  const next = content.map((block) => {
    if (block.type === 'code-block') {
      return block;
    }

    if (block.type === 'ul' || block.type === 'ol') {
      let blockChanged = false;
      const children = block.children.map((item) => {
        let itemChanged = false;
        const mappedChildren = item.children.map((node) => {
          if (!isRichTextLink(node)) {
            return node;
          }
          const mapped = mapper(node);
          if (mapped !== node) {
            itemChanged = true;
          }
          return mapped;
        });

        if (!itemChanged) {
          return item;
        }

        blockChanged = true;
        changed = true;
        return { ...item, children: mappedChildren };
      });

      return blockChanged ? { ...block, children } : block;
    }

    let blockChanged = false;
    const children = block.children.map((node) => {
      if (!isRichTextLink(node)) {
        return node;
      }
      const mapped = mapper(node);
      if (mapped !== node) {
        blockChanged = true;
        changed = true;
      }
      return mapped;
    });

    return blockChanged ? { ...block, children } : block;
  });

  return changed ? next : content;
}
