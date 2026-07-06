import { createLinkTextNode, createMediaNode, createTextNode, syncIdCountersWithDocument } from '../../model/defaults';
import { extractPrimaryFontFamily, getDocumentFontFamily } from '../../fonts';
import {
  createRichListBlock,
  createRichListItem,
  createRichTextBlock,
  createRichTextLeaf,
  createTextDocumentContent,
  createTextDocumentFromText,
  normalizeTextDocumentContent,
} from '../../model/richContent';
import type {
  ContainerNode,
  DocumentModel,
  DocumentNode,
  LeafNode,
  NodeId,
  RichBlock,
  RichBlockStyle,
  RichInlineNode,
  RichListItem,
  RichTextBlockType,
  RichTextLeaf,
  TextDocumentContent,
} from '../../model/types';
import { isContainerNode, isLeafNode } from '../../model/types';
import type { PageId } from '../../model/types/site';
import { parseUnitValue } from '../../model/units';
import { expandParentHeightDoc, type ParentExpansionRequest } from './parentExpansion';
import { cloneDocument } from './shared';

export const EDITOR_NODE_CLIPBOARD_MIME = 'application/x-editor-playground-node+json';
export const EDITOR_NODE_CLIPBOARD_VERSION = 1;
const DEFAULT_PASTE_OFFSET_PX = 24;

export type EditorNodeClipboardPayload = {
  kind: 'editor-playground/node-clipboard';
  version: typeof EDITOR_NODE_CLIPBOARD_VERSION;
  rootIds: NodeId[];
  nodes: Record<NodeId, DocumentNode>;
};

export type PasteNodesOptions = {
  selectedId?: NodeId | null;
  activePageId?: PageId | null;
  offset?: boolean;
};

export type DuplicateNodePlacement = {
  sourceId: NodeId;
  x: string;
  y: string;
};

export type DuplicateNodesOptions = PasteNodesOptions & {
  targetParentId?: NodeId | null;
  placements?: DuplicateNodePlacement[];
  parentExpansion?: ParentExpansionRequest | null;
};

export type PasteNodesResult = {
  document: DocumentModel;
  pastedIds: NodeId[];
};

export type ExternalClipboardData = {
  text?: string;
  html?: string;
};

type HtmlElementNode = {
  type: 'element';
  tagName: string;
  attributes: Record<string, string>;
  children: HtmlNode[];
};

type HtmlTextNode = {
  type: 'text';
  text: string;
};

type HtmlNode = HtmlElementNode | HtmlTextNode;

type HtmlConversionContext = {
  document: DocumentModel;
};

export function serializeNodesForClipboardDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
): EditorNodeClipboardPayload | null {
  const rootIds = filterTopLevelNodeIds(document, nodeIds);
  if (rootIds.length === 0) {
    return null;
  }

  const nodes: Record<NodeId, DocumentNode> = {};
  for (const rootId of rootIds) {
    collectSubtree(document, rootId, nodes);
  }

  return {
    kind: 'editor-playground/node-clipboard',
    version: EDITOR_NODE_CLIPBOARD_VERSION,
    rootIds,
    nodes,
  };
}

export function parseNodeClipboardPayloadDoc(raw: string): EditorNodeClipboardPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<EditorNodeClipboardPayload>;
    if (
      parsed.kind !== 'editor-playground/node-clipboard' ||
      parsed.version !== EDITOR_NODE_CLIPBOARD_VERSION ||
      !Array.isArray(parsed.rootIds) ||
      !parsed.nodes ||
      typeof parsed.nodes !== 'object'
    ) {
      return null;
    }
    const rootIds = parsed.rootIds.filter((id): id is NodeId => typeof id === 'string');
    if (rootIds.length === 0 || rootIds.some((id) => !parsed.nodes?.[id])) {
      return null;
    }
    return {
      kind: 'editor-playground/node-clipboard',
      version: EDITOR_NODE_CLIPBOARD_VERSION,
      rootIds,
      nodes: parsed.nodes as Record<NodeId, DocumentNode>,
    };
  } catch {
    return null;
  }
}

