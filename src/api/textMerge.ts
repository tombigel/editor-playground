import { createTextNode, syncIdCountersWithDocument } from '../model/defaults';
import {
  createRichCodeBlock,
  createRichTextBlock,
  createRichTextLeaf,
  getTextContent,
  listContentToRichListBlock,
  normalizeRichContent,
} from '../model/richContent';
import {
  listContentToLines,
  normalizeListContent,
} from '../model/listContent';
import { parseHeightValue, parseUnitValue } from '../model/units';
import type {
  DocumentModel,
  ListContent,
  NodeId,
  RichBlock,
  RichContent,
  RichTextBlock,
  TextNode,
  TextSubtype,
} from '../model/types';
import { isTextNode } from '../model/types';

const DEFAULT_SPLIT_FONT_SIZE_PX = 18;
const DEFAULT_SPLIT_LINE_HEIGHT = 1.45;
const SPLIT_STACK_GAP_PX = 12;

export type MergeTextNodesOptions = {
  survivorNodeId?: NodeId;
};

export function splitRichTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
): DocumentModel {
  const source = document.nodes[nodeId];
  if (!source || !isTextNode(source) || source.subtype !== 'rich' || !source.parentId) {
    return document;
  }

  const parent = document.nodes[source.parentId];
  if (!parent) {
    return document;
  }

  const blockContent = normalizeRichContent(source.content);
  const blocks = blockContent.length > 0
    ? blockContent
    : [createRichTextBlock('paragraph', [createRichTextLeaf('')])];

  if (blocks.length === 1) {
    const next = cloneDocument(document);
    const current = next.nodes[nodeId];
    if (!current || !isTextNode(current) || current.subtype !== 'rich' || !current.parentId) {
      return document;
    }

    next.nodes[nodeId] = createAnchorNodeFromRichBlock(current, blocks[0]);
    return next;
  }

  syncIdCountersWithDocument(document);

  const next = cloneDocument(document);
  const current = next.nodes[nodeId];
  if (!current || !isTextNode(current) || current.subtype !== 'rich' || !current.parentId) {
    return document;
  }

  const currentParent = next.nodes[current.parentId];
  if (!currentParent) {
    return document;
  }

  const currentIndex = currentParent.children.indexOf(nodeId);
  if (currentIndex === -1) {
    return document;
  }

  const replacementIds: NodeId[] = [nodeId];
  next.nodes[nodeId] = createAnchorNodeFromRichBlock(current, blocks[0]);

  let yOffsetPx = 0;
  let previousBlock = blocks[0];
  for (let index = 1; index < blocks.length; index += 1) {
    yOffsetPx += estimateSplitAdvancePx(current, previousBlock);
    const sibling = createSplitSiblingNodeFromRichBlock(current, blocks[index], index, yOffsetPx);
    next.nodes[sibling.id] = sibling;
    replacementIds.push(sibling.id);
    previousBlock = blocks[index];
  }

  currentParent.children.splice(currentIndex, 1, ...replacementIds);
  return next;
}

export function mergeTextNodesToRichDoc(
  document: DocumentModel,
  nodeIds: NodeId[],
  options: MergeTextNodesOptions = {},
): DocumentModel {
  const uniqueNodeIds = [...new Set(nodeIds)];
  if (uniqueNodeIds.length < 2) {
    return document;
  }

  const sourceNodes = uniqueNodeIds.map((nodeId) => document.nodes[nodeId]);
  if (sourceNodes.some((node) => !node || !isTextNode(node) || node.parentId == null)) {
    return document;
  }

  const textNodes = sourceNodes as TextNode[];
  const parentId = textNodes[0].parentId;
  if (!parentId || textNodes.some((node) => node.parentId !== parentId)) {
    return document;
  }

  const parent = document.nodes[parentId];
  if (!parent) {
    return document;
  }

  const siblingIdsInTreeOrder = parent.children.filter((childId) => uniqueNodeIds.includes(childId));
  if (siblingIdsInTreeOrder.length !== uniqueNodeIds.length) {
    return document;
  }

  const survivorNodeId = uniqueNodeIds.includes(options.survivorNodeId ?? '')
    ? options.survivorNodeId as NodeId
    : uniqueNodeIds[0];
  const survivorSource = document.nodes[survivorNodeId];
  if (!survivorSource || !isTextNode(survivorSource) || survivorSource.parentId !== parentId) {
    return document;
  }

  const mergedContent = siblingIdsInTreeOrder.flatMap((childId) => {
    const child = document.nodes[childId];
    if (!child || !isTextNode(child)) {
      return [];
    }
    return textNodeToRichContent(child);
  });

  const next = cloneDocument(document);
  const nextParent = next.nodes[parentId];
  const nextSurvivor = next.nodes[survivorNodeId];
  if (!nextParent || !nextSurvivor || !isTextNode(nextSurvivor)) {
    return document;
  }

  next.nodes[survivorNodeId] = createRichNodeFromSource(
    nextSurvivor,
    mergedContent,
  );

  const removedNodeIds = uniqueNodeIds.filter((candidateId) => candidateId !== survivorNodeId);
  for (const removedNodeId of removedNodeIds) {
    removeSubtree(next, removedNodeId);
  }

  nextParent.children = nextParent.children.filter((childId) => !removedNodeIds.includes(childId));
  return next;
}

