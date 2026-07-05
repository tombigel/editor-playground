import { ensureDocumentFontFamilyByName, extractPrimaryFontFamily } from '../../fonts';
import { createDefaultLinkExtension } from '../../model/defaults';
import { normalizeNavigationKind } from '../../model/links';
import { normalizeListContent } from '../../model/listContent';
import {
  createRichListBlock,
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
  normalizeCodeTabSize,
  normalizeCodeTheme,
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
  DocumentNode,
  EditorTextField,
  ListContent,
  MediaNode,
  NodeId,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
  ShadowStyleField,
  SvgSettingField,
  TextDocumentContent,
  TextNode,
  TextSubtype,
} from '../../model/types';
import { isLeafNode, isMediaNode, isTextNode } from '../../model/types';
import { isValidViewBox } from '../../model/svg';
import { parseFontSizeValue, parseSpacingValue, parseUnitValue } from '../../model/units';
import { highlightCode, normalizeCodeLanguage } from '../../render/codeHighlight';
import { parseMarkdownForTextSubtype, serializeTextNodeToMarkdown } from '../textMarkdown';
import { cloneDocument } from './shared';

export type SetTextDocumentContentOptions = {
  clearBlockNodeLink?: boolean;
};

/** Videos are always interactive players and can never be links (a11y). */
function isLinkableMediaNode(node: DocumentNode): node is MediaNode {
  return isMediaNode(node) && node.subtype !== 'video';
}

const DEFAULT_SVG_MONOCHROME_FILL = '#16202a';
const DEFAULT_SVG_STROKE_COLOR = '#16202a';
const DEFAULT_SVG_STROKE_WIDTH = 1;

const SVG_SETTING_FIELDS: readonly SvgSettingField[] = [
  'svgHidden',
  'svgTitle',
  'svgDesc',
  'svgMonochrome',
  'svgFill',
  'svgStrokeEnabled',
  'svgStrokeColor',
  'svgStrokeWidth',
  'svgViewBox',
];

function isSvgSettingField(field: EditorTextField): field is SvgSettingField {
  return (SVG_SETTING_FIELDS as readonly string[]).includes(field);
}

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

type CodeThemeValue = ReturnType<typeof normalizeCodeTheme>;

function isCodeThemeSurfaceValue(value: string | undefined, key: 'background' | 'color'): boolean {
  return value === CODE_THEME_SURFACE.light[key] || value === CODE_THEME_SURFACE.dark[key];
}