export function pasteNodesFromClipboardDoc(
  document: DocumentModel,
  payload: EditorNodeClipboardPayload,
  options: PasteNodesOptions = {},
): PasteNodesResult {
  if (payload.rootIds.length === 0) {
    return { document, pastedIds: [] };
  }

  const targetParentId = resolvePasteParentId(document, payload, options.selectedId ?? null);
  if (!targetParentId) {
    return { document, pastedIds: [] };
  }

  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const idMap = new Map<NodeId, NodeId>();
  const allocatedIds = new Set<NodeId>();
  for (const sourceId of Object.keys(payload.nodes)) {
    idMap.set(sourceId, createUniqueClipboardId(next, payload.nodes[sourceId], allocatedIds));
  }

  const pastedRootIds: NodeId[] = [];
  for (const rootId of payload.rootIds) {
    const sourceRoot = payload.nodes[rootId];
    const nextRootId = idMap.get(rootId);
    if (!sourceRoot || !nextRootId || sourceRoot.contentType === 'site') {
      continue;
    }

    const pastedRoot = cloneClipboardNode(sourceRoot, nextRootId, targetParentId, idMap);
    if (!canAcceptClipboardChild(next.nodes[targetParentId], pastedRoot)) {
      continue;
    }

    if (isStructuralContainer(pastedRoot)) {
      pastedRoot.subtype = 'section';
    }
    addClipboardSubtree(next, payload, rootId, targetParentId, idMap, options.offset !== false);
    pastedRootIds.push(nextRootId);
  }

  if (pastedRootIds.length === 0) {
    return { document, pastedIds: [] };
  }

  const targetParent = next.nodes[targetParentId];
  if (targetParent && isContainerNode(targetParent)) {
    targetParent.children.push(...pastedRootIds);
  }

  if (targetParentId === next.rootId && options.activePageId && next.pages) {
    next.pages = next.pages.map((page) =>
      page.id === options.activePageId
        ? { ...page, sectionIds: [...page.sectionIds, ...pastedRootIds] }
        : page,
    );
  }

  return { document: next, pastedIds: pastedRootIds };
}

export function duplicateNodesDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
  options: DuplicateNodesOptions = {},
): PasteNodesResult {
  const payload = serializeNodesForClipboardDoc(document, nodeIds);
  if (!payload) {
    return { document, pastedIds: [] };
  }

  const firstRoot = payload.rootIds[0];
  const sourceParentId = firstRoot ? document.nodes[firstRoot]?.parentId : null;
  const result = pasteNodesFromClipboardDoc(document, payload, {
    ...options,
    selectedId: options.targetParentId ?? sourceParentId ?? options.selectedId ?? null,
    offset: !options.placements,
  });
  if (result.document === document || result.pastedIds.length === 0 || !options.placements) {
    return result;
  }

  const placementBySourceId = new Map(options.placements.map((placement) => [placement.sourceId, placement]));
  const next = cloneDocument(result.document);
  payload.rootIds.forEach((sourceId, index) => {
    const pastedId = result.pastedIds[index];
    const placement = placementBySourceId.get(sourceId);
    const node = pastedId ? next.nodes[pastedId] : null;
    if (!placement || !node || node.contentType === 'site') {
      return;
    }
    node.rect.x.base = parseUnitValue(placement.x);
    node.rect.y.base = parseUnitValue(placement.y);
  });

  return {
    document: options.parentExpansion
      ? expandParentHeightDoc(next, options.parentExpansion)
      : next,
    pastedIds: result.pastedIds,
  };
}

export function createNodeClipboardJson(payload: EditorNodeClipboardPayload) {
  return JSON.stringify(payload);
}

