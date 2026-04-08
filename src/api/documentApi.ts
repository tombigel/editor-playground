import {
  SECTION_TEMPLATES,
  createContainerNode,
  createInitialDocument,
  createMediaNode,
  createSectionFromTemplate,
  createTextNode,
  syncIdCountersWithDocument,
  type SectionTemplateId,
} from '../model/defaults';
import {
  addDocumentFontFamily,
  ensureDocumentFontFamilyByName,
  getDocumentFontLibrary,
  getFontUsage,
  isFontFamilyUsed,
  listDocumentFonts,
  normalizeDocumentFontState,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  toggleDocumentFontFavorite,
} from '../fonts';
import { CODE_THEME_SURFACE } from '../model/textNodeDefaults';
import { getLinkHref, normalizeNavigationKind, shouldOpenNavigationInNewTab } from '../model/links';
import { getChildren, getNode } from '../model/selectors';
import { setPageAsHome as setPageAsHomeDoc } from './pageApi';
import {
  convertTextNodeDoc as convertTextNodeDocHelper,
  switchTextSubtypeDoc as switchTextSubtypeDocHelper,
  type TextConversionOptions,
} from './textConversion';
import {
  mergeTextNodesToRichDoc as mergeTextNodesToRichDocHelper,
  splitRichTextNodeDoc as splitRichTextNodeDocHelper,
  type MergeTextNodesOptions,
} from './textMerge';
import {
  getTopLevelWrapperVisibilityState,
  normalizeTopLevelWrapperTargetPageIds,
  type TopLevelWrapperVisibilityMode as TopLevelWrapperVisibilityModeModel,
  type TopLevelWrapperVisibilityState as TopLevelWrapperVisibilityStateModel,
} from '../model/topLevelWrapperVisibility';
import { normalizeListContent } from '../model/listContent';
import { normalizeRichContent } from '../model/richContent';
import type { PageId } from '../model/types/site';
import type {
  BorderColorField,
  BorderRadiusField,
  BorderWidthField,
  ComputedWrapperStickyState,
  ContainerNode,
  ContainerSubtype,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  ListContent,
  MediaSubtype,
  RichContent,
  RichTextBlockType,
  ShadowStyleField,
  NodeTextField,
  NodeId,
  StickyDefinition,
  TextSubtype,
  WrapperStyleField,
} from '../model/types';
import { isContainerNode, isLeafNode, isMediaNode, isTextNode } from '../model/types';
import type { StickyGeometrySnapshot, StickyLayoutState } from '../sticky/resolve';
import { resolveStickyLayout, resolveWrapperStickyState } from '../sticky/resolve';
import { formatValue, parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue, resolveUnitValuePx } from '../model/units';
import { validateDocument, validateLinks } from '../model/validation';
import { highlightCode, normalizeCodeLanguage } from '../render/codeHighlight';
import type { DocumentCommand } from './types/index';

export type NodeOrderAction = 'back' | 'forward' | 'sendToBack' | 'bringToFront';
export type TopLevelWrapperPlacement = 'currentPage' | 'global';
export type TopLevelWrapperVisibilityMode = TopLevelWrapperVisibilityModeModel;
export type TopLevelWrapperVisibilityState = TopLevelWrapperVisibilityStateModel;
export type TopLevelWrapperVisibility = TopLevelWrapperVisibilityModeModel;

export type {
  ComputedWrapperStickyState,
  ContainerNode,
  ContainerSubtype,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  ListContent,
  MediaSubtype,
  NodeTextField,
  NodeId,
  StickyGeometrySnapshot,
  StickyLayoutState,
  StickyDefinition,
  TextSubtype,
  WrapperStyleField,
};
export type { DocumentCommand } from './types/index';
export type { TextConversionMode, TextConversionOptions } from './textConversion';
export type { MergeTextNodesOptions } from './textMerge';

export {
  SECTION_TEMPLATES,
  addDocumentFontFamily,
  createInitialDocument,
  createSectionFromTemplate,
  formatValue,
  getDocumentFontLibrary,
  getFontUsage,
  getChildren,
  getLinkHref,
  getNode,
  isFontFamilyUsed,
  listDocumentFonts,
  parseHeightValue,
  parseFontSizeValue,
  parseUnitValue,
  parseSpacingValue,
  parseWidthValue,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  resolveStickyLayout,
  resolveWrapperStickyState,
  resolveUnitValuePx,
  setPageAsHomeDoc,
  shouldOpenNavigationInNewTab,
  toggleDocumentFontFavorite,
  validateDocument,
  validateLinks,
  getTopLevelWrapperVisibilityState,
};

