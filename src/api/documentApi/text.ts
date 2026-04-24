import { ensureDocumentFontFamilyByName, extractPrimaryFontFamily } from '../../fonts';
import { createDefaultLinkExtension } from '../../model/defaults';
import { normalizeNavigationKind } from '../../model/links';
import { normalizeListContent } from '../../model/listContent';
import {
  createRichTextBlock,
  createRichTextLeaf,
  createTextDocumentContent,
  createTextDocumentFromCode,
  createTextDocumentFromText,
  getSingleCodeBlockContent,
  getSingleTextBlockContent,
  getTextContent,
  getTextDocumentBlocks,
  htmlTagToTextBlockType,
  isRichTextLink,
  listContentToRichListBlock,
  normalizeRichContent,
  normalizeTextDocumentContent,
  replaceTextDocumentBlocks,
  setTextDocumentBlockGap,
  textBlockTypeToHtmlTag,
  validateTextSubtypeContentStructure,
} from '../../model/richContent';
import { CODE_THEME_SURFACE } from '../../model/textNodeDefaults';
import type { PageId } from '../../model/types/site';
import type {
  BorderColorField,
  BorderRadiusField,
  BorderWidthField,
  DocumentModel,
  EditorTextField,
  ListContent,
  NodeId,
  RichContent,
  RichInlineNode,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
  ShadowStyleField,
  TextDocumentContent,
  TextNode,
  TextSubtype,
} from '../../model/types';
import { isLeafNode, isMediaNode, isTextNode } from '../../model/types';
import { parseFontSizeValue, parseSpacingValue, parseUnitValue } from '../../model/units';
import { highlightCode, normalizeCodeLanguage } from '../../render/codeHighlight';
import { parseMarkdownForTextSubtype, serializeTextNodeToMarkdown } from '../textMarkdown';
import { cloneDocument } from './shared';

export type SetTextDocumentContentOptions = {
  clearBlockNodeLink?: boolean;
};

function syncTransitionalTextNodeFields(node: TextNode): void {
  if (node.subtype === 'block') {
    const block = getSingleTextBlockContent(node.content);
    node.htmlTag = block ? textBlockTypeToHtmlTag(block.type) : 'p';
    delete node.code;
    return;
  }

  if (node.subtype === 'code') {
    const block = getSingleCodeBlockContent(node.content);
    if (block) {
      node.code = {
        language: normalizeCodeLanguage(block.language ?? node.code?.language ?? 'plaintext'),
        ...(block.theme ? { theme: block.theme } : {}),
        ...(block.highlightedHtml ? { highlightedHtml: block.highlightedHtml } : {}),
      };
    } else {
      delete node.code;
    }
    delete node.htmlTag;
    return;
  }

  delete node.htmlTag;
  delete node.code;
}

function normalizeTextDocumentContentForSubtype(
  subtype: TextSubtype,
  content: TextDocumentContent,
): TextDocumentContent | null {
  const normalized = normalizeTextDocumentContent(content);
  const candidate =
    subtype === 'rich' ? normalized : setTextDocumentBlockGap(normalized, undefined);
  return validateTextSubtypeContentStructure(subtype, candidate).length === 0 ? candidate : null;
}

type InlineTextStyleField =
  | 'color'
  | 'backgroundColor'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecorationLine';

function clearInlineStyleOverridesForField(
  content: TextDocumentContent,
  field: InlineTextStyleField,
): TextDocumentContent {
  return createTextDocumentContent(content.blocks.map((block) => {
    if (block.type === 'code-block') {
      return {
        ...block,
        children: block.children.map((line) => ({
          ...line,
          children: line.children.map((leaf) => clearLeafStyleOverride(leaf, field)),
        })),
      };
    }

    if (block.type === 'ul' || block.type === 'ol') {
      return {
        ...block,
        children: block.children.map((item) => ({
          ...item,
          children: clearInlineNodesStyleOverride(item.children, field),
        })),
      };
    }

    return {
      ...block,
      children: clearInlineNodesStyleOverride(block.children, field),
    };
  }), { blockGap: content.blockGap });
}

