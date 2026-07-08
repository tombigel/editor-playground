import { getLinkHref } from '../model/links';
import {
  createTextDocumentContent,
  createTextDocumentFromCode,
  createTextDocumentFromText,
  getSingleListBlockContent,
  getSingleTableBlockContent,
  createRichCodeBlock,
  createRichListBlock,
  createRichTableBlock,
  createRichTableCell,
  createRichTableRow,
  createRichTextBlock,
  createRichTextLeaf,
  getTextContent,
  isRichTextLink,
  listContentToRichListBlock,
  normalizeRichContent,
  richListBlockToListContent,
} from '../model/richContent';
import {
  createUnorderedListContentFromLines,
  listContentToMarkdown,
  normalizeListContent,
} from '../model/listContent';
import type {
  DocumentModel,
  RichBlock,
  RichContent,
  RichInlineNode,
  RichListItem,
  RichTableBlock,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  TableColumnAlignment,
  TextNode,
  TextDocumentContent,
  TextSubtype,
} from '../model/types';
import { highlightCode } from '../render/codeHighlight';

type ParsedMarkdownNode = {
  subtype: TextSubtype;
  content: TextDocumentContent;
  htmlTag?: TextNode['htmlTag'];
  code?: TextNode['code'];
};

const HEADING_TAGS: RichTextBlockType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export function serializeTextNodeToMarkdown(
  node: TextNode,
  document?: DocumentModel,
): string {
  if (node.subtype === 'rich') {
    return serializeRichContentToMarkdown(node.content.blocks, document);
  }

  if (node.subtype === 'list') {
    const listBlock = getSingleListBlockContent(node.content);
    return listContentToMarkdown(listBlock ? richListBlockToListContent(listBlock) : normalizeListContent(undefined));
  }

  if (node.subtype === 'table') {
    const tableBlock = getSingleTableBlockContent(node.content);
    return serializeTableBlockToMarkdown(tableBlock ?? createRichTableBlock(), document);
  }

  if (node.subtype === 'code') {
    return serializeCodeBlockToMarkdown(getTextContent(node.content.blocks, { blockSeparator: '\n' }), node.code?.language);
  }

  const content = getTextContent(node.content.blocks, { blockSeparator: '\n' });
  if (node.link && document) {
    const href = getLinkHref(node.link, document);
    if (href) {
      return `[${escapeInlineText(content)}](${href})`;
    }
  }

  if (node.htmlTag === 'blockquote') {
    return content
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join('\n');
  }

  if (node.htmlTag && node.htmlTag !== 'p' && HEADING_TAGS.includes(node.htmlTag)) {
    const level = HEADING_TAGS.indexOf(node.htmlTag) + 1;
    return `${'#'.repeat(level)} ${content}`;
  }

  return content;
}

export function serializeRichContentToMarkdown(
  content: RichContent,
  document?: DocumentModel,
): string {
  return normalizeRichContent(content)
    .map((block) => serializeRichBlockToMarkdown(block, document))
    .join('\n\n');
}