export function createTextDocumentContentFromClipboardHtml(
  document: DocumentModel,
  data: ExternalClipboardData,
): TextDocumentContent {
  return createRichTextContentFromHtml(document, data.html ?? '', data.text);
}

export function createNodeFromExternalClipboardDoc(
  document: DocumentModel,
  data: ExternalClipboardData,
  options: PasteNodesOptions = {},
): PasteNodesResult {
  const text = data.text?.trim() ?? '';
  const targetParentId = resolveInsertionParentId(document, options.selectedId ?? null);
  if (!targetParentId) {
    return { document, pastedIds: [] };
  }

  if (isImageUrl(text)) {
    return insertExternalNode(document, targetParentId, createImageUrlNode(targetParentId, text));
  }

  if (isWebsiteUrl(text)) {
    return insertExternalNode(document, targetParentId, createExternalLinkNode(targetParentId, text));
  }

  const content = data.html
    ? createTextDocumentContentFromClipboardHtml(document, data)
    : createTextDocumentFromText(data.text ?? '');
  const node = createTextNode('rich', targetParentId);
  node.name = 'Pasted Text';
  node.content = normalizeTextDocumentContent(content);
  return insertExternalNode(document, targetParentId, node);
}

function insertExternalNode(document: DocumentModel, parentId: NodeId, node: LeafNode): PasteNodesResult {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);
  let nextNode = node;
  while (next.nodes[nextNode.id]) {
    nextNode = {
      ...nextNode,
      id: createUniqueClipboardId(next, nextNode),
    };
  }
  next.nodes[nextNode.id] = nextNode;
  const parent = next.nodes[parentId];
  if (!parent || !isContainerNode(parent)) {
    return { document, pastedIds: [] };
  }
  parent.children.push(nextNode.id);
  return { document: next, pastedIds: [nextNode.id] };
}

function createImageUrlNode(parentId: NodeId, url: string) {
  const node = createMediaNode('image', parentId);
  node.src = url;
  node.alt = '';
  return node;
}

function createExternalLinkNode(parentId: NodeId, url: string) {
  const node = createLinkTextNode(parentId);
  node.htmlTag = 'div';
  node.content = createTextDocumentFromText(url, { type: 'div' });
  node.link = {
    linkType: 'external',
    href: url,
    openInNewTab: true,
  };
  return node;
}

function createRichTextContentFromHtml(
  document: DocumentModel,
  html: string,
  fallbackText = '',
) {
  const roots = parseClipboardHtml(html);
  const context: HtmlConversionContext = { document };
  const blocks = roots.flatMap((node) => htmlNodeToBlocks(node, context, {}));

  return createTextDocumentContent(
    blocks.length > 0
      ? blocks
      : [createRichTextBlock('paragraph', [createRichTextLeaf(fallbackText ?? '')])],
  );
}

function parseClipboardHtml(html: string): HtmlNode[] {
  if (!html.trim()) {
    return [];
  }
  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(parsed.body.childNodes).map(domNodeToHtmlNode).filter((node): node is HtmlNode => node !== null);
  }
  return parseClipboardHtmlFallback(html);
}

function domNodeToHtmlNode(node: ChildNode): HtmlNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return { type: 'text', text: node.textContent ?? '' };
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const element = node as HTMLElement;
  return {
    type: 'element',
    tagName: element.tagName.toLowerCase(),
    attributes: Object.fromEntries(Array.from(element.attributes).map((attribute) => [attribute.name.toLowerCase(), attribute.value])),
    children: Array.from(element.childNodes).map(domNodeToHtmlNode).filter((child): child is HtmlNode => child !== null),
  };
}