function clearInlineNodesStyleOverride(
  nodes: RichInlineNode[],
  field: InlineTextStyleField,
): RichInlineNode[] {
  return nodes.map((node) => {
    if (isRichTextLink(node)) {
      return {
        ...node,
        children: node.children.map((leaf) => clearLeafStyleOverride(leaf, field)),
      } satisfies RichTextLink;
    }
    return clearLeafStyleOverride(node, field);
  });
}

function clearLeafStyleOverride(
  leaf: RichTextLeaf,
  field: InlineTextStyleField,
): RichTextLeaf {
  const next = { ...leaf };
  if (field === 'color') {
    delete next.color;
  } else if (field === 'backgroundColor') {
    delete next.backgroundColor;
  } else if (field === 'fontFamily') {
    delete next.fontFamily;
  } else if (field === 'fontSize') {
    delete next.fontSize;
  } else if (field === 'fontWeight') {
    delete next.fontWeight;
    delete next.bold;
  } else if (field === 'fontStyle') {
    delete next.italic;
  } else if (field === 'textDecorationLine') {
    delete next.underline;
    delete next.strikethrough;
  }
  return next;
}

export function setTextNodeContentDoc(
  document: DocumentModel,
  nodeId: NodeId,
  field: EditorTextField,
  value: string,
): DocumentModel {
  let next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  if (field === 'name') {
    node.name = value;
    return next;
  }

  if (field === 'content' && isTextNode(node) && node.subtype === 'block') {
    const block = getSingleTextBlockContent(node.content);
    return setTextDocumentContentDoc(document, nodeId, createTextDocumentFromText(value, {
      type: block?.type ?? 'paragraph',
      direction: node.style?.direction ?? block?.direction ?? 'ltr',
      lineHeight: typeof block?.lineHeight === 'number' ? block.lineHeight : undefined,
      style: block?.style,
    }));
  }

  if (field === 'content' && isTextNode(node) && node.subtype === 'code') {
    const block = getSingleCodeBlockContent(node.content);
    const language = normalizeCodeLanguage(block?.language ?? node.code?.language ?? 'plaintext');
    return setTextDocumentContentDoc(document, nodeId, createTextDocumentFromCode(value, {
      direction: 'ltr',
      language,
      theme: block?.theme ?? node.code?.theme,
      highlightedHtml: highlightCode(value, language),
      style: block?.style,
    }));
  }

  if (field === 'codeLanguage' && isTextNode(node) && node.subtype === 'code') {
    const language = normalizeCodeLanguage(value);
    const codeBlock = getSingleCodeBlockContent(node.content);
    const codeText = getTextContent(node.content.blocks, { blockSeparator: '\n' });
    return setTextDocumentContentDoc(document, nodeId, createTextDocumentFromCode(codeText, {
      direction: 'ltr',
      language,
      theme: codeBlock?.theme ?? node.code?.theme,
      highlightedHtml: highlightCode(codeText, language),
      style: codeBlock?.style,
    }));
  }

  if (field === 'codeTheme' && isTextNode(node) && node.subtype === 'code') {
    const currentTheme = node.code?.theme ?? 'light';
    const nextTheme = value === 'dark' ? 'dark' : 'light';
    const currentSurface = CODE_THEME_SURFACE[currentTheme];
    const nextSurface = CODE_THEME_SURFACE[nextTheme];
    const currentBackground = node.style?.background;
    const currentColor = node.style?.color;

    node.code = { ...(node.code ?? { language: 'plaintext' }), theme: nextTheme };
    node.style ??= {};
    if (currentBackground == null || currentBackground === currentSurface.background) {
      node.style.background = nextSurface.background;
    }
    if (currentColor == null || currentColor === currentSurface.color) {
      node.style.color = nextSurface.color;
    }
    const codeBlock = getSingleCodeBlockContent(node.content);
    if (codeBlock) {
      node.content = createTextDocumentFromCode(getTextContent(node.content.blocks, { blockSeparator: '\n' }), {
        direction: 'ltr',
        language: codeBlock.language,
        theme: nextTheme,
        highlightedHtml: codeBlock.highlightedHtml,
        style: codeBlock.style,
      });
    }
    return next;
  }

  if (field === 'htmlTag' && isTextNode(node) && node.subtype === 'block') {
    const htmlTag =
      value === 'h1' ||
      value === 'h2' ||
      value === 'h3' ||
      value === 'h4' ||
      value === 'h5' ||
      value === 'h6' ||
      value === 'blockquote' ||
      value === 'div'
        ? value
        : 'p';
    const block = getSingleTextBlockContent(node.content);
    if (block) {
      return setTextDocumentContentDoc(document, nodeId, replaceTextDocumentBlocks(node.content, [{
        ...block,
        type: htmlTagToTextBlockType(htmlTag),
      }]));
    }
    return document;
  }

  if (field === 'lang' && isTextNode(node) && node.subtype === 'block') {
    node.lang = value.trim() || undefined;
    return next;
  }

  if (field === 'linkEnabled' && isTextNode(node) && node.subtype === 'block') {
    node.link = value === 'true' ? (node.link ?? createDefaultLinkExtension()) : undefined;
    return next;
  }

  if (field === 'linkEnabled' && isMediaNode(node) && node.subtype === 'image') {
    node.link = value === 'true' ? (node.link ?? createDefaultLinkExtension()) : undefined;
    return next;
  }

  if (field === 'linkType' && ((isTextNode(node) && node.subtype === 'block') || (isMediaNode(node) && node.subtype === 'image')) && node.link !== undefined) {
    const linkType = normalizeNavigationKind(value);
    node.link = { ...node.link, linkType };
    if (linkType !== 'page') {
      node.link = { ...node.link, targetPageId: undefined, pageAnchorId: undefined };
    }
    return next;
  }

  if (field === 'anchorTargetId' && ((isTextNode(node) && node.subtype === 'block') || (isMediaNode(node) && node.subtype === 'image')) && node.link !== undefined) {
    node.link = { ...node.link, anchorTargetId: value || undefined };
    return next;
  }

  if (field === 'href' && ((isTextNode(node) && node.subtype === 'block') || (isMediaNode(node) && node.subtype === 'image')) && node.link !== undefined) {
    node.link = { ...node.link, href: value };
    return next;
  }

  if (field === 'openInNewTab' && ((isTextNode(node) && node.subtype === 'block') || (isMediaNode(node) && node.subtype === 'image')) && node.link !== undefined) {
    node.link = { ...node.link, openInNewTab: value === 'true' ? true : undefined };
    return next;
  }

  if (field === 'targetPageId' && ((isTextNode(node) && node.subtype === 'block') || (isMediaNode(node) && node.subtype === 'image')) && node.link !== undefined) {
    node.link = { ...node.link, targetPageId: (value as PageId) || undefined };
    return next;
  }

  if (field === 'pageAnchorId' && ((isTextNode(node) && node.subtype === 'block') || (isMediaNode(node) && node.subtype === 'image')) && node.link !== undefined) {
    node.link = { ...node.link, pageAnchorId: value || undefined };
    return next;
  }

  if (field === 'src' && isMediaNode(node) && node.subtype === 'image') {
    node.src = value;
    return next;
  }

  if (field === 'alt' && isMediaNode(node) && node.subtype === 'image') {
    node.alt = value;
    return next;
  }

  if (field === 'color' && isTextNode(node)) {
    node.style ??= {};
    node.style.color = value || undefined;
    node.content = clearInlineStyleOverridesForField(node.content, field);
    return next;
  }

  if (field === 'backgroundColor' && isTextNode(node)) {
    node.style ??= {};
    node.style.background = value || undefined;
    node.content = clearInlineStyleOverridesForField(node.content, field);
    return next;
  }

  if (field === 'fontFamily' && isTextNode(node)) {
    node.style ??= {};
    const trimmedValue = extractPrimaryFontFamily(value);
    node.style.fontFamily = trimmedValue || undefined;
    node.content = clearInlineStyleOverridesForField(node.content, field);
    if (trimmedValue) {
      next = ensureDocumentFontFamilyByName(next, trimmedValue);
    }
    return next;
  }

  if (field === 'background' && isTextNode(node) && node.subtype === 'code') {
    node.style ??= {};
    node.style.background = value || undefined;
    return next;
  }

  if (field === 'background' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined && node.style?.background !== undefined) {
    node.style ??= {};
    node.style.background = value || undefined;
    return next;
  }

  if ((field === 'paddingBlock' || field === 'paddingInline') && isTextNode(node) && node.subtype === 'block' && node.link !== undefined && node.style?.background !== undefined) {
    node.style ??= {};
    node.style[field] = value ? parseSpacingValue(value) : undefined;
    return next;
  }

  if (field === 'fontSize' && isTextNode(node)) {
    node.style ??= {};
    node.style.fontSize = value ? parseFontSizeValue(value) : undefined;
    node.content = clearInlineStyleOverridesForField(node.content, field);
    return next;
  }

  if (field === 'fontWeight' && isTextNode(node)) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return document;
    }
    node.style ??= {};
    node.style.fontWeight = Math.min(900, Math.max(100, Math.round(parsed)));
    node.content = clearInlineStyleOverridesForField(node.content, field);
    return next;
  }

  if (field === 'fontStyle' && isTextNode(node)) {
    node.style ??= {};
    node.style.fontStyle = value === 'italic' ? 'italic' : 'normal';
    node.content = clearInlineStyleOverridesForField(node.content, field);
    return next;
  }

  if (
    field === 'textDecorationLine' &&
    isTextNode(node)
  ) {
    node.style ??= {};
    node.style.textDecorationLine = normalizeTextDecorationLine(value);
    node.content = clearInlineStyleOverridesForField(node.content, field);
    return next;
  }

  if (
    field === 'lineHeight' &&
    isTextNode(node)
  ) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      node.style ??= {};
      node.style.lineHeight = parsed;
      return next;
    }
    return document;
  }

  if (field === 'blockGap' && isTextNode(node) && node.subtype === 'rich') {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return document;
    }
    return setTextDocumentBlockGapDoc(document, nodeId, parsed);
  }

  if (field === 'direction' && isTextNode(node)) {
    node.style ??= {};
    node.style.direction = value === 'rtl' ? 'rtl' : 'ltr';
    return next;
  }

  if (field === 'textAlign' && isTextNode(node)) {
    node.style ??= {};
    node.style.textAlign = value === 'center' || value === 'right' ? value : 'left';
    return next;
  }

  if (field === 'textWrap' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
    node.style ??= {};
    node.style.textWrap = value === 'wrap' ? 'wrap' : 'single-line';
    return next;
  }

  if (
    isBorderColorField(field) &&
    (
      isMediaNode(node) ||
      (isTextNode(node) && node.subtype === 'code') ||
      (isTextNode(node) && node.subtype === 'block' && node.link !== undefined && node.style?.background !== undefined)
    )
  ) {
    node.style ??= {};
    node.style[field] = value || undefined;
    return next;
  }

  if (
    isBorderWidthField(field) &&
    (
      isMediaNode(node) ||
      (isTextNode(node) && node.subtype === 'code') ||
      (isTextNode(node) && node.subtype === 'block' && node.link !== undefined && node.style?.background !== undefined)
    )
  ) {
    node.style ??= {};
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return next;
  }

  if (
    isBorderRadiusField(field) &&
    (
      isMediaNode(node) ||
      (isTextNode(node) && node.subtype === 'code') ||
      (isTextNode(node) && node.subtype === 'block' && node.link !== undefined && node.style?.background !== undefined)
    )
  ) {
    node.style ??= {};
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return next;
  }

  if (isShadowStyleField(field) && isLeafNode(node)) {
    node.style ??= {};
    if (field === 'shadowColor') {
      node.style.shadowColor = value || undefined;
      return next;
    }
    const parsed = parseShadowLength(value);
    if (parsed == null) {
      return document;
    }
    node.style[field] = parsed;
    return next;
  }

  return document;
}

