import type { RichContent, RichTextLink } from '../types';
import { isRichTextLink } from './guards';

export function walkLinks(content: RichContent, visitor: (link: RichTextLink) => void): void {
  for (const block of content) {
    if (block.type === 'code-block') {
      continue;
    }

    const nodes = block.type === 'ul' || block.type === 'ol'
      ? block.children.flatMap((item) => item.children)
      : block.type === 'table'
        ? block.children.flatMap((row) => row.children.flatMap((cell) => cell.children))
        : block.children;

    for (const node of nodes) {
      if (isRichTextLink(node)) {
        visitor(node);
      }
    }
  }
}

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

    if (block.type === 'table') {
      let blockChanged = false;
      const children = block.children.map((row) => {
        let rowChanged = false;
        const rowChildren = row.children.map((cell) => {
          let cellChanged = false;
          const cellChildren = cell.children.map((node) => {
            if (!isRichTextLink(node)) {
              return node;
            }
            const mapped = mapper(node);
            if (mapped !== node) {
              cellChanged = true;
            }
            return mapped;
          });

          if (!cellChanged) {
            return cell;
          }

          rowChanged = true;
          changed = true;
          return { ...cell, children: cellChildren };
        });

        if (!rowChanged) {
          return row;
        }

        blockChanged = true;
        return { ...row, children: rowChildren };
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