function parseClipboardHtmlFallback(html: string): HtmlNode[] {
  const root: HtmlElementNode = { type: 'element', tagName: 'body', attributes: {}, children: [] };
  const stack: HtmlElementNode[] = [root];
  const tokenPattern = /<\/?[^>]+>|[^<]+/g;
  const voidTags = new Set(['br', 'img', 'meta', 'link', 'input', 'hr']);
  for (const token of html.match(tokenPattern) ?? []) {
    if (token.startsWith('</')) {
      const tagName = token.slice(2, -1).trim().toLowerCase();
      let index = -1;
      for (let stackIndex = stack.length - 1; stackIndex >= 0; stackIndex -= 1) {
        if (stack[stackIndex].tagName === tagName) {
          index = stackIndex;
          break;
        }
      }
      if (index > 0) {
        stack.length = index;
      }
      continue;
    }
    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const tagSource = token.slice(1, selfClosing ? -2 : -1).trim();
      const [rawTagName = ''] = tagSource.split(/\s+/, 1);
      const tagName = rawTagName.toLowerCase();
      if (!tagName || tagName.startsWith('!')) {
        continue;
      }
      const element: HtmlElementNode = {
        type: 'element',
        tagName,
        attributes: parseHtmlAttributes(tagSource.slice(rawTagName.length)),
        children: [],
      };
      stack[stack.length - 1].children.push(element);
      if (!selfClosing && !voidTags.has(tagName)) {
        stack.push(element);
      }
      continue;
    }
    stack[stack.length - 1].children.push({ type: 'text', text: decodeHtmlEntities(token) });
  }
  return root.children;
}

function parseHtmlAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const attributePattern = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlNodeToBlocks(
  node: HtmlNode,
  context: HtmlConversionContext,
  inherited: Partial<RichTextLeaf>,
): RichBlock[] {
  if (node.type === 'text') {
    const text = node.text;
    return text.trim() ? [createRichTextBlock('paragraph', [createRichTextLeaf(text, inherited)])] : [];
  }

  const tagName = node.tagName;
  if (tagName === 'ul' || tagName === 'ol') {
    const items = node.children.flatMap((child) => listItemsFromHtmlNode(child, context, inherited, 0));
    if (items.length === 0) {
      return [];
    }
    return [createRichListBlock(tagName, items, {
      start: tagName === 'ol' ? Number.parseInt(node.attributes.start, 10) || undefined : undefined,
      markerStyle: resolveListMarkerStyle(node),
      style: resolveBlockStyle(node, context),
    })];
  }

  if (isHtmlBlockTag(tagName)) {
    const marks = resolveElementMarks(node, inherited, context);
    if (hasStructuralHtmlChild(node)) {
      return node.children.flatMap((child) => htmlNodeToBlocks(child, context, marks));
    }
    const children = inlineNodesFromHtmlChildren(node.children, context, marks);
    if (children.length === 0 || getInlineText(children).trim().length === 0) {
      return [];
    }
    return [createRichTextBlock(resolveHtmlBlockType(tagName), children, {
      style: resolveBlockStyle(node, context),
    })];
  }

  const marks = resolveElementMarks(node, inherited, context);
  if (hasStructuralHtmlChild(node)) {
    return node.children.flatMap((child) => htmlNodeToBlocks(child, context, marks));
  }
  const children = inlineNodesFromHtmlChildren(node.children, context, marks);
  return getInlineText(children).trim()
    ? [createRichTextBlock('paragraph', children)]
    : [];
}

function listItemsFromHtmlNode(
  node: HtmlNode,
  context: HtmlConversionContext,
  inherited: Partial<RichTextLeaf>,
  depth: number,
): RichListItem[] {
  if (node.type !== 'element' || node.tagName !== 'li') {
    return [];
  }
  const marks = resolveElementMarks(node, inherited, context);
  const inlineChildren = inlineNodesFromHtmlChildren(
    node.children.filter((child) => !isListElement(child)),
    context,
    marks,
  );
  const nestedItems = node.children
    .filter(isListElement)
    .flatMap((list) => list.children.flatMap((child) => listItemsFromHtmlNode(child, context, marks, depth + 1)));
  return [
    createRichListItemFromChildren(
      inlineChildren.length > 0 ? inlineChildren : [createRichTextLeaf('')],
      depth,
    ),
    ...nestedItems,
  ];
}

