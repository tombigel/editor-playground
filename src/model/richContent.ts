import type {
  LinkKind,
  ListContent,
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

function normalizeLineHeight(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
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
  options: Pick<RichTextBlock, 'direction' | 'lineHeight' | 'style'> = {},
): RichTextBlock {
  return {
    type,
    ...(options.direction ? { direction: options.direction } : {}),
    ...(typeof options.lineHeight === 'number' ? { lineHeight: options.lineHeight } : {}),
    ...(options.style ? { style: options.style } : {}),
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
  options: Pick<RichCodeBlock, 'direction' | 'language' | 'theme' | 'highlightedHtml' | 'style'> = {},
): RichCodeBlock {
  return {
    type: 'code-block',
    ...(options.direction ? { direction: options.direction } : {}),
    ...(typeof options.language === 'string' ? { language: options.language } : {}),
    ...(options.theme === 'light' || options.theme === 'dark' ? { theme: options.theme } : {}),
    ...(typeof options.highlightedHtml === 'string' ? { highlightedHtml: options.highlightedHtml } : {}),
    ...(options.style ? { style: options.style } : {}),
    children: [createRichCodeLine(text)],
  };
}

export function createRichListItem(text = ''): RichListItem {
  return {
    type: 'list-item',
    children: [createRichTextLeaf(text)],
  };
}

export function createRichListBlock(
  type: RichListBlock['type'],
  items: RichListItem[],
  options: Pick<RichListBlock, 'direction' | 'style'> & { markerStyle?: string; start?: number } = {},
): RichListBlock {
  if (type === 'ol') {
    return {
      type: 'ol',
      ...(options.direction ? { direction: options.direction } : {}),
      ...(options.style ? { style: options.style } : {}),
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

function normalizeRichBlock(node: unknown): RichBlock | null {
  if (!isObjectRecord(node) || typeof node.type !== 'string') {
    return null;
  }

  if (isRichTextBlockType(node.type)) {
    return createRichTextBlock(node.type, normalizeInlineChildren(node.children), {
      direction: normalizeDirection(node.direction),
      lineHeight: normalizeLineHeight(node.lineHeight),
      style: normalizeRichBlockStyle(node.style),
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
      children: normalizeCodeLines(node.children),
    };
  }

  if (isRichListBlockType(node.type)) {
    return createRichListBlock(node.type, normalizeListItems(node.children), {
      direction: normalizeDirection(node.direction),
      style: normalizeRichBlockStyle(node.style),
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
    return createRichListBlock('ol', content.items.map((item) => createRichListItem(item.text)), {
      direction: options.direction,
      style: options.style,
      start: content.start,
      markerStyle: content.markerStyle,
    });
  }

  return createRichListBlock('ul', content.items.map((item) => createRichListItem('text' in item ? item.text : `${item.term}${item.description ? `: ${item.description}` : ''}`)), {
    direction: options.direction,
    style: options.style,
    markerStyle: content.type === 'ul' ? content.markerStyle : undefined,
  });
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
