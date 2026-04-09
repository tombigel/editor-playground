import { createTextNode, syncIdCountersWithDocument } from '../model/defaults';
import {
  createTextDocumentContent,
  createRichCodeBlock,
  createRichTextBlock,
  createRichTextLeaf,
  getTextContent,
  getTextDocumentBlocks,
  listContentToRichListBlock,
  normalizeRichContent,
  richListBlockToListContent,
} from '../model/richContent';
import {
  listContentToLines,
} from '../model/listContent';
import { formatValue, parseHeightValue, parseUnitValue } from '../model/units';
import type {
  DocumentModel,
  ListContent,
  NodeId,
  RichBlock,
  RichBlockStyle,
  RichContent,
  RichTextBlock,
  TextNode,
  TextSubtype,
} from '../model/types';
import { isTextNode } from '../model/types';
import { buildFontFamilyStack } from '../fonts';

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

  const blockContent = normalizeRichContent(getTextDocumentBlocks(source.content));
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
    content: createTextDocumentContent(content, { blockGap: source.content.blockGap }),
    ...(source.lang !== undefined ? { lang: source.lang } : {}),
    style: structuredClone(base.style),
  };
}

function textNodeToRichContent(node: TextNode): RichContent {
  if (node.subtype === 'rich') {
    return normalizeRichContent(getTextDocumentBlocks(node.content));
  }

  if (node.subtype === 'list') {
    return listContentToRichContent(richListBlockToListContent(getTextDocumentBlocks(node.content)[0] as Extract<RichBlock, { type: 'ul' | 'ol' }>), buildRichBlockStyleFromTextNode(node, 'list'), node.style?.direction);
  }

  if (node.subtype === 'code') {
    const text = getTextContent(node.content.blocks, { blockSeparator: '\n' });
    return [
      createRichCodeBlock(text, {
        language: node.code?.language,
        theme: node.code?.theme,
        highlightedHtml: node.code?.highlightedHtml,
        direction: node.style?.direction,
        style: buildRichBlockStyleFromTextNode(node, 'code'),
      }),
    ];
  }

  if (node.subtype === 'block') {
    const text = getTextContent(node.content.blocks);
    return [
      createRichTextBlock(
        htmlTagToRichBlockType(node.htmlTag),
        [createRichTextLeaf(text)],
        {
          direction: node.style?.direction,
          lineHeight: node.style?.lineHeight,
          style: buildRichBlockStyleFromTextNode(node, 'text'),
        },
      ),
    ];
  }

  return [
    createRichTextBlock(
      'paragraph',
      [createRichTextLeaf(getTextContent(node.content.blocks))],
    ),
  ];
}

function listContentToRichContent(
  content: ListContent,
  style?: RichBlockStyle,
  direction?: 'ltr' | 'rtl',
): RichContent {
  if (content.type === 'ul' || content.type === 'ol') {
    return [listContentToRichListBlock(content, { style, direction })];
  }

  return listContentToLines(content).map((line) =>
    createRichTextBlock('paragraph', [createRichTextLeaf(line)], {
      direction,
      style,
    }),
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

function buildRichBlockStyleFromTextNode(
  node: TextNode,
  kind: 'text' | 'code' | 'list',
): RichBlockStyle | undefined {
  const style = node.style;
  if (!style) {
    return undefined;
  }

  const richStyle: RichBlockStyle = {
    ...(style.color ? { color: style.color } : {}),
    ...(style.fontFamily ? { fontFamily: buildFontFamilyStack(style.fontFamily) } : {}),
    ...(style.fontSize ? { fontSize: formatValue(style.fontSize.parsed) } : {}),
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(style.textDecorationLine ? { textDecorationLine: style.textDecorationLine } : {}),
    ...(style.textAlign ? { textAlign: style.textAlign } : {}),
  };

  if (kind === 'text' || kind === 'list') {
    const filter = buildFilterShadowCss(style);
    if (filter) {
      richStyle.filter = filter;
    }
  }

  if (kind === 'code') {
    if (style.background) {
      richStyle.background = style.background;
    }
    const borderStyle = buildUnifiedBorderCss(style);
    if (borderStyle) {
      Object.assign(richStyle, borderStyle);
    }
    const boxShadow = buildBoxShadowCss(style);
    if (boxShadow) {
      richStyle.boxShadow = boxShadow;
    }
  }

  return Object.keys(richStyle).length > 0 ? richStyle : undefined;
}

function buildFilterShadowCss(style: TextNode['style']): string | undefined {
  const resolved = resolveShadowStyle(style);
  if (!resolved) {
    return undefined;
  }
  return `drop-shadow(${resolved.offsetX}px ${resolved.offsetY}px ${resolved.blur}px ${resolved.color})`;
}

function buildBoxShadowCss(style: TextNode['style']): string | undefined {
  const resolved = resolveShadowStyle(style);
  if (!resolved) {
    return undefined;
  }
  const spread = resolved.spread !== 0 ? ` ${resolved.spread}px` : '';
  return `${resolved.offsetX}px ${resolved.offsetY}px ${resolved.blur}px${spread} ${resolved.color}`;
}

function resolveShadowStyle(style: TextNode['style']) {
  if (!style?.shadowColor) {
    return null;
  }

  return {
    color: style.shadowColor,
    blur: style.shadowBlur ?? 0,
    spread: style.shadowSpread ?? 0,
    offsetX: style.shadowOffsetX ?? 0,
    offsetY: style.shadowOffsetY ?? 0,
  };
}

function buildUnifiedBorderCss(style: TextNode['style']): RichBlockStyle | undefined {
  const borderWidth = style?.borderWidth ? formatValue(style.borderWidth.parsed) : undefined;
  const borderColor = style?.borderColor;
  const borderRadius = style?.borderRadius ? formatValue(style.borderRadius.parsed) : undefined;
  if (!borderWidth && !borderColor && !borderRadius) {
    return undefined;
  }

  return {
    ...(borderWidth ? { borderStyle: 'solid' as const, borderWidth } : {}),
    ...(borderColor ? { borderColor } : {}),
    ...(borderRadius ? { borderRadius } : {}),
    ...(borderWidth ? { boxSizing: 'border-box' as const, backgroundClip: 'padding-box' as const } : {}),
  };
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
    content: subtype === 'list'
      ? createTextDocumentContent([listContentToRichListBlock(listContent ?? richListBlockToListContentFallback(getTextContent([block])))])
      : subtype === 'code'
        ? createTextDocumentContent([createRichCodeBlock(getTextContent([block]), codeMetadata)])
        : createTextDocumentContent([createRichTextBlock(htmlTagToRichBlockType(richBlockToHtmlTag(block)), [createRichTextLeaf(getTextContent([block]))], {
          direction: block.direction,
          lineHeight: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? undefined : block.lineHeight,
          style: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? undefined : block.style,
        })]),
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
    content: subtype === 'list'
      ? createTextDocumentContent([listContentToRichListBlock(listContent ?? richListBlockToListContentFallback(getTextContent([block])))])
      : subtype === 'code'
        ? createTextDocumentContent([createRichCodeBlock(getTextContent([block]), codeMetadata)])
        : createTextDocumentContent([createRichTextBlock(htmlTagToRichBlockType(richBlockToHtmlTag(block)), [createRichTextLeaf(getTextContent([block]))], {
          direction: block.direction,
          lineHeight: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? undefined : block.lineHeight,
          style: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? undefined : block.style,
        })]),
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

function richListBlockToListContentFallback(text: string): ListContent {
  return {
    type: 'ul',
    markerStyle: 'disc',
    items: [{ text, direction: 'ltr' }],
  };
}