export function parseMarkdownToRichContent(markdown: string): RichContent {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: RichContent = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const fenceMatch = line.match(/^```(\S+)?\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1] ?? 'plaintext';
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && /^```\s*$/.test(lines[index])) {
        index += 1;
      }
      blocks.push(createRichCodeBlock(codeLines.join('\n'), {
        language,
        highlightedHtml: highlightCode(codeLines.join('\n'), language),
      }));
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const type = HEADING_TAGS[Math.min(headingMatch[1].length, 6) - 1];
      blocks.push(createRichTextBlock(type, parseInlineMarkdown(headingMatch[2])));
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(createRichTextBlock('blockquote', parseInlineMarkdown(quoteLines.join(' '))));
      continue;
    }

    if (index + 1 < lines.length && line.includes('|') && isPipeAlignmentLine(lines[index + 1])) {
      const tableLines: string[] = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(parsePipeTableMarkdown(tableLines.join('\n')));
      continue;
    }

    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const items: RichListItem[] = [];
      const start = Number.parseInt(orderedMatch[1], 10) || 1;
      while (index < lines.length) {
        const match = lines[index].match(/^\s*(\d+)\.\s+(.*)$/);
        if (!match) {
          break;
        }
        items.push({
          type: 'list-item',
          children: parseInlineMarkdown(match[2]),
        });
        index += 1;
      }
      blocks.push(createRichListBlock('ol', items, { start }));
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      const items: RichListItem[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*[-*+]\s+(.*)$/);
        if (!match) {
          break;
        }
        items.push({
          type: 'list-item',
          children: parseInlineMarkdown(match[1]),
        });
        index += 1;
      }
      blocks.push(createRichListBlock('ul', items));
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index];
      if (
        candidate.trim() === '' ||
        /^```(\S+)?\s*$/.test(candidate) ||
        /^(#{1,6})\s+/.test(candidate) ||
        /^\s*>\s?/.test(candidate) ||
        /^\s*(\d+)\.\s+/.test(candidate) ||
        /^\s*[-*+]\s+/.test(candidate)
      ) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }
    blocks.push(createRichTextBlock('paragraph', parseInlineMarkdown(paragraphLines.join(' '))));
  }

  return normalizeRichContent(blocks);
}

export function parseMarkdownForTextSubtype(
  markdown: string,
  targetSubtype: TextSubtype,
): ParsedMarkdownNode {
  if (targetSubtype === 'code') {
    const richContent = parseMarkdownToRichContent(markdown);
    if (richContent.length === 1 && richContent[0]?.type === 'code-block') {
      const block = richContent[0];
      const code = block.children.map((line) => line.children.map((leaf) => leaf.text).join('')).join('\n');
      return {
        subtype: 'code',
        content: createTextDocumentFromCode(code, {
          direction: 'ltr',
          language: block.language ?? 'plaintext',
          theme: block.theme,
          highlightedHtml: block.highlightedHtml ?? highlightCode(code, block.language ?? 'plaintext'),
        }),
        code: {
          language: block.language ?? 'plaintext',
          theme: block.theme,
          highlightedHtml: block.highlightedHtml ?? highlightCode(code, block.language ?? 'plaintext'),
        },
      };
    }

    return {
      subtype: 'code',
      content: createTextDocumentFromCode(markdown, {
        direction: 'ltr',
        language: 'markdown',
        highlightedHtml: highlightCode(markdown, 'markdown'),
      }),
      code: {
        language: 'markdown',
        highlightedHtml: highlightCode(markdown, 'markdown'),
      },
    };
  }

  if (targetSubtype === 'rich') {
    return {
      subtype: 'rich',
      content: createTextDocumentContent(parseMarkdownToRichContent(markdown)),
    };
  }

  if (targetSubtype === 'list') {
    const richContent = parseMarkdownToRichContent(markdown);
    if (richContent.length === 1 && (richContent[0]?.type === 'ul' || richContent[0]?.type === 'ol')) {
      const block = richContent[0];
      return {
        subtype: 'list',
        content: createTextDocumentContent([block]),
      };
    }

    const lines = getTextContent(richContent, { blockSeparator: '\n' })
      .split(/\r?\n/)
      .filter((line) => line.length > 0);
    return {
      subtype: 'list',
      content: createTextDocumentContent([
        listContentToRichListBlock(createUnorderedListContentFromLines(lines.length > 0 ? lines : [''])),
      ]),
    };
  }

  if (targetSubtype === 'table') {
    return {
      subtype: 'table',
      content: createTextDocumentContent([parsePipeTableMarkdown(markdown)]),
    };
  }

  const richContent = parseMarkdownToRichContent(markdown);
  if (richContent.length === 1 && isNonListTextBlock(richContent[0])) {
    const block = richContent[0];
    return {
      subtype: 'block',
      content: createTextDocumentFromText(getTextContent([block]), {
        type: block.type === 'blockquote' ? 'blockquote' : block.type === 'paragraph' ? 'paragraph' : block.type,
        direction: block.direction,
        lineHeight: block.lineHeight,
        style: block.style,
      }),
      htmlTag: richBlockToHtmlTag(block),
    };
  }

  return {
    subtype: 'block',
    content: createTextDocumentFromText(getTextContent(richContent, { blockSeparator: '\n' }), {
      type: 'paragraph',
      direction: 'ltr',
    }),
    htmlTag: 'p',
  };
}

function serializeCodeBlockToMarkdown(content: string, language?: string): string {
  const infoString = language && language !== 'plaintext' ? language : '';
  return `\`\`\`${infoString}\n${content}\n\`\`\``;
}