function createRichListItemFromChildren(children: RichInlineNode[], depth = 0): RichListItem {
  return {
    ...createRichListItem(''),
    ...(depth > 0 ? { depth } : {}),
    children,
  };
}

function inlineNodesFromHtmlChildren(
  nodes: HtmlNode[],
  context: HtmlConversionContext,
  inherited: Partial<RichTextLeaf>,
): RichInlineNode[] {
  return nodes.flatMap((node) => inlineNodesFromHtmlNode(node, context, inherited));
}

function inlineNodesFromHtmlNode(
  node: HtmlNode,
  context: HtmlConversionContext,
  inherited: Partial<RichTextLeaf>,
): RichInlineNode[] {
  if (node.type === 'text') {
    return node.text ? [createRichTextLeaf(node.text, inherited)] : [];
  }

  if (node.tagName === 'br') {
    return [createRichTextLeaf('\n', inherited)];
  }

  const marks = resolveElementMarks(node, inherited, context);
  const children = inlineNodesFromHtmlChildren(node.children, context, marks);
  if (node.tagName === 'a') {
    const href = node.attributes.href;
    return [{
      type: 'link',
      linkType: 'external',
      ...(href ? { href } : {}),
      openInNewTab: true,
      children: children.flatMap((child) => ('text' in child ? [child] : child.children)),
    }];
  }

  if (isHtmlBlockTag(node.tagName) || node.tagName === 'li') {
    return children.length > 0 ? children : [createRichTextLeaf(getHtmlText(node), marks)];
  }

  return children;
}

