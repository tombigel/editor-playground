import type { TextDocumentContent } from '../types';
import {
  isCodeBlockContent,
  isListBlockContent,
  isRichTextBlockType,
  isRichTextLeaf,
  isTextBlockContent,
  isTextDocumentContent,
} from './guards';
import { isObjectRecord, normalizeBlockGap } from './shared';

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