export function setRichTextContentDoc(
  document: DocumentModel,
  nodeId: NodeId,
  content: RichContent,
): DocumentModel {
  return setTextDocumentContentDoc(
    document,
    nodeId,
    createTextDocumentContent(normalizeRichContent(content), {
      blockGap: isTextNode(document.nodes[nodeId]) ? document.nodes[nodeId].content.blockGap : undefined,
    }),
  );
}

export function setTextDocumentContentDoc(
  document: DocumentModel,
  nodeId: NodeId,
  content: TextDocumentContent,
  options: SetTextDocumentContentOptions = {},
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node)) {
    return document;
  }

  const normalized = normalizeTextDocumentContentForSubtype(node.subtype, content);
  if (!normalized) {
    return document;
  }

  node.content = normalized;
  if (options.clearBlockNodeLink === true && node.subtype === 'block') {
    node.link = undefined;
  }
  syncTransitionalTextNodeFields(node);
  return normalizeTextNodeDoc(next, nodeId);
}

export function setTextDocumentBlockGapDoc(
  document: DocumentModel,
  nodeId: NodeId,
  blockGap: number | undefined,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }

  node.content = setTextDocumentBlockGap(node.content, blockGap);
  syncTransitionalTextNodeFields(node);
  return next;
}

export function setListContentDoc(
  document: DocumentModel,
  nodeId: NodeId,
  content: ListContent,
): DocumentModel {
  const node = document.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'list') {
    return document;
  }
  return setTextDocumentContentDoc(document, nodeId, createTextDocumentContent([
    listContentToRichListBlock(normalizeListContent(content), { direction: node.style?.direction ?? 'ltr' }),
  ]));
}