function cloneDocument(document: DocumentModel): DocumentModel {
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

function removeSubtree(document: DocumentModel, nodeId: NodeId): void {
  const node = document.nodes[nodeId];
  if (!node) {
    return;
  }

  for (const childId of node.children) {
    removeSubtree(document, childId);
  }

  delete document.nodes[nodeId];
}

function createRichNodeFromSource(source: TextNode, content: RichContent): TextNode {
  const base = createTextNode('rich', source.parentId ?? '');
  return {
    ...base,
    id: source.id,
    parentId: source.parentId,
    children: [...source.children],
    name: source.name,
    visible: source.visible,
    locked: source.locked,
    rect: structuredClone(source.rect),
    ...(source.sticky !== undefined ? { sticky: structuredClone(source.sticky) } : {}),
    ...(source.animation !== undefined ? { animation: structuredClone(source.animation) } : {}),
    content,
    ...(source.lang !== undefined ? { lang: source.lang } : {}),
    style: source.style ? structuredClone(source.style) : structuredClone(base.style),
  };
}

function textNodeToRichContent(node: TextNode): RichContent {
  if (node.subtype === 'rich') {
    return normalizeRichContent(node.content);
  }

  if (node.subtype === 'list') {
    return listContentToRichContent(normalizeListContent(node.content));
  }

  if (node.subtype === 'code') {
    return [
      createRichCodeBlock(typeof node.content === 'string' ? node.content : '', {
        language: node.code?.language,
        theme: node.code?.theme,
        highlightedHtml: node.code?.highlightedHtml,
      }),
    ];
  }

  if (node.subtype === 'block') {
    return [
      createRichTextBlock(
        htmlTagToRichBlockType(node.htmlTag),
        [createRichTextLeaf(typeof node.content === 'string' ? node.content : '')],
      ),
    ];
  }

  return [
    createRichTextBlock(
      'paragraph',
      [createRichTextLeaf(typeof node.content === 'string' ? node.content : '')],
    ),
  ];
}

function listContentToRichContent(content: ListContent): RichContent {
  if (content.type === 'ul' || content.type === 'ol') {
    return [listContentToRichListBlock(content)];
  }

  return listContentToLines(content).map((line) =>
    createRichTextBlock('paragraph', [createRichTextLeaf(line)]),
  );
}

function htmlTagToRichBlockType(
  htmlTag: TextNode['htmlTag'],
): RichTextBlock['type'] {
  if (htmlTag === 'blockquote') {
    return 'blockquote';
  }

  if (htmlTag && htmlTag !== 'p') {
    return htmlTag;
  }

  return 'paragraph';
}

function richBlockToTextSubtype(_block: RichBlock): TextSubtype {
  if (_block.type === 'code-block') {
    return 'code';
  }

  if (_block.type === 'ul' || _block.type === 'ol') {
    return 'list';
  }

  return 'block';
}

function richBlockToHtmlTag(
  block: RichBlock,
): TextNode['htmlTag'] {
  if (block.type === 'code-block' || block.type === 'ul' || block.type === 'ol') {
    return 'p';
  }

  if (block.type === 'blockquote') {
    return 'blockquote';
  }

  if (block.type === 'paragraph' || block.type === 'div') {
    return 'p';
  }

  return block.type;
}

function createAnchorNodeFromRichBlock(
  source: TextNode,
  block: RichBlock,
): TextNode {
  const subtype = richBlockToTextSubtype(block);
  const base = createTextNode(subtype, source.parentId ?? '');
  const listContent = block.type === 'ul' || block.type === 'ol' ? richListBlockToListContent(block) : undefined;
  const codeMetadata = block.type === 'code-block'
    ? {
        language: block.language ?? 'plaintext',
        theme: block.theme ?? 'light',
        highlightedHtml: block.highlightedHtml,
      }
    : undefined;
  return {
    ...base,
    id: source.id,
    parentId: source.parentId,
    children: [...source.children],
    name: source.name,
    visible: source.visible,
    locked: source.locked,
    rect: structuredClone(source.rect),
    ...(source.sticky !== undefined ? { sticky: structuredClone(source.sticky) } : {}),
    ...(source.animation !== undefined ? { animation: structuredClone(source.animation) } : {}),
    content: subtype === 'list' ? listContent ?? richListBlockToListContentFallback(getTextContent([block])) : getTextContent([block]),
    ...(source.lang !== undefined ? { lang: source.lang } : {}),
    ...(subtype === 'block' ? { htmlTag: richBlockToHtmlTag(block) } : {}),
    ...(subtype === 'code' && codeMetadata ? { code: codeMetadata } : {}),
    style: source.style ? structuredClone(source.style) : structuredClone(base.style),
  };
}

function createSplitSiblingNodeFromRichBlock(
  source: TextNode,
  block: RichBlock,
  splitIndex: number,
  yOffsetPx: number,
): TextNode {
  const subtype = richBlockToTextSubtype(block);
  const base = createTextNode(subtype, source.parentId ?? '');
  const originYValue = source.rect.y.base.parsed.value;
  const listContent = block.type === 'ul' || block.type === 'ol' ? richListBlockToListContent(block) : undefined;
  const codeMetadata = block.type === 'code-block'
    ? {
        language: block.language ?? 'plaintext',
        theme: block.theme ?? 'light',
        highlightedHtml: block.highlightedHtml,
      }
    : undefined;

  return {
    ...base,
    parentId: source.parentId,
    children: [],
    name: `${source.name} ${splitIndex + 1}`,
    visible: source.visible,
    locked: source.locked,
    rect: {
      x: structuredClone(source.rect.x),
      y: { base: parseUnitValue(`${originYValue + yOffsetPx}px`) },
      width: structuredClone(source.rect.width),
      height: { base: parseHeightValue('auto') },
    },
    content: subtype === 'list' ? listContent ?? richListBlockToListContentFallback(getTextContent([block])) : getTextContent([block]),
    ...(source.lang !== undefined ? { lang: source.lang } : {}),
    ...(subtype === 'block' ? { htmlTag: richBlockToHtmlTag(block) } : {}),
    ...(subtype === 'code' && codeMetadata ? { code: codeMetadata } : {}),
    style: source.style ? structuredClone(source.style) : structuredClone(base.style),
  };
}

function estimateSplitAdvancePx(source: TextNode, block: RichBlock): number {
  const fontSize = source.style?.fontSize?.parsed;
  const fontSizePx = fontSize && 'unit' in fontSize && fontSize.unit === 'px'
    ? fontSize.value
    : DEFAULT_SPLIT_FONT_SIZE_PX;
  const lineHeight = source.style?.lineHeight ?? DEFAULT_SPLIT_LINE_HEIGHT;
  const blockText = getTextContent([block]);
  const explicitLineCount = Math.max(1, blockText.split(/\r?\n/).length);
  const contentHeightPx = Math.ceil(fontSizePx * lineHeight * explicitLineCount);
  return Math.max(36, contentHeightPx + SPLIT_STACK_GAP_PX);
}

function richListBlockToListContent(block: Extract<RichBlock, { type: 'ul' | 'ol' }>): ListContent {
  if (block.type === 'ol') {
    return {
      type: 'ol',
      start: block.start,
      markerStyle: block.markerStyle,
      items: block.children.map((item) => ({
        text: item.children.flatMap((child) => ('type' in child ? child.children.map((leaf) => leaf.text) : [child.text])).join(''),
        direction: 'ltr',
      })),
    };
  }

  return {
    type: 'ul',
    markerStyle: block.markerStyle,
    items: block.children.map((item) => ({
      text: item.children.flatMap((child) => ('type' in child ? child.children.map((leaf) => leaf.text) : [child.text])).join(''),
      direction: 'ltr',
    })),
  };
}

function richListBlockToListContentFallback(text: string): ListContent {
  return {
    type: 'ul',
    markerStyle: 'disc',
    items: [{ text, direction: 'ltr' }],
  };
}