export function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
    fontLibrary: structuredClone(document.fontLibrary),
    ...(document.animationSettings !== undefined ? { animationSettings: structuredClone(document.animationSettings) } : {}),
    ...(document.pages !== undefined ? { pages: structuredClone(document.pages) } : {}),
    ...(document.siteSettings !== undefined ? { siteSettings: structuredClone(document.siteSettings) } : {}),
    ...(document.sharedRegionIds !== undefined ? { sharedRegionIds: [...document.sharedRegionIds] } : {}),
  };
}

export function applyDocumentCommands(document: DocumentModel, commands: DocumentCommand[]): DocumentModel {
  return commands.reduce((next, command) => {
    switch (command.type) {
      case 'setRect':
        return setNodeRect(next, command.nodeId, command.field, command.value);
      case 'setSticky':
        return setNodeSticky(next, command.nodeId, command.patch);
      case 'setText':
        return setTextNodeContentDoc(next, command.nodeId, command.field, command.value);
      default:
        return next;
    }
  }, cloneDocument(document));
}

export function setNodeRect(
  document: DocumentModel,
  nodeId: NodeId,
  field: 'x' | 'y' | 'width' | 'height',
  value: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  if (field === 'x') {
    node.rect.x.base = parseUnitValue(value);
  } else if (field === 'y') {
    node.rect.y.base = parseUnitValue(value);
  } else if (field === 'width') {
    node.rect.width.base = parseWidthValue(value);
  } else {
    node.rect.height.base = parseHeightValue(value);
  }

  return next;
}

export function setNodeSticky(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  node.sticky = {
    enabled: false,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'auto',
    duration: parseUnitValue('50vh'),
    durationTop: parseUnitValue('50vh'),
    durationBottom: parseUnitValue('50vh'),
    ...node.sticky,
    ...patch,
  };

  return next;
}

export function setSiteNodeStickyElevation(
  document: DocumentModel,
  enabled: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const site = next.nodes[next.rootId];
  if (site.contentType !== 'site') {
    return document;
  }
  site.stickyElevation = enabled;
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
    node.content = value;
    return next;
  }

  if (field === 'content' && isTextNode(node) && node.subtype === 'code') {
    const language = normalizeCodeLanguage(node.code?.language ?? 'plaintext');
    const highlightedHtml = highlightCode(value, language);
    node.content = value;
    node.code = { ...(node.code ?? { language }), highlightedHtml };
    return next;
  }

  if (field === 'codeLanguage' && isTextNode(node) && node.subtype === 'code') {
    const language = normalizeCodeLanguage(value);
    const highlightedHtml = highlightCode(node.content as string, language);
    node.code = { ...(node.code ?? {}), language, highlightedHtml };
    return next;
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
    return next;
  }

  if (field === 'htmlTag' && isTextNode(node) && node.subtype === 'block') {
    node.htmlTag =
      value === 'h1' ||
      value === 'h2' ||
      value === 'h3' ||
      value === 'h4' ||
      value === 'h5' ||
      value === 'h6' ||
      value === 'blockquote'
        ? value
        : 'p';
    return next;
  }

  if (field === 'lang' && isTextNode(node) && node.subtype === 'block') {
    node.lang = value.trim() || undefined;
    return next;
  }

  if (field === 'linkType' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
    const linkType = normalizeNavigationKind(value);
    node.link = { ...node.link, linkType };
    if (linkType !== 'page') {
      node.link = { ...node.link, targetPageId: undefined, pageAnchorId: undefined };
    }
    return next;
  }

  if (field === 'anchorTargetId' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
    node.link = { ...node.link, anchorTargetId: value || undefined };
    return next;
  }

  if (field === 'href' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
    node.link = { ...node.link, href: value };
    return next;
  }

  if (field === 'openInNewTab' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
    node.link = { ...node.link, openInNewTab: value === 'true' ? true : undefined };
    return next;
  }

  if (field === 'targetPageId' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
    node.link = { ...node.link, targetPageId: (value as PageId) || undefined };
    return next;
  }

  if (field === 'pageAnchorId' && isTextNode(node) && node.subtype === 'block' && node.link !== undefined) {
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
    return next;
  }

  if (field === 'fontFamily' && isTextNode(node)) {
    node.style ??= {};
    const trimmedValue = value.trim();
    node.style.fontFamily = trimmedValue || undefined;
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
    return next;
  }

  if (field === 'fontWeight' && isTextNode(node)) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return document;
    }
    node.style ??= {};
    node.style.fontWeight = Math.min(900, Math.max(100, Math.round(parsed)));
    return next;
  }

  if (field === 'fontStyle' && isTextNode(node)) {
    node.style ??= {};
    node.style.fontStyle = value === 'italic' ? 'italic' : 'normal';
    return next;
  }

  if (
    field === 'textDecorationLine' &&
    isTextNode(node)
  ) {
    node.style ??= {};
    node.style.textDecorationLine = normalizeTextDecorationLine(value);
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
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'rich') {
    return document;
  }
  node.content = normalizeRichContent(content);
  return next;
}