export function setCodeBlockLanguageDoc(
  document: DocumentModel,
  nodeId: NodeId,
  language: string,
): DocumentModel {
  return setTextNodeContentDoc(document, nodeId, 'codeLanguage', language);
}

export function setCodeBlockThemeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  theme: string,
): DocumentModel {
  return setTextNodeContentDoc(document, nodeId, 'codeTheme', theme);
}

export function setTextDirectionDoc(
  document: DocumentModel,
  nodeId: NodeId,
  direction: 'ltr' | 'rtl',
): DocumentModel {
  return setTextNodeContentDoc(document, nodeId, 'direction', direction);
}

export function serializeTextNodeMarkdownDoc(
  document: DocumentModel,
  nodeId: NodeId,
): string {
  const node = document.nodes[nodeId];
  if (!node || !isTextNode(node)) {
    return '';
  }

  return serializeTextNodeToMarkdown(node, document);
}

export function applyMarkdownToTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  markdown: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node)) {
    return document;
  }

  const parsed = parseMarkdownForTextSubtype(markdown, node.subtype);
  if (node.subtype === 'block') {
    const block = getSingleTextBlockContent(parsed.content);
    if (block) {
      node.content = replaceTextDocumentBlocks(normalizeTextDocumentContent(parsed.content), [{
        ...block,
        type: htmlTagToTextBlockType(parsed.htmlTag ?? 'p'),
      }]);
    } else {
      node.content = normalizeTextDocumentContent(parsed.content);
    }
  } else if (node.subtype === 'code' && parsed.code) {
    const codeText = getTextContent(parsed.content.blocks, { blockSeparator: '\n' });
    node.content = createTextDocumentFromCode(codeText, {
      direction: 'ltr',
      language: parsed.code.language,
      theme: parsed.code.theme,
      highlightedHtml: parsed.code.highlightedHtml ?? highlightCode(codeText, parsed.code.language),
      style: getSingleCodeBlockContent(parsed.content)?.style,
    });
  } else {
    node.content = normalizeTextDocumentContent(parsed.content);
  }

  return normalizeTextNodeDoc(next, nodeId);
}