function serializeRichBlockToMarkdown(block: RichBlock, document?: DocumentModel): string {
  if (block.type === 'code-block') {
    const code = block.children.map((line) => line.children.map((leaf) => leaf.text).join('')).join('\n');
    return serializeCodeBlockToMarkdown(code, block.language);
  }

  if (block.type === 'ul') {
    return block.children
      .map((item) => `- ${serializeInlineNodesToMarkdown(item.children, document)}`)
      .join('\n');
  }

  if (block.type === 'ol') {
    const start = block.start ?? 1;
    return block.children
      .map((item, index) => `${start + index}. ${serializeInlineNodesToMarkdown(item.children, document)}`)
      .join('\n');
  }

  if (block.type === 'table') {
    return serializeTableBlockToMarkdown(block, document);
  }

  const inline = serializeInlineNodesToMarkdown(block.children, document);
  if (block.type === 'blockquote') {
    return inline
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  }

  if (block.type !== 'paragraph' && block.type !== 'div') {
    const level = HEADING_TAGS.indexOf(block.type) + 1;
    return `${'#'.repeat(level)} ${inline}`;
  }

  return inline;
}

function serializeInlineNodesToMarkdown(
  nodes: RichInlineNode[],
  document?: DocumentModel,
): string {
  return nodes
    .map((node) => {
      if (isRichTextLink(node)) {
        const href = serializeRichLinkHref(node, document);
        const label = node.children.map((leaf) => serializeLeafToMarkdown(leaf)).join('');
        return href ? `[${label}](${href})` : label;
      }
      return serializeLeafToMarkdown(node);
    })
    .join('');
}

function serializeLeafToMarkdown(leaf: RichTextLeaf): string {
  let text = escapeInlineText(leaf.text);
  if (leaf.italic) {
    text = `*${text}*`;
  }
  if (leaf.bold) {
    text = `**${text}**`;
  }
  return text;
}

function parseInlineMarkdown(text: string): RichInlineNode[] {
  const nodes: RichInlineNode[] = [];
  const source = text.replace(/<br\s*\/?>/gi, '\n');
  let cursor = 0;

  while (cursor < source.length) {
    const remaining = source.slice(cursor);
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({
        type: 'link',
        linkType: 'external',
        href: linkMatch[2],
        children: parseInlineMarks(linkMatch[1]),
      });
      cursor += linkMatch[0].length;
      continue;
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      nodes.push(createRichTextLeaf(boldMatch[1], { bold: true }));
      cursor += boldMatch[0].length;
      continue;
    }

    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      nodes.push(createRichTextLeaf(italicMatch[1], { italic: true }));
      cursor += italicMatch[0].length;
      continue;
    }

    const nextSpecialIndex = findNextMarkdownTokenIndex(remaining);
    const literal = nextSpecialIndex === -1 ? remaining : remaining.slice(0, nextSpecialIndex);
    if (literal.length > 0) {
      nodes.push(...parseInlineMarks(literal));
      cursor += literal.length;
      continue;
    }

    nodes.push(createRichTextLeaf(remaining[0] ?? ''));
    cursor += 1;
  }

  return nodes.length > 0 ? nodes : [createRichTextLeaf('')];
}

function parseInlineMarks(text: string): RichTextLeaf[] {
  const leaves: RichTextLeaf[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const boldMatch = text.slice(cursor).match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      leaves.push(createRichTextLeaf(boldMatch[1], { bold: true }));
      cursor += boldMatch[0].length;
      continue;
    }

    const italicMatch = text.slice(cursor).match(/^\*([^*]+)\*/);
    if (italicMatch) {
      leaves.push(createRichTextLeaf(italicMatch[1], { italic: true }));
      cursor += italicMatch[0].length;
      continue;
    }

    const nextToken = findNextMarkTokenIndex(text.slice(cursor));
    const literal = nextToken === -1 ? text.slice(cursor) : text.slice(cursor, cursor + nextToken);
    if (literal.length > 0) {
      leaves.push(createRichTextLeaf(unescapeInlineText(literal)));
      cursor += literal.length;
      continue;
    }

    leaves.push(createRichTextLeaf(text[cursor] ?? ''));
    cursor += 1;
  }

  return leaves.length > 0 ? leaves : [createRichTextLeaf('')];
}