export function setListContentDoc(
  document: DocumentModel,
  nodeId: NodeId,
  content: ListContent,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'list') {
    return document;
  }
  node.content = normalizeListContent(content);
  return next;
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
    if (
      node.htmlTag !== undefined &&
      node.htmlTag !== 'p' &&
      node.htmlTag !== 'blockquote' &&
      node.htmlTag !== 'h1' &&
      node.htmlTag !== 'h2' &&
      node.htmlTag !== 'h3' &&
      node.htmlTag !== 'h4' &&
      node.htmlTag !== 'h5' &&
      node.htmlTag !== 'h6'
    ) {
      node.htmlTag = 'p';
    }
    if (node.style?.direction !== undefined) {
      node.style.direction = node.style.direction === 'rtl' ? 'rtl' : 'ltr';
    }
    return next;
  }

  if (node.subtype === 'code') {
    const language = normalizeCodeLanguage(node.code?.language ?? 'plaintext');
    const theme = node.code?.theme === 'dark' ? 'dark' : 'light';
    const content = typeof node.content === 'string' ? node.content : '';
    node.content = content;
    node.code = {
      ...(node.code ?? {}),
      language,
      theme,
      highlightedHtml: highlightCode(content, language),
    };
    node.style ??= {};
    node.style.direction = 'ltr';
    return next;
  }

  if (node.subtype === 'rich') {
    node.content = normalizeRichContent(node.content);
    return next;
  }

  node.content = normalizeListContent(node.content as ListContent);
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

  const content = normalizeRichContent(node.content);
  const block = content[blockIndex];
  if (!block) {
    return document;
  }

  block.type = blockType;
  node.content = content;
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
  _nodeId: NodeId,
  _blockIndex: number,
  _lineHeight: number,
): DocumentModel {
  return document;
}

export function setRichBlockSpacingDoc(
  document: DocumentModel,
  _nodeId: NodeId,
  _blockSpacing: number,
): DocumentModel {
  return document;
}

export function setNodeVisibilityDoc(
  document: DocumentModel,
  nodeId: NodeId,
  visible: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site' || node.visible === visible) {
    return document;
  }

  node.visible = visible;
  return next;
}

export function setPageTopLevelWrapperPlacement(
  document: DocumentModel,
  pageId: PageId,
  nodeId: NodeId,
  placement: TopLevelWrapperPlacement,
): DocumentModel {
  return setTopLevelWrapperVisibility(
    document,
    pageId,
    nodeId,
    placement === 'global' ? 'allPages' : 'currentPage',
  );
}

