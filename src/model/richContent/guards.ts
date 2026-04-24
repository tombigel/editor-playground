import type {
  CodeBlockContent,
  ListBlockContent,
  RichBlock,
  RichListBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
  TextBlockContent,
  TextDocumentBlock,
  TextDocumentContent,
} from '../types';
import { isObjectRecord, RICH_LIST_BLOCK_TYPES, RICH_TEXT_BLOCK_TYPES } from './shared';

export function isRichTextBlockType(value: unknown): value is RichTextBlockType {
  return typeof value === 'string' && RICH_TEXT_BLOCK_TYPES.has(value as RichTextBlockType);
}

export function isRichListBlockType(value: unknown): value is RichListBlock['type'] {
  return typeof value === 'string' && RICH_LIST_BLOCK_TYPES.has(value as RichListBlock['type']);
}

export function isRichTextLeaf(node: unknown): node is RichTextLeaf {
  return isObjectRecord(node) && typeof node.text === 'string';
}

export function isRichTextLink(node: unknown): node is RichTextLink {
  return isObjectRecord(node) && node.type === 'link' && Array.isArray(node.children);
}

export function isRichTextBlock(node: unknown): node is RichBlock {
  return isObjectRecord(node) && typeof node.type === 'string' && (
    isRichTextBlockType(node.type) ||
    node.type === 'code-block' ||
    isRichListBlockType(node.type)
  ) && Array.isArray(node.children);
}

export function isTextBlockContent(node: unknown): node is TextBlockContent {
  return isObjectRecord(node) && isRichTextBlockType(node.type) && Array.isArray(node.children);
}

export function isCodeBlockContent(node: unknown): node is CodeBlockContent {
  return isObjectRecord(node) && node.type === 'code-block' && Array.isArray(node.children);
}

export function isListBlockContent(node: unknown): node is ListBlockContent {
  return isObjectRecord(node) && isRichListBlockType(node.type) && Array.isArray(node.children);
}

export function isTextDocumentBlock(node: unknown): node is TextDocumentBlock {
  return isTextBlockContent(node) || isCodeBlockContent(node) || isListBlockContent(node);
}

export function isTextDocumentContent(value: unknown): value is TextDocumentContent {
  return isObjectRecord(value) && Array.isArray(value.blocks);
}