function applyCodeThemePresentation(
  node: TextNode,
  currentTheme: CodeThemeValue,
  nextTheme: CodeThemeValue,
): void {
  node.style ??= {};
  const currentBackground = node.style.background;
  const currentColor = node.style.color;
  const currentSurface = currentTheme === 'auto' ? undefined : CODE_THEME_SURFACE[currentTheme];

  if (nextTheme === 'auto') {
    if (currentBackground == null || currentBackground === currentSurface?.background || isCodeThemeSurfaceValue(currentBackground, 'background')) {
      node.style.background = undefined;
    }
    if (currentColor == null || currentColor === currentSurface?.color || isCodeThemeSurfaceValue(currentColor, 'color')) {
      node.style.color = undefined;
    }
    return;
  }

  const nextSurface = CODE_THEME_SURFACE[nextTheme];
  if (currentBackground == null || currentBackground === currentSurface?.background || isCodeThemeSurfaceValue(currentBackground, 'background')) {
    node.style.background = nextSurface.background;
  }
  if (currentColor == null || currentColor === currentSurface?.color || isCodeThemeSurfaceValue(currentColor, 'color')) {
    node.style.color = nextSurface.color;
  }
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
    const codeBlock = getSingleCodeBlockContent(node.content);
    const currentTheme = normalizeCodeTheme(codeBlock?.theme ?? node.code?.theme);
    const nextTheme = normalizeCodeTheme(value);
    node.code = { ...(node.code ?? { language: 'plaintext' }), theme: nextTheme };
    applyCodeThemePresentation(node, currentTheme, nextTheme);
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

  if (field === 'tabSize' && isTextNode(node) && node.subtype === 'code') {
    const tabSize = normalizeCodeTabSize(Number.parseFloat(value));
    node.style ??= {};
    node.style.tabSize = tabSize;
    const codeBlock = getSingleCodeBlockContent(node.content);
    if (codeBlock) {
      const style = { ...(codeBlock.style ?? {}) };
      if (tabSize === undefined) {
        delete style.tabSize;
      } else {
        style.tabSize = tabSize;
      }
      node.content = createTextDocumentFromCode(getTextContent(node.content.blocks, { blockSeparator: '\n' }), {
        direction: 'ltr',
        language: codeBlock.language,
        theme: codeBlock.theme ?? node.code?.theme,
        highlightedHtml: codeBlock.highlightedHtml,
        style: Object.keys(style).length > 0 ? style : undefined,
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

  if (field === 'linkEnabled' && isLinkableMediaNode(node)) {
    node.link = value === 'true' ? (node.link ?? createDefaultLinkExtension()) : undefined;
    return next;
  }

  if (field === 'linkType' && ((isTextNode(node) && node.subtype === 'block') || isLinkableMediaNode(node)) && node.link !== undefined) {
    const linkType = normalizeNavigationKind(value);
    node.link = { ...node.link, linkType };
    if (linkType !== 'page') {
      node.link = { ...node.link, targetPageId: undefined, pageAnchorId: undefined };
    }
    return next;
  }

  if (field === 'anchorTargetId' && ((isTextNode(node) && node.subtype === 'block') || isLinkableMediaNode(node)) && node.link !== undefined) {
    node.link = { ...node.link, anchorTargetId: value || undefined };
    return next;
  }

  if (field === 'href' && ((isTextNode(node) && node.subtype === 'block') || isLinkableMediaNode(node)) && node.link !== undefined) {
    node.link = { ...node.link, href: value };
    return next;
  }

  if (field === 'openInNewTab' && ((isTextNode(node) && node.subtype === 'block') || isLinkableMediaNode(node)) && node.link !== undefined) {
    node.link = { ...node.link, openInNewTab: value === 'true' ? true : undefined };
    return next;
  }

  if (field === 'targetPageId' && ((isTextNode(node) && node.subtype === 'block') || isLinkableMediaNode(node)) && node.link !== undefined) {
    node.link = { ...node.link, targetPageId: (value as PageId) || undefined };
    return next;
  }

  if (field === 'pageAnchorId' && ((isTextNode(node) && node.subtype === 'block') || isLinkableMediaNode(node)) && node.link !== undefined) {
    node.link = { ...node.link, pageAnchorId: value || undefined };
    return next;
  }

  if (field === 'src' && isMediaNode(node)) {
    node.src = value;
    return next;
  }

  if (field === 'alt' && isMediaNode(node)) {
    node.alt = value;
    return next;
  }

  if ((field === 'videoAutoplay' || field === 'videoMuted' || field === 'videoControls' || field === 'videoLoop') && isMediaNode(node) && node.subtype === 'video') {
    const flag = field === 'videoAutoplay' ? 'autoplay' : field === 'videoMuted' ? 'muted' : field === 'videoControls' ? 'controls' : 'loop';
    node.video = { ...node.video, [flag]: value === 'true' };
    return next;
  }

  if (field === 'videoPoster' && isMediaNode(node) && node.subtype === 'video') {
    node.video = { ...node.video, poster: value.trim() || undefined };
    return next;
  }

  if (field === 'videoPreload' && isMediaNode(node) && node.subtype === 'video') {
    node.video = {
      ...node.video,
      preload: value === 'metadata' || value === 'none' ? value : 'auto',
    };
    return next;
  }

  if (isSvgSettingField(field) && isMediaNode(node) && node.subtype === 'svg' && node.svg) {
    const svg = node.svg;
    if (field === 'svgHidden') {
      node.svg = { ...svg, a11y: { ...svg.a11y, hidden: value === 'true' } };
    } else if (field === 'svgTitle') {
      node.svg = { ...svg, a11y: { ...svg.a11y, title: value.trim() || undefined } };
    } else if (field === 'svgDesc') {
      node.svg = { ...svg, a11y: { ...svg.a11y, desc: value.trim() || undefined } };
    } else if (field === 'svgMonochrome') {
      // Enabling seeds a real fill color so the control never shows a value
      // that is not backed by model data.
      const enabled = value === 'true';
      node.svg = {
        ...svg,
        monochrome: { enabled, fill: enabled ? (svg.monochrome?.fill ?? DEFAULT_SVG_MONOCHROME_FILL) : svg.monochrome?.fill },
      };
    } else if (field === 'svgFill') {
      node.svg = { ...svg, monochrome: { enabled: svg.monochrome?.enabled ?? true, fill: value || undefined } };
    } else if (field === 'svgStrokeEnabled') {
      const enabled = value === 'true';
      node.svg = {
        ...svg,
        stroke: {
          enabled,
          color: enabled ? (svg.stroke?.color ?? DEFAULT_SVG_STROKE_COLOR) : svg.stroke?.color,
          width: enabled ? (svg.stroke?.width ?? DEFAULT_SVG_STROKE_WIDTH) : svg.stroke?.width,
        },
      };
    } else if (field === 'svgStrokeColor') {
      node.svg = { ...svg, stroke: { enabled: svg.stroke?.enabled ?? true, ...svg.stroke, color: value || undefined } };
    } else if (field === 'svgStrokeWidth') {
      const width = Number.parseFloat(value);
      node.svg = {
        ...svg,
        stroke: {
          enabled: svg.stroke?.enabled ?? true,
          ...svg.stroke,
          width: Number.isFinite(width) && width >= 0 ? width : undefined,
        },
      };
    } else if (field === 'svgViewBox') {
      const trimmed = value.trim();
      if (trimmed && !isValidViewBox(trimmed)) {
        return document;
      }
      node.svg = { ...svg, viewBox: trimmed || undefined };
    }
    return next;
  }

  if (field === 'objectFit' && isMediaNode(node)) {
    node.style ??= {};
    node.style.objectFit =
      value === 'cover' || value === 'contain' || value === 'fill' || value === 'none' || value === 'scale-down'
        ? value
        : undefined;
    return next;
  }

  if (field === 'objectPosition' && isMediaNode(node)) {
    node.style ??= {};
    node.style.objectPosition = value.trim() || undefined;
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

  if (field === 'textWrap' && isTextNode(node) && node.subtype === 'code') {
    const textWrap = value === 'single-line' ? 'single-line' : 'wrap';
    node.style ??= {};
    node.style.textWrap = textWrap;
    const codeBlock = getSingleCodeBlockContent(node.content);
    if (codeBlock) {
      node.content = createTextDocumentFromCode(getTextContent(node.content.blocks, { blockSeparator: '\n' }), {
        direction: 'ltr',
        language: codeBlock.language,
        theme: codeBlock.theme ?? node.code?.theme,
        highlightedHtml: codeBlock.highlightedHtml,
        style: {
          ...(codeBlock.style ?? {}),
          textWrap,
        },
      });
    }
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

export function setCodeBlockTabSizeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  tabSize: number,
): DocumentModel {
  return setTextNodeContentDoc(document, nodeId, 'tabSize', String(tabSize));
}

export function setCodeBlockWrapDoc(
  document: DocumentModel,
  nodeId: NodeId,
  wrap: boolean,
): DocumentModel {
  return setTextNodeContentDoc(document, nodeId, 'textWrap', wrap ? 'wrap' : 'single-line');
}

export function resetCodeBlockStyleDoc(
  document: DocumentModel,
  nodeId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'code') {
    return document;
  }

  const codeBlock = getSingleCodeBlockContent(node.content);
  const language = normalizeCodeLanguage(codeBlock?.language ?? node.code?.language ?? 'plaintext');
  const codeText = getTextContent(node.content.blocks, { blockSeparator: '\n' });
  const highlightedHtml = highlightCode(codeText, language);
  node.content = createTextDocumentFromCode(codeText, {
    direction: 'ltr',
    language,
    theme: 'auto',
    highlightedHtml,
  });
  node.code = { language, theme: 'auto', highlightedHtml };
  node.style = {
    direction: 'ltr',
    textAlign: 'left',
  };
  delete node.htmlTag;
  return next;
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
    const theme = normalizeCodeTheme(codeBlock?.theme ?? node.code?.theme);
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
  nodeId: NodeId,
  blockIndex: number,
  listKind: 'ul' | 'ol',
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }

  const content = normalizeRichContent(getTextDocumentBlocks(node.content));
  const block = content[blockIndex];
  if (!block || (block.type !== 'ul' && block.type !== 'ol')) {
    return document;
  }

  content[blockIndex] = createRichListBlock(listKind, structuredClone(block.children), {
    direction: block.direction,
    style: block.style,
    standalone: block.standalone,
    markerStyle: block.markerStyle,
    ...(listKind === 'ol' && block.type === 'ol' ? { start: block.start } : {}),
  });
  node.content = replaceTextDocumentBlocks(node.content, content);
  return next;
}

export function setRichListMarkerStyleDoc(
  document: DocumentModel,
  nodeId: NodeId,
  blockIndex: number,
  markerStyle: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }

  const content = normalizeRichContent(getTextDocumentBlocks(node.content));
  const block = content[blockIndex];
  if (!block || (block.type !== 'ul' && block.type !== 'ol')) {
    return document;
  }

  content[blockIndex] = createRichListBlock(block.type, structuredClone(block.children), {
    direction: block.direction,
    style: block.style,
    standalone: block.standalone,
    markerStyle,
    ...(block.type === 'ol' ? { start: block.start } : {}),
  }) satisfies RichListBlock;
  node.content = replaceTextDocumentBlocks(node.content, content);
  return next;
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