export function setTopLevelWrapperVisibility(
  document: DocumentModel,
  pageId: PageId,
  nodeId: NodeId,
  visibility: TopLevelWrapperVisibility,
  pageIds: PageId[] = [],
): DocumentModel {
  const root = document.nodes[document.rootId];
  const page = document.pages?.find((entry) => entry.id === pageId);
  const node = document.nodes[nodeId];
  if (!root || root.contentType !== 'site' || !page || !node || !isContainerNode(node)) {
    return document;
  }
  if (node.parentId !== document.rootId || !isEligibleTopLevelWrapper(node.subtype)) {
    return document;
  }

  const next = cloneDocument(document);
  const pages = structuredClone(document.pages ?? []);
  const sharedRegionIds = new Set(document.sharedRegionIds ?? []);
  const targetPage = pages.find((entry) => entry.id === pageId);
  const nextNode = next.nodes[nodeId];

  if (!targetPage || !isContainerNode(nextNode)) {
    return document;
  }

  let changed = false;
  const hadPageTargets = nextNode.pageTargetIds !== undefined;
  const removeFromAllPages = () => {
    for (const candidate of pages) {
      const originalLength = candidate.sectionIds.length;
      candidate.sectionIds = candidate.sectionIds.filter((sectionId) => sectionId !== nodeId);
      if (candidate.sectionIds.length !== originalLength) {
        changed = true;
      }
    }
  };

  if (visibility === 'hidden') {
    if (nextNode.visible !== false) {
      nextNode.visible = false;
      changed = true;
    }
  } else {
    if (nextNode.visible !== true) {
      nextNode.visible = true;
      changed = true;
    }

    if (visibility === 'currentPage') {
      removeFromAllPages();
      if (sharedRegionIds.delete(nodeId)) {
        changed = true;
      }
      if (hadPageTargets) {
        delete nextNode.pageTargetIds;
        changed = true;
      }
      if (!targetPage.sectionIds.includes(nodeId)) {
        targetPage.sectionIds.push(nodeId);
        changed = true;
      }
    } else if (visibility === 'allPages') {
      removeFromAllPages();
      if (hadPageTargets) {
        delete nextNode.pageTargetIds;
        changed = true;
      }
      if (!sharedRegionIds.has(nodeId)) {
        sharedRegionIds.add(nodeId);
        changed = true;
      }
    } else {
      const normalizedPageIds = normalizeTopLevelWrapperTargetPageIds(document, pageIds);
      if (normalizedPageIds.length === 0) {
        return document;
      }
      removeFromAllPages();
      if (sharedRegionIds.delete(nodeId)) {
        changed = true;
      }
      const nextTargets = nextNode.pageTargetIds ?? [];
      if (nextTargets.length !== normalizedPageIds.length || nextTargets.some((id, index) => id !== normalizedPageIds[index])) {
        nextNode.pageTargetIds = normalizedPageIds;
        changed = true;
      }
    }
  }

  if (!changed) {
    return document;
  }

  next.pages = pages;
  next.sharedRegionIds = Array.from(sharedRegionIds);
  return next;
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

function isEligibleTopLevelWrapper(subtype: ContainerNode['subtype']) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

export function parseDocumentJson(raw: string): DocumentModel {
  const parsed = normalizeDocumentFontState(JSON.parse(raw) as DocumentModel);
  const errors = validateDocument(parsed);
  if (errors.length > 0) {
    throw new Error(`Invalid document: ${errors.join('; ')}`);
  }
  return parsed;
}

export function serializeDocumentJson(document: DocumentModel): string {
  return JSON.stringify(document, null, 2);
}

// ---------------------------------------------------------------------------
// Pure DocumentModel mutation functions (API-first variants)
// ---------------------------------------------------------------------------

/**
 * Insert a container node into the document without requiring EditorState.
 * The container is appended as the last child of `parentId`.
 */
export function insertContainerDoc(
  document: DocumentModel,
  subtype: ContainerSubtype,
  parentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const parent = next.nodes[parentId];
  if (!parent) {
    return document;
  }

  let node = createContainerNode(subtype, parentId);
  while (next.nodes[node.id]) {
    node = createContainerNode(subtype, parentId);
  }

  next.nodes[node.id] = node;
  parent.children.push(node.id);
  return next;
}

/**
 * @deprecated Use insertContainerDoc instead.
 * Legacy alias kept for Phase 2 compatibility.
 */
export function insertWrapperDoc(
  document: DocumentModel,
  subtype: ContainerSubtype,
  parentId: NodeId,
): DocumentModel {
  return insertContainerDoc(document, subtype, parentId);
}

/**
 * Insert a text node into the document without requiring EditorState.
 * The text node is appended as the last child of `parentId`.
 */
export function insertTextDoc(
  document: DocumentModel,
  parentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const parent = next.nodes[parentId];
  if (!parent) {
    return document;
  }

  let node = createTextNode('block', parentId);
  while (next.nodes[node.id]) {
    node = createTextNode('block', parentId);
  }

  next.nodes[node.id] = node;
  parent.children.push(node.id);
  return next;
}

/**
 * Insert a media node into the document without requiring EditorState.
 * The media node is appended as the last child of `parentId`.
 */
export function insertMediaDoc(
  document: DocumentModel,
  parentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const parent = next.nodes[parentId];
  if (!parent) {
    return document;
  }

  let node = createMediaNode('image', parentId);
  while (next.nodes[node.id]) {
    node = createMediaNode('image', parentId);
  }

  next.nodes[node.id] = node;
  parent.children.push(node.id);
  return next;
}

/**
 * @deprecated Use insertTextDoc / insertMediaDoc instead.
 * Legacy alias kept for Phase 2 compatibility.
 */
export function insertLeafDoc(
  document: DocumentModel,
  role: 'text' | 'image' | 'link' | 'button',
  parentId: NodeId,
): DocumentModel {
  if (role === 'image') {
    return insertMediaDoc(document, parentId);
  }
  return insertTextDoc(document, parentId);
}

/**
 * Delete a single node (and its descendants) from the document.
 */
export function deleteNodeDoc(document: DocumentModel, nodeId: NodeId): DocumentModel {
  return deleteNodesDoc(document, [nodeId]);
}

/**
 * Delete multiple nodes (and their descendants) from the document.
 * Automatically filters to top-level selected IDs so that deleting a parent
 * and child simultaneously does not cause errors.
 */
export function deleteNodesDoc(document: DocumentModel, nodeIds: NodeId[]): DocumentModel {
  if (nodeIds.length === 0) {
    return document;
  }

  const next = cloneDocument(document);

  // Filter to top-level IDs (skip nodes whose ancestor is also in the list).
  const topLevel = nodeIds.filter((candidateId) =>
    !nodeIds.some((otherId) => otherId !== candidateId && isDescendantOf(next, candidateId, otherId)),
  );

  if (topLevel.length === 0) {
    return document;
  }

  for (const nodeId of topLevel) {
    const node = next.nodes[nodeId];
    if (!node || node.parentId === null) {
      continue;
    }
    removeSubtree(next, nodeId);
    const parent = next.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((childId) => childId !== nodeId);
    }
  }

  return next;
}