function findNextMarkdownTokenIndex(text: string): number {
  const indexes = ['[', '*']
    .map((token) => text.indexOf(token))
    .filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function findNextMarkTokenIndex(text: string): number {
  const indexes = ['**', '*']
    .map((token) => text.indexOf(token))
    .filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function serializeTableBlockToMarkdown(block: RichTableBlock, document?: DocumentModel): string {
  const columnCount = Math.max(1, ...block.children.map((row) => row.children.length));
  const rows = block.children.length > 0 ? block.children : createRichTableBlock().children;
  const header = rows[0] ?? createRichTableRow([createRichTableCell()]);
  const alignmentRow = Array.from({ length: columnCount }, (_, index) =>
    serializeTableAlignment(block.columnAlignments?.[index] ?? null),
  );
  const bodyRows = rows.slice(1);
  return [
    serializeTableRow(header.children, columnCount, document),
    `| ${alignmentRow.join(' | ')} |`,
    ...bodyRows.map((row) => serializeTableRow(row.children, columnCount, document)),
  ].join('\n');
}

function serializeTableRow(
  cells: RichTableBlock['children'][number]['children'],
  columnCount: number,
  document?: DocumentModel,
): string {
  const values = Array.from({ length: columnCount }, (_, index) =>
    escapeTableCellText(serializeInlineNodesToMarkdown(cells[index]?.children ?? [createRichTextLeaf('')], document)),
  );
  return `| ${values.join(' | ')} |`;
}

function serializeTableAlignment(alignment: TableColumnAlignment): string {
  if (alignment === 'left') return ':---';
  if (alignment === 'center') return ':---:';
  if (alignment === 'right') return '---:';
  return '---';
}

function parsePipeTableMarkdown(markdown: string): RichTableBlock {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length >= 2 && isPipeAlignmentLine(lines[1])) {
    const headerCells = splitPipeTableLine(lines[0]);
    const columnAlignments = splitPipeTableLine(lines[1]).map(parseTableAlignment);
    const bodyRows = lines.slice(2).map((line) => splitPipeTableLine(line));
    return createRichTableBlock([
      createRichTableRow(headerCells.map((cell) => createRichTableCell(parseInlineMarkdown(cell))), { header: true }),
      ...bodyRows.map((row) => createRichTableRow(row.map((cell) => createRichTableCell(parseInlineMarkdown(cell))))),
    ], { columnAlignments });
  }

  return createRichTableBlock(
    lines.length > 0
      ? lines.map((line, index) => createRichTableRow(
          splitPipeTableLine(line).map((cell) => createRichTableCell(parseInlineMarkdown(cell))),
          { header: index === 0 && lines.length > 1 },
        ))
      : undefined,
  );
}

function isPipeAlignmentLine(line: string): boolean {
  const cells = splitPipeTableLine(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseTableAlignment(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
  if (trimmed.startsWith(':')) return 'left';
  if (trimmed.endsWith(':')) return 'right';
  return null;
}

function splitPipeTableLine(line: string): string[] {
  const trimmed = line.trim();
  const source = trimmed.startsWith('|') && trimmed.endsWith('|')
    ? trimmed.slice(1, -1)
    : line;
  const cells: string[] = [];
  let current = '';
  let escaped = false;

  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (escaped) {
    current += '\\';
  }
  cells.push(current.trim());
  return cells.length > 0 ? cells : [''];
}

function escapeTableCellText(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function isNonListTextBlock(block: RichBlock): block is RichTextBlock {
  return block.type !== 'code-block' && block.type !== 'ul' && block.type !== 'ol' && block.type !== 'table';
}

function richBlockToHtmlTag(block: RichTextBlock): TextNode['htmlTag'] {
  if (block.type === 'blockquote') {
    return 'blockquote';
  }
  if (block.type !== 'paragraph' && block.type !== 'div' && HEADING_TAGS.includes(block.type)) {
    return block.type;
  }
  return 'p';
}

function serializeRichLinkHref(
  node: Extract<RichInlineNode, { type: 'link' }>,
  document?: DocumentModel,
): string | undefined {
  if (node.linkType === 'external') {
    return node.href;
  }

  if (!document) {
    return undefined;
  }

  return getLinkHref({
    linkType: node.linkType,
    href: node.href,
    targetPageId: node.targetPageId,
    pageAnchorId: node.pageAnchorId,
    anchorTargetId: node.anchorTargetId,
  }, document);
}

function escapeInlineText(text: string): string {
  return text.replace(/([\\`*_[\]()])/g, '\\$1');
}

function unescapeInlineText(text: string): string {
  return text.replace(/\\([\\`*_[\]()])/g, '$1');
}
