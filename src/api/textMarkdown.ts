import { getLinkHref } from '../model/links';
import {
  createRichCodeBlock,
  createRichListBlock,
  createRichTextBlock,
  createRichTextLeaf,
  getTextContent,
  isRichTextLink,
  normalizeRichContent,
} from '../model/richContent';
import {
  createUnorderedListContentFromLines,
  listContentToMarkdown,
  normalizeListContent,
} from '../model/listContent';
import type {
  DocumentModel,
  ListContent,
  RichBlock,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichListItem,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  TextNode,
  TextSubtype,
} from '../model/types';
import { highlightCode } from '../render/codeHighlight';

type ParsedMarkdownNode = {
  subtype: TextSubtype;
  content: string | RichContent | ListContent;
  htmlTag?: TextNode['htmlTag'];
  code?: TextNode['code'];
};

const HEADING_TAGS: RichTextBlockType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export function serializeTextNodeToMarkdown(
  node: TextNode,
  document?: DocumentModel,
): string {
  if (node.subtype === 'rich') {
    return serializeRichContentToMarkdown(node.content as RichContent, document);
  }

  if (node.subtype === 'list') {
    return listContentToMarkdown(normalizeListContent(node.content));
  }

  if (node.subtype === 'code') {
    return serializeCodeBlockToMarkdown(node.content as string, node.code?.language);
  }

  const content = typeof node.content === 'string' ? node.content : getTextContent(node.content as RichContent, { blockSeparator: '\n' });
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
        content: code,
        code: {
          language: block.language ?? 'plaintext',
          theme: block.theme,
          highlightedHtml: block.highlightedHtml ?? highlightCode(code, block.language ?? 'plaintext'),
        },
      };
    }

    return {
      subtype: 'code',
      content: markdown,
      code: {
        language: 'markdown',
        highlightedHtml: highlightCode(markdown, 'markdown'),
      },
    };
  }

  if (targetSubtype === 'rich') {
    return {
      subtype: 'rich',
      content: parseMarkdownToRichContent(markdown),
    };
  }

  if (targetSubtype === 'list') {
    const richContent = parseMarkdownToRichContent(markdown);
    if (richContent.length === 1 && (richContent[0]?.type === 'ul' || richContent[0]?.type === 'ol')) {
      const block = richContent[0];
      return {
        subtype: 'list',
        content: richListBlockToListContent(block),
      };
    }

    const lines = getTextContent(richContent, { blockSeparator: '\n' })
      .split(/\r?\n/)
      .filter((line) => line.length > 0);
    return {
      subtype: 'list',
      content: createUnorderedListContentFromLines(lines.length > 0 ? lines : ['']),
    };
  }

  const richContent = parseMarkdownToRichContent(markdown);
  if (richContent.length === 1 && isNonListTextBlock(richContent[0])) {
    const block = richContent[0];
    return {
      subtype: 'block',
      content: getTextContent([block]),
      htmlTag: richBlockToHtmlTag(block),
    };
  }

  return {
    subtype: 'block',
    content: getTextContent(richContent, { blockSeparator: '\n' }),
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
  let cursor = 0;

  while (cursor < text.length) {
    const remaining = text.slice(cursor);
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

function richListBlockToListContent(block: RichListBlock): ListContent {
  if (block.type === 'ol') {
    return {
      type: 'ol',
      start: block.start,
      markerStyle: block.markerStyle,
      items: block.children.map((item) => ({ text: getTextContentFromRichListItem(item), direction: 'ltr' })),
    };
  }

  return {
    type: 'ul',
    markerStyle: block.markerStyle,
    items: block.children.map((item) => ({ text: getTextContentFromRichListItem(item), direction: 'ltr' })),
  };
}

function getTextContentFromRichListItem(item: RichListItem): string {
  return item.children.map((child) => (isRichTextLink(child) ? child.children.map((leaf) => leaf.text).join('') : child.text)).join('');
}

function isNonListTextBlock(block: RichBlock): block is RichTextBlock {
  return block.type !== 'code-block' && block.type !== 'ul' && block.type !== 'ol';
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