function resolveElementMarks(
  element: HtmlElementNode,
  inherited: Partial<RichTextLeaf>,
  context: HtmlConversionContext,
): Partial<RichTextLeaf> {
  const tagName = element.tagName;
  const style = parseCssStyle(element.attributes.style ?? '');
  const textDecoration = `${style['text-decoration'] ?? ''} ${style['text-decoration-line'] ?? ''}`;
  const fontWeight = parseFontWeight(style['font-weight']);
  const fontFamily = resolvePastedFontFamily(style['font-family'], context.document);
  const color = style.color;
  const backgroundColor = style['background-color'];

  return {
    ...inherited,
    ...(tagName === 'strong' || tagName === 'b' ? { bold: true } : {}),
    ...(tagName === 'em' || tagName === 'i' ? { italic: true } : {}),
    ...(tagName === 'u' ? { underline: true } : {}),
    ...(tagName === 's' || tagName === 'strike' || tagName === 'del' ? { strikethrough: true } : {}),
    ...(fontWeight !== undefined ? { fontWeight, ...(fontWeight >= 600 ? { bold: true } : {}) } : {}),
    ...(style['font-style'] === 'italic' ? { italic: true } : {}),
    ...(textDecoration.includes('underline') ? { underline: true } : {}),
    ...(textDecoration.includes('line-through') ? { strikethrough: true } : {}),
    ...(color ? { color } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(style['font-size'] ? { fontSize: style['font-size'] } : {}),
  };
}

function resolveBlockStyle(element: HtmlElementNode, context: HtmlConversionContext): RichBlockStyle | undefined {
  const marks = resolveElementMarks(element, {}, context);
  const style = parseCssStyle(element.attributes.style ?? '');
  const textAlign = resolveTextAlign(style['text-align']);
  return {
    ...(marks.color ? { color: marks.color } : {}),
    ...(marks.backgroundColor ? { background: marks.backgroundColor } : {}),
    ...(marks.fontFamily ? { fontFamily: marks.fontFamily } : {}),
    ...(marks.fontSize ? { fontSize: marks.fontSize } : {}),
    ...(marks.fontWeight ? { fontWeight: marks.fontWeight } : {}),
    ...(marks.italic ? { fontStyle: 'italic' as const } : {}),
    ...(textAlign ? { textAlign } : {}),
  };
}

function resolveTextAlign(value: string | undefined): RichBlockStyle['textAlign'] | undefined {
  return value === 'left' || value === 'center' || value === 'right' ? value : undefined;
}

function parseCssStyle(style: string) {
  return Object.fromEntries(
    style
      .split(';')
      .map((declaration) => declaration.split(':'))
      .filter((parts): parts is [string, string] => parts.length >= 2 && parts[0].trim().length > 0)
      .map(([property, ...value]) => [property.trim().toLowerCase(), value.join(':').trim()]),
  );
}

function parseFontWeight(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  if (value === 'bold') {
    return 700;
  }
  if (value === 'normal') {
    return 400;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolvePastedFontFamily(fontFamily: string | undefined, document: DocumentModel) {
  if (!fontFamily) {
    return undefined;
  }
  const primaryFamily = extractPrimaryFontFamily(fontFamily);
  if (!primaryFamily) {
    return undefined;
  }
  return getDocumentFontFamily(document, primaryFamily)?.family;
}

function resolveListMarkerStyle(element: HtmlElementNode) {
  const style = parseCssStyle(element.attributes.style ?? '');
  return style['list-style-type'] ?? undefined;
}

function isHtmlBlockTag(tagName: string) {
  return tagName === 'p'
    || tagName === 'div'
    || tagName === 'blockquote'
    || tagName === 'h1'
    || tagName === 'h2'
    || tagName === 'h3'
    || tagName === 'h4'
    || tagName === 'h5'
    || tagName === 'h6';
}

function hasStructuralHtmlChild(node: HtmlElementNode) {
  return node.children.some((child) => child.type === 'element' && (isHtmlBlockTag(child.tagName) || isListElement(child)));
}

function isListElement(node: HtmlNode): node is HtmlElementNode {
  return node.type === 'element' && (node.tagName === 'ul' || node.tagName === 'ol');
}

function resolveHtmlBlockType(tagName: string): RichTextBlockType {
  if (tagName === 'blockquote') return 'blockquote';
  if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
    return tagName;
  }
  if (tagName === 'div') return 'div';
  return 'paragraph';
}

function getHtmlText(node: HtmlNode): string {
  if (node.type === 'text') {
    return node.text;
  }
  return node.children.map(getHtmlText).join('');
}

function getInlineText(nodes: RichInlineNode[]): string {
  return nodes.map((node) => ('text' in node ? node.text : getInlineText(node.children))).join('');
}

function filterTopLevelNodeIds(document: DocumentModel, nodeIds: NodeId[]) {
  return nodeIds.filter((candidateId) => {
    const node = document.nodes[candidateId];
    if (!node || node.contentType === 'site') {
      return false;
    }
    return !nodeIds.some((otherId) => otherId !== candidateId && isDescendantOf(document, candidateId, otherId));
  });
}

function collectSubtree(document: DocumentModel, nodeId: NodeId, nodes: Record<NodeId, DocumentNode>) {
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return;
  }
  nodes[nodeId] = structuredClone(node);
  for (const childId of node.children) {
    collectSubtree(document, childId, nodes);
  }
}

function addClipboardSubtree(
  document: DocumentModel,
  payload: EditorNodeClipboardPayload,
  sourceId: NodeId,
  parentId: NodeId,
  idMap: Map<NodeId, NodeId>,
  offsetRoot = false,
) {
  const source = payload.nodes[sourceId];
  const nextId = idMap.get(sourceId);
  if (!source || !nextId || source.contentType === 'site') {
    return;
  }
  const nextNode = cloneClipboardNode(source, nextId, parentId, idMap);
  if (isStructuralContainer(nextNode)) {
    nextNode.subtype = 'section';
  }
  if (offsetRoot) {
    offsetNodePosition(nextNode);
  }
  document.nodes[nextNode.id] = nextNode;
  for (const childId of source.children) {
    addClipboardSubtree(document, payload, childId, nextNode.id, idMap);
  }
}

function cloneClipboardNode(
  source: DocumentNode,
  nextId: NodeId,
  parentId: NodeId,
  idMap: Map<NodeId, NodeId>,
): DocumentNode {
  const next = structuredClone(source);
  next.id = nextId;
  next.parentId = parentId;
  next.children = source.children.map((childId) => idMap.get(childId)).filter((id): id is NodeId => Boolean(id));
  next.name = `${source.name} Copy`;
  return next;
}

function createUniqueClipboardId(document: DocumentModel, source: DocumentNode, allocatedIds = new Set<NodeId>()): NodeId {
  const prefix = source.contentType === 'container'
    ? source.subtype
    : source.contentType === 'text'
      ? source.subtype === 'block' ? 'text' : source.subtype
      : source.contentType === 'media'
        ? source.subtype
        : 'node';
  let index = Object.keys(document.nodes).length + 1;
  let id = `${prefix}_${index}`;
  while (document.nodes[id] || allocatedIds.has(id)) {
    index += 1;
    id = `${prefix}_${index}`;
  }
  allocatedIds.add(id);
  return id;
}

function resolvePasteParentId(
  document: DocumentModel,
  payload: EditorNodeClipboardPayload,
  selectedId: NodeId | null,
) {
  const rootNodes = payload.rootIds.map((id) => payload.nodes[id]).filter(Boolean);
  if (rootNodes.some((node) => isContainerNode(node) && isStructuralContainer(node))) {
    return document.rootId;
  }
  return resolveInsertionParentId(document, selectedId);
}

function resolveInsertionParentId(document: DocumentModel, selectedId: NodeId | null) {
  if (!selectedId) {
    return findFirstSection(document) ?? document.rootId;
  }
  const selected = document.nodes[selectedId];
  if (!selected) {
    return findFirstSection(document) ?? document.rootId;
  }
  if (isContainerNode(selected)) {
    return selected.id;
  }
  return selected.parentId && isContainerNode(document.nodes[selected.parentId])
    ? selected.parentId
    : findFirstSection(document) ?? document.rootId;
}

function findFirstSection(document: DocumentModel): NodeId | null {
  const root = document.nodes[document.rootId];
  if (root?.contentType !== 'site') {
    return null;
  }
  return root.children.find((id) => {
    const node = document.nodes[id];
    return node && isContainerNode(node) && (node.subtype === 'section' || node.subtype === 'header');
  }) ?? null;
}

function canAcceptClipboardChild(parent: DocumentNode | undefined, child: DocumentNode) {
  if (!parent) {
    return false;
  }
  if (parent.contentType === 'site') {
    return isContainerNode(child) && isStructuralContainer(child);
  }
  if (!isContainerNode(parent)) {
    return false;
  }
  if (isLeafNode(child)) {
    return true;
  }
  return isContainerNode(child) && isNestableContainer(child);
}

function isStructuralContainer(node: DocumentNode): node is ContainerNode {
  return isContainerNode(node) && (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer');
}

function isNestableContainer(node: ContainerNode) {
  return node.subtype === 'container' || node.subtype === 'nav' || node.subtype === 'aside' || node.subtype === 'article' || node.subtype === 'group';
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

function offsetNodePosition(node: DocumentNode) {
  if (node.contentType === 'site') {
    return;
  }
  const currentX = node.rect.x.base.parsed;
  const currentY = node.rect.y.base.parsed;
  if (currentX.unit === 'px') {
    node.rect.x.base = parseUnitValue(`${currentX.value + DEFAULT_PASTE_OFFSET_PX}px`);
  }
  if (currentY.unit === 'px') {
    node.rect.y.base = parseUnitValue(`${currentY.value + DEFAULT_PASTE_OFFSET_PX}px`);
  }
}

function isWebsiteUrl(text: string) {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isImageUrl(text: string) {
  if (!isWebsiteUrl(text)) {
    return false;
  }
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(text);
}