/**
 * Reorder a node among its siblings within the document.
 */
export function reorderNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  action: NodeOrderAction,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site' || !node.parentId) {
    return document;
  }

  const parent = next.nodes[node.parentId];
  if (!parent) {
    return document;
  }

  const index = parent.children.indexOf(nodeId);
  if (index === -1) {
    return document;
  }

  // Sections are reordered only among sibling sections at root level.
  if (isContainerNode(node) && node.subtype === 'section') {
    if (parent.contentType !== 'site') {
      return document;
    }
    if (action === 'sendToBack' || action === 'bringToFront') {
      return document;
    }
    const targetIndex = findSiblingSectionIndex(next, parent.children, index, action === 'back' ? -1 : 1);
    if (targetIndex === -1) {
      return document;
    }
    const nextChildren = [...parent.children];
    [nextChildren[targetIndex], nextChildren[index]] = [nextChildren[index], nextChildren[targetIndex]];
    parent.children = nextChildren;
    return next;
  }

  if (!isReorderableNode(node)) {
    return document;
  }

  const nextChildren = [...parent.children];
  if (action === 'back') {
    if (index === 0) return document;
    [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
  } else if (action === 'forward') {
    if (index === nextChildren.length - 1) return document;
    [nextChildren[index + 1], nextChildren[index]] = [nextChildren[index], nextChildren[index + 1]];
  } else if (action === 'sendToBack') {
    if (index === 0) return document;
    nextChildren.splice(index, 1);
    nextChildren.unshift(nodeId);
  } else {
    if (index === nextChildren.length - 1) return document;
    nextChildren.splice(index, 1);
    nextChildren.push(nodeId);
  }

  parent.children = nextChildren;
  return next;
}

/**
 * Reparent a node to a new parent within the document.
 * Returns the original document unchanged when the operation is invalid
 * (e.g. reparenting to a descendant, invalid parent type).
 */
export function reparentNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  newParentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const newParent = next.nodes[newParentId];

  if (!node || !newParent || node.contentType === 'site' || !isContainerNode(newParent)) {
    return document;
  }

  if (newParentId === nodeId) {
    return document;
  }

  if (node.parentId === null || node.parentId === newParentId) {
    return document;
  }

  // Validate the parent-child relationship.
  if (!canAcceptChild(newParent, node)) {
    return document;
  }

  // Prevent reparenting into own descendants.
  if (isDescendantOf(next, newParentId, nodeId)) {
    return document;
  }

  const previousParent = next.nodes[node.parentId];
  if (previousParent) {
    previousParent.children = previousParent.children.filter((childId) => childId !== nodeId);
  }
  newParent.children.push(nodeId);
  node.parentId = newParentId;

  return next;
}