export function normalizeTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node)) {
    return document;
  }

  if (node.subtype === 'block') {
    node.content = normalizeTextDocumentContent(node.content);
    const block = getSingleTextBlockContent(node.content);
    if (block) {
      const direction =
        node.style?.direction === 'rtl' ? 'rtl' : node.style?.direction === 'ltr' ? 'ltr' : block.direction;
      node.content = replaceTextDocumentBlocks(node.content, [{
        ...block,
        direction,
      }]);
      node.htmlTag = textBlockTypeToHtmlTag(block.type);
    } else {
      node.htmlTag = 'p';
    }
    if (node.style?.direction !== undefined) {
      node.style.direction = node.style.direction === 'rtl' ? 'rtl' : 'ltr';
    }
    delete node.code;
    return next;
  }

  if (node.subtype === 'code') {
    const codeBlock = getSingleCodeBlockContent(node.content);
    const language = normalizeCodeLanguage(codeBlock?.language ?? node.code?.language ?? 'plaintext');
    const theme = (codeBlock?.theme ?? node.code?.theme) === 'dark' ? 'dark' : 'light';
    const content = getTextContent(node.content.blocks, { blockSeparator: '\n' });
    node.content = createTextDocumentFromCode(content, {
      direction: 'ltr',
      language,
      theme,
      highlightedHtml: highlightCode(content, language),
      style: codeBlock?.style,
    });
    node.code = {
      ...(node.code ?? {}),
      language,
      theme,
      highlightedHtml: highlightCode(content, language),
    };
    node.style ??= {};
    node.style.direction = 'ltr';
    delete node.htmlTag;
    return next;
  }

  if (node.subtype === 'rich') {
    node.content = normalizeTextDocumentContent(node.content);
    delete node.htmlTag;
    delete node.code;
    return next;
  }

  node.content = normalizeTextDocumentContent(node.content);
  delete node.htmlTag;
  delete node.code;
  return next;
}

