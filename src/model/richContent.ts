import type { RichContent, RichTextLeaf, RichTextLink } from './types';

/**
 * Returns the plain-text string for any content value.
 * For RichContent, concatenates all leaf text values.
 * Useful for height estimation, search, and other string-only operations.
 */
export function getTextContent(content: string | RichContent): string {
  if (typeof content === 'string') return content;
  return content
    .flatMap((node) => (isRichTextLink(node) ? node.children.map((l) => l.text) : [(node as RichTextLeaf).text]))
    .join('');
}

export function isRichTextLink(node: RichContent[number]): node is RichTextLink {
  return 'type' in node && node.type === 'link';
}

/**
 * Returns true if every leaf in the content has an empty text string.
 */
export function isEmpty(content: RichContent): boolean {
  for (const node of content) {
    if (isRichTextLink(node)) {
      if (node.children.some((leaf) => leaf.text !== '')) return false;
    } else {
      if ((node as RichTextLeaf).text !== '') return false;
    }
  }
  return true;
}

/**
 * Calls visitor for every RichTextLink in the content (does not descend into link children).
 */
export function walkLinks(content: RichContent, visitor: (link: RichTextLink) => void): void {
  for (const node of content) {
    if (isRichTextLink(node)) {
      visitor(node);
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
  const next = content.map((node) => {
    if (!isRichTextLink(node)) return node;
    const mapped = mapper(node);
    if (mapped !== node) changed = true;
    return mapped;
  });
  return changed ? next : content;
}