export function moveNodeInTreeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetParentId: NodeId,
  targetIndex: number,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const targetParent = next.nodes[targetParentId];

  if (!node || node.contentType === 'site' || !targetParent || targetIndex < 0) {
    return document;
  }

  const movingStructuralRootNode =
    isContainerNode(node) &&
    isSiteSectionRole(node.subtype) &&
    targetParent.contentType === 'site' &&
    targetParentId === next.rootId;

  if (targetParent.contentType === 'site') {
    if (!movingStructuralRootNode) {
      return document;
    }
  } else if (!canAcceptChild(targetParent, node)) {
    return document;
  }

  if (node.parentId == null) {
    return document;
  }

  if (targetParentId === nodeId || isDescendantOf(next, targetParentId, nodeId)) {
    return document;
  }

  const currentParent = next.nodes[node.parentId];
  if (!currentParent) {
    return document;
  }

  const currentIndex = currentParent.children.indexOf(nodeId);
  if (currentIndex === -1) {
    return document;
  }

  if (
    currentParent.id === targetParent.id &&
    (targetIndex === currentIndex || targetIndex === currentIndex + 1)
  ) {
    return document;
  }

  const maxTargetIndex = targetParent.children.length;
  if (targetIndex > maxTargetIndex) {
    return document;
  }

  currentParent.children = currentParent.children.filter((childId) => childId !== nodeId);
  const nextIndex =
    currentParent.id === targetParent.id && currentIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;

  if (nextIndex < 0 || nextIndex > targetParent.children.length) {
    return document;
  }

  targetParent.children.splice(nextIndex, 0, nodeId);
  node.parentId = targetParentId;

  if (movingStructuralRootNode) {
    normalizeRootStructuralRoles(next);
  }

  return next;
}

export function convertTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: TextSubtype,
  options?: TextConversionOptions,
): DocumentModel {
  return convertTextNodeDocHelper(document, nodeId, targetSubtype, options);
}

export function switchTextSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: TextSubtype,
  options?: TextConversionOptions,
): DocumentModel {
  return switchTextSubtypeDocHelper(document, nodeId, targetSubtype, options);
}

export function splitRichTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
): DocumentModel {
  return splitRichTextNodeDocHelper(document, nodeId);
}

export function mergeTextNodesToRichDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
  options?: MergeTextNodesOptions,
): DocumentModel {
  return mergeTextNodesToRichDocHelper(document, nodeIds, options);
}

/**
 * Legacy subtype switcher. Media switching remains in-place here for backward compatibility,
 * while text switching delegates to the explicit text conversion APIs.
 */
