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
  RichTableBlock,
  RichTableCell,
  RichTableRow,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  TableBlockContent,
  TableColumnAlignment,
  TextBlockContent,
  TextDocumentBlocks,
  TextDocumentContent,
  UnorderedListMarkerStyle,
} from '../types';
import { normalizeCodeTheme, normalizeListItemDepth, ORDERED_MARKER_STYLES, UNORDERED_MARKER_STYLES } from './shared';

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
    ...(options.theme ? { theme: normalizeCodeTheme(options.theme) } : {}),
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
    depth?: number;
    link?: LinkExtension;
  } = {},
): RichListItem {
  return {
    type: 'list-item',
    ...(options.direction ? { direction: options.direction } : {}),
    ...(normalizeListItemDepth(options.depth) ? { depth: normalizeListItemDepth(options.depth) } : {}),
    children: options.link ? [createInlineLinkFromExtension(options.link, text)] : [createRichTextLeaf(text)],
  };
}

function normalizeRichListItems(items: RichListItem[]): RichListItem[] {
  const source = items.length > 0 ? items : [createRichListItem('')];
  let previousDepth = 0;
  return source.map((item) => {
    const depth = normalizeListItemDepth(item.depth, previousDepth);
    previousDepth = depth ?? 0;
    return {
      ...item,
      ...(depth ? { depth } : {}),
      ...(!depth && item.depth !== undefined ? { depth: undefined } : {}),
    };
  }).map((item) => {
    if (item.depth === undefined) {
      const { depth: _depth, ...rest } = item;
      return rest;
    }
    return item;
  });
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
      children: normalizeRichListItems(items),
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
    children: normalizeRichListItems(items),
  };
}

function normalizeTableAlignment(value: unknown): TableColumnAlignment {
  return value === 'left' || value === 'center' || value === 'right' ? value : null;
}

function normalizeTableColumnAlignments(
  alignments: readonly unknown[] | undefined,
  columnCount: number,
): TableColumnAlignment[] | undefined {
  const normalized = Array.from({ length: columnCount }, (_, index) =>
    normalizeTableAlignment(alignments?.[index]),
  );
  return normalized.some((alignment) => alignment !== null) ? normalized : undefined;
}

function normalizeTableCssLength(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeTableCssLengthArray(
  values: readonly unknown[] | undefined,
  length: number,
): Array<string | null> | undefined {
  const normalized = Array.from({ length }, (_, index) => normalizeTableCssLength(values?.[index]));
  return normalized.some((value) => value !== null) ? normalized : undefined;
}

export function createRichTableCell(children: RichInlineNode[] = [createRichTextLeaf('')]): RichTableCell {
  return {
    type: 'table-cell',
    children: children.length > 0 ? children : [createRichTextLeaf('')],
  };
}

export function createRichTableRow(
  cells: RichTableCell[],
  options: Pick<RichTableRow, 'header'> = {},
): RichTableRow {
  return {
    type: 'table-row',
    ...(typeof options.header === 'boolean' ? { header: options.header } : {}),
    children: cells.length > 0 ? cells : [createRichTableCell()],
  };
}

export function createRichTableBlock(
  rows: RichTableRow[] = [],
  options: {
    direction?: unknown;
    columnAlignments?: readonly unknown[];
    columnWidths?: readonly unknown[];
    rowHeights?: readonly unknown[];
  } = {},
): RichTableBlock {
  const sourceRows = rows.length > 0
    ? rows
    : [
        createRichTableRow([createRichTableCell(), createRichTableCell()], { header: true }),
        createRichTableRow([createRichTableCell(), createRichTableCell()]),
      ];
  const columnCount = Math.max(1, ...sourceRows.map((row) => row.children.length));
	  const normalizedRows = sourceRows.map((row, rowIndex) => createRichTableRow(
	    Array.from({ length: columnCount }, (_, cellIndex) => row.children[cellIndex] ?? createRichTableCell()),
	    { header: row.header === true || (rows.length === 0 && rowIndex === 0) },
	  ));
  const columnAlignments = normalizeTableColumnAlignments(options.columnAlignments, columnCount);
  const columnWidths = normalizeTableCssLengthArray(options.columnWidths, columnCount);
  const rowHeights = normalizeTableCssLengthArray(options.rowHeights, normalizedRows.length);
  return {
    type: 'table',
    ...(options.direction === 'ltr' || options.direction === 'rtl' ? { direction: options.direction } : {}),
    ...(columnAlignments ? { columnAlignments } : {}),
    ...(columnWidths ? { columnWidths } : {}),
    ...(rowHeights ? { rowHeights } : {}),
    children: normalizedRows,
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

export function createTableBlockContent(
  rows?: RichTableRow[],
  options: { columnAlignments?: readonly unknown[] } = {},
): TableBlockContent {
  return createRichTableBlock(rows, options);
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
