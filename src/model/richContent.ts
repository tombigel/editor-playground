import type {
  LinkKind,
  RichContent,
  RichInlineNode,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
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

const RICH_TEXT_LINK_TYPES = new Set<LinkKind>(['external', 'page', 'anchor']);

function isObjectRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRichTextBlockType(value: unknown): value is RichTextBlockType {
  return typeof value === 'string' && RICH_TEXT_BLOCK_TYPES.has(value as RichTextBlockType);
}

function normalizeLinkKind(value: unknown): LinkKind {
  return typeof value === 'string' && RICH_TEXT_LINK_TYPES.has(value as LinkKind)
    ? value as LinkKind
    : 'external';
}

function normalizeInlineNode(node: unknown): RichInlineNode | null {
  if (isRichTextLink(node)) {
    return normalizeRichTextLink(node);
  }
  if (isRichTextLeaf(node)) {
    return node;
  }
  return null;
}

function normalizeBlockChildren(children: unknown): RichInlineNode[] {
  if (!Array.isArray(children)) {
    return [createRichTextLeaf('')];
  }

  const normalized = children
    .map((child) => normalizeInlineNode(child))
    .filter((child): child is RichInlineNode => child !== null);

  return normalized.length > 0 ? normalized : [createRichTextLeaf('')];
}

function normalizeRichTextLink(node: RichTextLink): RichTextLink {
  return {
    type: 'link',
    linkType: normalizeLinkKind(node.linkType),
    children: normalizeBlockChildren(node.children).flatMap((child) => (isRichTextLink(child) ? child.children : [child as RichTextLeaf])),
    ...(typeof node.href === 'string' ? { href: node.href } : {}),
    ...(typeof node.targetPageId === 'string' ? { targetPageId: node.targetPageId } : {}),
    ...(typeof node.pageAnchorId === 'string' ? { pageAnchorId: node.pageAnchorId } : {}),
    ...(typeof node.anchorTargetId === 'string' ? { anchorTargetId: node.anchorTargetId } : {}),
    ...(typeof node.openInNewTab === 'boolean' ? { openInNewTab: node.openInNewTab } : {}),
  };
}

function createParagraphBlock(children: RichInlineNode[]): RichTextBlock {
  return createRichTextBlock('paragraph', children);
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
  return content
    .map((block) =>
      block.children
        .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [(node as RichTextLeaf).text]))
        .join(''),
    )
    .join(blockSeparator);
}

export function isRichTextLeaf(node: unknown): node is RichTextLeaf {
  return isObjectRecord(node) && typeof node.text === 'string';
}

export function isRichTextLink(node: unknown): node is RichTextLink {
  return isObjectRecord(node) && node.type === 'link' && Array.isArray(node.children);
}

export function isRichTextBlock(node: unknown): node is RichTextBlock {
  return isObjectRecord(node) && isRichTextBlockType(node.type) && Array.isArray(node.children);
}

export function createRichTextLeaf(text: string, marks?: Partial<RichTextLeaf>): RichTextLeaf {
  return { text, ...marks };
}

export function createRichTextBlock(
  type: RichTextBlockType,
  children: RichInlineNode[],
): RichTextBlock {
  return {
    type,
    children: children.length > 0 ? children : [createRichTextLeaf('')],
  };
}

export function createParagraphRichText(text: string, marks?: Partial<RichTextLeaf>): RichContent {
  return [createParagraphBlock([createRichTextLeaf(text, marks)])];
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
    if (isRichTextBlock(node)) {
      flushInlineBuffer();
      blocks.push({
        type: node.type,
        children: normalizeBlockChildren(node.children),
      });
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
    if (!isObjectRecord(block) || !isRichTextBlockType(block.type)) {
      errors.push(`Rich content root item ${blockIndex} must be a block.`);
      return;
    }

    if (!Array.isArray(block.children)) {
      errors.push(`Rich content block ${blockIndex} must define a children array.`);
      return;
    }

    block.children.forEach((child, childIndex) => {
      if (isRichTextBlock(child)) {
        errors.push(`Rich content block ${blockIndex} cannot contain nested blocks.`);
        return;
      }

      if (isRichTextLink(child)) {
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
        errors.push(`Rich content block ${blockIndex} child ${childIndex} must be a text leaf or link.`);
      }
    });
  });

  return errors;
}

/**
 * Returns true if every leaf in the content has an empty text string.
 */
export function isEmpty(content: RichContent): boolean {
  for (const block of content) {
    for (const node of block.children) {
      if (isRichTextLink(node)) {
        if (node.children.some((leaf) => leaf.text !== '')) return false;
      } else {
        if ((node as RichTextLeaf).text !== '') return false;
      }
    }
  }
  return true;
}

/**
 * Calls visitor for every RichTextLink in the content (does not descend into link children).
 */
export function walkLinks(content: RichContent, visitor: (link: RichTextLink) => void): void {
  for (const block of content) {
    for (const node of block.children) {
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
    let blockChanged = false;
    const children = block.children.map((node) => {
      if (!isRichTextLink(node)) return node;
      const mapped = mapper(node);
      if (mapped !== node) {
        blockChanged = true;
      }
      return mapped;
    });

    if (!blockChanged) {
      return block;
    }

    changed = true;
    return {
      ...block,
      children,
    };
  });
  return changed ? next : content;
}