export function switchSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: MediaSubtype | TextSubtype,
): DocumentModel {
  const node = document.nodes[nodeId];
  if (!node) {
    return document;
  }

  const contentType = (node as { contentType?: string }).contentType;

  // Determine the target family from the targetSubtype value.
  const mediaSubtypes: MediaSubtype[] = ['image', 'video', 'svg', 'embed'];
  const textSubtypes: TextSubtype[] = ['block', 'rich', 'code', 'list'];
  const targetIsMedia = (mediaSubtypes as string[]).includes(targetSubtype);
  const targetIsText = (textSubtypes as string[]).includes(targetSubtype);

  if (!targetIsMedia && !targetIsText) {
    throw new Error(`switchSubtypeDoc: unrecognised targetSubtype "${targetSubtype}"`);
  }

  if (contentType === 'container' || contentType === 'site') {
    throw new Error(
      `switchSubtypeDoc: cannot switch subtype of a "${contentType}" node — use promote/demote logic instead`,
    );
  }

  if (contentType === 'media' && !targetIsMedia) {
    throw new Error(
      `switchSubtypeDoc: source node is "media" but targetSubtype "${targetSubtype}" belongs to the "text" family`,
    );
  }

  if (contentType === 'text' && !targetIsText) {
    throw new Error(
      `switchSubtypeDoc: source node is "text" but targetSubtype "${targetSubtype}" belongs to the "media" family`,
    );
  }

  // If there's nothing to change, bail early.
  const currentSubtype = (node as { subtype?: string }).subtype;
  if (currentSubtype === targetSubtype) {
    return document;
  }

  if (contentType === 'text') {
    return switchTextSubtypeDoc(document, nodeId, targetSubtype as TextSubtype, { mode: 'auto' });
  }

  const next = cloneDocument(document);
  const sourceNode = next.nodes[nodeId];

  if (targetIsMedia) {
    // media → media
    const mediaSource = sourceNode as import('../model/types').MediaNode;
    const base = createMediaNode(targetSubtype as MediaSubtype, mediaSource.parentId ?? '');
    const switched: import('../model/types').MediaNode = {
      ...base,
      // Identity / tree fields
      id: mediaSource.id,
      parentId: mediaSource.parentId,
      children: [...mediaSource.children],
      name: mediaSource.name,
      visible: mediaSource.visible,
      locked: mediaSource.locked,
      // Position
      rect: mediaSource.rect,
      // Behaviour
      ...(mediaSource.sticky !== undefined ? { sticky: mediaSource.sticky } : {}),
      ...(mediaSource.animation !== undefined ? { animation: mediaSource.animation } : {}),
      // Media content — transfer src/alt; type-specific props come from the base
      ...(mediaSource.src !== undefined ? { src: mediaSource.src } : {}),
      ...(mediaSource.alt !== undefined ? { alt: mediaSource.alt } : {}),
    };
    next.nodes[nodeId] = switched;
    return next;
  }
  return document;
}

// ---------------------------------------------------------------------------
// Internal helpers for pure DocumentModel mutations
// ---------------------------------------------------------------------------

function removeSubtree(document: DocumentModel, nodeId: NodeId) {
  const node = document.nodes[nodeId];
  if (!node) return;
  for (const childId of node.children) {
    removeSubtree(document, childId);
  }
  delete document.nodes[nodeId];
}

function isDescendantOf(document: DocumentModel, candidateId: NodeId, ancestorId: NodeId): boolean {
  let current = document.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

function isReorderableNode(node: DocumentNode): boolean {
  if (node.contentType === 'site') return false;
  if (isLeafNode(node)) return true;
  return isContainerNode(node) && node.subtype === 'container';
}

function isSiteSectionRole(subtype: ContainerSubtype): boolean {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

function canAcceptChild(parent: DocumentNode, child: DocumentNode): boolean {
  if (!isContainerNode(parent)) return false;
  if (isLeafNode(child)) return true;
  if (!isContainerNode(child)) return false;
  if (child.subtype !== 'container') return false;
  if (parent.subtype === 'container') return true;
  return isSiteSectionRole(parent.subtype);
}

function findSiblingSectionIndex(
  document: DocumentModel,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
): number {
  let index = fromIndex + direction;
  while (index >= 0 && index < siblingIds.length) {
    const candidate = document.nodes[siblingIds[index]];
    if (candidate && isContainerNode(candidate) && candidate.subtype === 'section') {
      return index;
    }
    index += direction;
  }
  return -1;
}

function normalizeRootStructuralRoles(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return;
  }

  const structuralContainers = root.children
    .map((childId) => document.nodes[childId])
    .filter(
      (node): node is ContainerNode =>
        Boolean(node && isContainerNode(node) && isSiteSectionRole(node.subtype)),
    );

  if (structuralContainers.length === 0) {
    return;
  }

  for (const container of structuralContainers) {
    container.subtype = 'section';
  }

  structuralContainers[0].subtype = 'header';
  if (structuralContainers.length > 1) {
    structuralContainers[structuralContainers.length - 1].subtype = 'footer';
  }
}

export function insertSectionTemplateBeforeFooter(
  document: DocumentModel,
  templateId: SectionTemplateId,
): DocumentModel {
  const next = cloneDocument(document);
  const root = next.nodes[next.rootId];
  if (!root || root.contentType !== 'site') {
    return document;
  }

  const build = createSectionFromTemplate(templateId, root.id);
  const footerIndex = root.children.findIndex((id) => {
    const node = next.nodes[id];
    return node && isContainerNode(node) && node.subtype === 'footer';
  });

  const insertionIndex = footerIndex >= 0 ? footerIndex : root.children.length;
  root.children.splice(insertionIndex, 0, build.wrapper.id);
  Object.assign(next.nodes, build.nodes);

  return normalizeDocumentFontState(next);
}
