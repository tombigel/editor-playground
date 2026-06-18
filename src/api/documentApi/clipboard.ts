import { createLinkTextNode, createMediaNode, createTextNode, syncIdCountersWithDocument } from '../../model/defaults';
import {
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
  RichInlineNode,
  RichTextLeaf,
} from '../../model/types';
import { isContainerNode, isLeafNode } from '../../model/types';
import type { PageId } from '../../model/types/site';
import { parseUnitValue } from '../../model/units';
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

export type PasteNodesResult = {
  document: DocumentModel;
  pastedIds: NodeId[];
};

export type ExternalClipboardData = {
  text?: string;
  html?: string;
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
  options: PasteNodesOptions = {},
): PasteNodesResult {
  const payload = serializeNodesForClipboardDoc(document, nodeIds);
  if (!payload) {
    return { document, pastedIds: [] };
  }

  const firstRoot = payload.rootIds[0];
  const sourceParentId = firstRoot ? document.nodes[firstRoot]?.parentId : null;
  return pasteNodesFromClipboardDoc(document, payload, {
    ...options,
    selectedId: sourceParentId ?? options.selectedId ?? null,
    offset: true,
  });
}

export function createNodeClipboardJson(payload: EditorNodeClipboardPayload) {
  return JSON.stringify(payload);
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
    ? createRichTextContentFromHtml(data.html, data.text)
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

function createRichTextContentFromHtml(html: string, fallbackText = '') {
  if (typeof DOMParser === 'undefined') {
    return createTextDocumentFromText(fallbackText);
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const blockElements = Array.from(
    parsed.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,div,li'),
  );
  const sources = blockElements.length > 0 ? blockElements : [parsed.body];
  const blocks = sources
    .map((element) => {
      const children = inlineNodesFromDom(element);
      if (children.length === 0 || getInlineText(children).trim().length === 0) {
        return null;
      }
      return createRichTextBlock(resolveHtmlBlockType(element), children);
    })
    .filter((block): block is NonNullable<typeof block> => Boolean(block));

  return createTextDocumentContent(
    blocks.length > 0
      ? blocks
      : [createRichTextBlock('paragraph', [createRichTextLeaf(fallbackText)])],
  );
}

function inlineNodesFromDom(root: Element): RichInlineNode[] {
  const leaves: RichInlineNode[] = [];
  root.childNodes.forEach((child) => {
    leaves.push(...inlineNodesFromChild(child, {}));
  });
  return leaves.length > 0 ? leaves : [createRichTextLeaf(root.textContent ?? '')];
}

function inlineNodesFromChild(node: ChildNode, inherited: Partial<RichTextLeaf>): RichInlineNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text ? [createRichTextLeaf(text, inherited)] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const marks = resolveElementMarks(element, inherited);
  const children = Array.from(element.childNodes).flatMap((child) => inlineNodesFromChild(child, marks));
  if (element.tagName.toLowerCase() === 'a') {
    const href = element.getAttribute('href') ?? undefined;
    return [{
      type: 'link',
      linkType: 'external',
      ...(href ? { href } : {}),
      openInNewTab: true,
      children: children.filter((child): child is RichTextLeaf => 'text' in child),
    }];
  }
  return children;
}

function resolveElementMarks(element: HTMLElement, inherited: Partial<RichTextLeaf>) {
  const tagName = element.tagName.toLowerCase();
  const style = element.style;
  return {
    ...inherited,
    ...(tagName === 'strong' || tagName === 'b' ? { bold: true } : {}),
    ...(tagName === 'em' || tagName === 'i' ? { italic: true } : {}),
    ...(tagName === 'u' ? { underline: true } : {}),
    ...(tagName === 's' || tagName === 'strike' || tagName === 'del' ? { strikethrough: true } : {}),
    ...(style.fontWeight === 'bold' || Number.parseInt(style.fontWeight, 10) >= 700 ? { bold: true, fontWeight: 700 } : {}),
    ...(style.fontStyle === 'italic' ? { italic: true } : {}),
    ...(style.textDecorationLine.includes('underline') ? { underline: true } : {}),
    ...(style.textDecorationLine.includes('line-through') ? { strikethrough: true } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
  };
}

function resolveHtmlBlockType(element: Element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'blockquote') return 'blockquote';
  if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
    return tagName;
  }
  return 'paragraph';
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
  return isContainerNode(child) && child.subtype === 'container';
}

function isStructuralContainer(node: DocumentNode): node is ContainerNode {
  return isContainerNode(node) && (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer');
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
