import type {
  CodeBlockContent,
  LinkExtension,
  ListBlockContent,
  ListDirection,
  OrderedListMarkerStyle,
  RichCodeBlock,
  RichCodeLine,
  RichInlineNode,
  RichListBlock,
  RichListItem,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  TextBlockContent,
  TextDocumentBlocks,
  TextDocumentContent,
  UnorderedListMarkerStyle,
} from '../types';
import { ORDERED_MARKER_STYLES, UNORDERED_MARKER_STYLES } from './shared';

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
    ...(typeof marks?.fontWeight === 'number' && Number.isFinite(marks.fontWeight) ? { fontWeight: marks.fontWeight } : {}),
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

function createInlineLinkFromExtension(link: LinkExtension, text: string) {
  return {
    type: 'link' as const,
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

export function createParagraphBlock(children: RichInlineNode[]): RichTextBlock {
  return createRichTextBlock('paragraph', children);
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
