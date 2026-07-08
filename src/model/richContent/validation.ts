import type { TextDocumentContent } from '../types';
import {
  isCodeBlockContent,
  isListBlockContent,
  isRichTextBlockType,
  isRichTextLeaf,
  isTableBlockContent,
  isTextBlockContent,
  isTextDocumentContent,
} from './guards';
import { isObjectRecord, normalizeBlockGap } from './shared';
import { MAX_LIST_ITEM_DEPTH } from './shared';

const TABLE_CELL_STYLE_KEYS = new Set([
  'background',
  'padding',
  'borderTopWidth',
  'borderTopColor',
  'borderRightWidth',
  'borderRightColor',
  'borderBottomWidth',
  'borderBottomColor',
  'borderLeftWidth',
  'borderLeftColor',
]);

function validateTableCellStyle(style: unknown, path: string, errors: string[]) {
  if (style === undefined) {
    return;
  }
  if (!isObjectRecord(style)) {
    errors.push(`${path} style must be an object.`);
    return;
  }
  for (const [key, value] of Object.entries(style)) {
    if (!TABLE_CELL_STYLE_KEYS.has(key)) {
      errors.push(`${path} style field "${key}" is not supported.`);
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`${path} style field "${key}" must be a string.`);
    }
  }
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

      let previousDepth = 0;
      block.children.forEach((child, childIndex) => {
        if (!isObjectRecord(child) || child.type !== 'list-item' || !Array.isArray(child.children)) {
          errors.push(`Rich list block ${blockIndex} child ${childIndex} must be a list-item element.`);
          return;
        }

        const childDepth = child.depth === undefined ? 0 : child.depth;
        if (
          typeof childDepth !== 'number'
          || !Number.isFinite(childDepth)
          || Math.trunc(childDepth) !== childDepth
          || childDepth < 0
          || childDepth > MAX_LIST_ITEM_DEPTH
        ) {
          errors.push(`Rich list item ${blockIndex}.${childIndex} depth must be an integer from 0 to ${MAX_LIST_ITEM_DEPTH}.`);
        } else if (childDepth > previousDepth + 1) {
          errors.push(`Rich list item ${blockIndex}.${childIndex} depth cannot increase by more than one level.`);
        } else {
          previousDepth = childDepth;
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

    if (block.type === 'table') {
      if (!Array.isArray(block.children)) {
        errors.push(`Rich table block ${blockIndex} must define table-row children.`);
        return;
      }

      if (block.children.length === 0) {
        errors.push(`Rich table block ${blockIndex} must contain at least one row.`);
        return;
      }

      const columnCount = isObjectRecord(block.children[0]) && Array.isArray(block.children[0].children)
        ? block.children[0].children.length
        : 0;
      if (columnCount < 1) {
        errors.push(`Rich table block ${blockIndex} must contain at least one column.`);
      }

      if (block.direction !== undefined && block.direction !== 'ltr' && block.direction !== 'rtl') {
        errors.push(`Rich table block ${blockIndex} direction must be ltr or rtl.`);
      }

      if (block.columnAlignments !== undefined) {
        if (!Array.isArray(block.columnAlignments)) {
          errors.push(`Rich table block ${blockIndex} columnAlignments must be an array.`);
        } else {
          if (block.columnAlignments.length !== columnCount) {
            errors.push(`Rich table block ${blockIndex} columnAlignments length must match the column count.`);
          }
          block.columnAlignments.forEach((alignment, alignmentIndex) => {
            if (alignment !== null && alignment !== 'left' && alignment !== 'center' && alignment !== 'right') {
              errors.push(`Rich table block ${blockIndex} column alignment ${alignmentIndex} must be left, center, right, or null.`);
            }
          });
        }
      }

      if (block.columnWidths !== undefined) {
        if (!Array.isArray(block.columnWidths)) {
          errors.push(`Rich table block ${blockIndex} columnWidths must be an array.`);
        } else {
          if (block.columnWidths.length !== columnCount) {
            errors.push(`Rich table block ${blockIndex} columnWidths length must match the column count.`);
          }
          block.columnWidths.forEach((width, widthIndex) => {
            if (width !== null && typeof width !== 'string') {
              errors.push(`Rich table block ${blockIndex} column width ${widthIndex} must be a string or null.`);
            }
          });
        }
      }

      if (block.rowHeights !== undefined) {
        if (!Array.isArray(block.rowHeights)) {
          errors.push(`Rich table block ${blockIndex} rowHeights must be an array.`);
        } else {
          if (block.rowHeights.length !== block.children.length) {
            errors.push(`Rich table block ${blockIndex} rowHeights length must match the row count.`);
          }
          block.rowHeights.forEach((height, heightIndex) => {
            if (height !== null && typeof height !== 'string') {
              errors.push(`Rich table block ${blockIndex} row height ${heightIndex} must be a string or null.`);
            }
          });
        }
      }

      if (block.style !== undefined) {
        if (!isObjectRecord(block.style)) {
          errors.push(`Rich table block ${blockIndex} style must be an object.`);
        } else {
          const tableStyle = block.style as Record<string, unknown>;
          const tableStyleKeys = [
            'tableBackground',
            'tableBorderColor',
            'tableBorderWidth',
            'cellBorderColor',
            'cellBorderWidth',
            'cellPadding',
            'headerBackground',
            'headerColor',
          ] as const;
          tableStyleKeys.forEach((styleKey) => {
            const value = tableStyle[styleKey];
            if (value !== undefined && typeof value !== 'string') {
              errors.push(`Rich table block ${blockIndex} style ${styleKey} must be a string.`);
            }
          });
        }
      }

      block.children.forEach((row, rowIndex) => {
        if (!isObjectRecord(row) || row.type !== 'table-row' || !Array.isArray(row.children)) {
          errors.push(`Rich table block ${blockIndex} child ${rowIndex} must be a table-row element.`);
          return;
        }
        if (row.header !== undefined && typeof row.header !== 'boolean') {
          errors.push(`Rich table row ${blockIndex}.${rowIndex} header must be a boolean.`);
        }
        if (row.children.length !== columnCount) {
          errors.push(`Rich table row ${blockIndex}.${rowIndex} must have ${columnCount} cells.`);
        }
        row.children.forEach((cell, cellIndex) => {
          if (!isObjectRecord(cell) || cell.type !== 'table-cell' || !Array.isArray(cell.children)) {
            errors.push(`Rich table cell ${blockIndex}.${rowIndex}.${cellIndex} must be a table-cell element.`);
            return;
          }
          validateTableCellStyle(cell.style, `Rich table cell ${blockIndex}.${rowIndex}.${cellIndex}`, errors);
          cell.children.forEach((cellChild, cellChildIndex) => {
            if (isObjectRecord(cellChild) && cellChild.type === 'link') {
              if (!Array.isArray(cellChild.children)) {
                errors.push(`Rich table cell link ${blockIndex}.${rowIndex}.${cellIndex}.${cellChildIndex} must define leaf children.`);
                return;
              }
              cellChild.children.forEach((linkChild, linkChildIndex) => {
                if (!isRichTextLeaf(linkChild)) {
                  errors.push(`Rich table cell link ${blockIndex}.${rowIndex}.${cellIndex}.${cellChildIndex}.${linkChildIndex} must be a text leaf.`);
                }
              });
              return;
            }

            if (!isRichTextLeaf(cellChild)) {
              errors.push(`Rich table cell ${blockIndex}.${rowIndex}.${cellIndex} child ${cellChildIndex} must be a text leaf or link.`);
            }
          });
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
  subtype: 'block' | 'rich' | 'code' | 'list' | 'table',
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

  if (subtype === 'table') {
    if (blockCount !== 1 || !isTableBlockContent(content.blocks[0])) {
      errors.push('Table subtype content must contain exactly one table block.');
    }
    return errors;
  }

  if (blockCount === 0) {
    errors.push('Rich subtype content must contain at least one block.');
  }

  return errors;
}