export function setRichBlockTypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  blockIndex: number,
  blockType: RichTextBlockType,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }

  const content = normalizeRichContent(getTextDocumentBlocks(node.content));
  const block = content[blockIndex];
  if (!block) {
    return document;
  }

  content[blockIndex] = block.type === 'code-block' || block.type === 'ul' || block.type === 'ol'
    ? createRichTextBlock(blockType, [createRichTextLeaf(getTextContent([block]))], { direction: block.direction })
    : { ...block, type: blockType };
  node.content = replaceTextDocumentBlocks(node.content, content);
  return next;
}

export function setRichListKindDoc(
  document: DocumentModel,
  _nodeId: NodeId,
  _blockIndex: number,
  _listKind: 'ul' | 'ol',
): DocumentModel {
  return document;
}

export function setRichListMarkerStyleDoc(
  document: DocumentModel,
  _nodeId: NodeId,
  _blockIndex: number,
  _markerStyle: string,
): DocumentModel {
  return document;
}

export function setRichBlockLineHeightDoc(
  document: DocumentModel,
  nodeId: NodeId,
  blockIndex: number,
  lineHeight: number,
): DocumentModel {
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return document;
  }

  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }

  const content = normalizeRichContent(getTextDocumentBlocks(node.content));
  const block = content[blockIndex];
  if (!block || block.type === 'code-block' || block.type === 'ul' || block.type === 'ol') {
    return document;
  }

  content[blockIndex] = { ...block, lineHeight };
  node.content = replaceTextDocumentBlocks(node.content, content);
  return next;
}

export function setRichBlockSpacingDoc(
  document: DocumentModel,
  nodeId: NodeId,
  blockSpacing: number,
): DocumentModel {
  if (!Number.isFinite(blockSpacing) || blockSpacing < 0) {
    return document;
  }

  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }

  return setTextDocumentBlockGapDoc(next, nodeId, blockSpacing);
}


function normalizeTextDecorationLine(
  value: string,
): 'none' | 'underline' | 'line-through' | 'underline line-through' {
  switch (value) {
    case 'underline':
    case 'line-through':
    case 'underline line-through':
      return value;
    default:
      return 'none';
  }
}

function parseShadowLength(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBorderColorField(field: EditorTextField): field is BorderColorField {
  return (
    field === 'borderColor' ||
    field === 'borderTopColor' ||
    field === 'borderRightColor' ||
    field === 'borderBottomColor' ||
    field === 'borderLeftColor'
  );
}

function isBorderWidthField(field: EditorTextField): field is BorderWidthField {
  return (
    field === 'borderWidth' ||
    field === 'borderTopWidth' ||
    field === 'borderRightWidth' ||
    field === 'borderBottomWidth' ||
    field === 'borderLeftWidth'
  );
}

function isBorderRadiusField(field: EditorTextField): field is BorderRadiusField {
  return (
    field === 'borderRadius' ||
    field === 'borderTopLeftRadius' ||
    field === 'borderTopRightRadius' ||
    field === 'borderBottomRightRadius' ||
    field === 'borderBottomLeftRadius'
  );
}

function isShadowStyleField(field: EditorTextField): field is ShadowStyleField {
  return (
    field === 'shadowColor' ||
    field === 'shadowBlur' ||
    field === 'shadowSpread' ||
    field === 'shadowOffsetX' ||
    field === 'shadowOffsetY'
  );
}
