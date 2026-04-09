import { createTextNode, nextId, syncIdCountersWithDocument } from '../model/defaults';
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
import { formatValue, parseFontSizeValue, parseHeightValue, parseUnitValue } from '../model/units';
import type {
  DocumentModel,
  ListContent,
  NodeId,
  RichBlock,
  RichBlockStyle,
  RichContent,
  RichTextBlock,
  StandaloneTextNodeSnapshot,
  TextNode,
  TextSubtype,
} from '../model/types';
import { isTextNode } from '../model/types';
import { buildFontFamilyStack, extractPrimaryFontFamily } from '../fonts';

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

  const canonicalBlocks = normalizeRichContent(getTextDocumentBlocks(node.content));
  const canonicalBlock = canonicalBlocks[0];

  if (node.subtype === 'list') {
    if (canonicalBlock?.type === 'ul' || canonicalBlock?.type === 'ol') {
      return [attachStandaloneSnapshot(canonicalBlock, node)];
    }
    return listContentToRichContent(richListBlockToListContent(getTextDocumentBlocks(node.content)[0] as Extract<RichBlock, { type: 'ul' | 'ol' }>), buildRichBlockStyleFromTextNode(node, 'list'), node.style?.direction).map((block) => attachStandaloneSnapshot(block, node));
  }

  if (node.subtype === 'code') {
    if (canonicalBlock?.type === 'code-block') {
      return [attachStandaloneSnapshot(canonicalBlock, node)];
    }
    const text = getTextContent(node.content.blocks, { blockSeparator: '\n' });
    return [attachStandaloneSnapshot(createRichCodeBlock(text, {
      language: node.code?.language,
      theme: node.code?.theme,
      highlightedHtml: node.code?.highlightedHtml,
      direction: node.style?.direction,
      style: buildRichBlockStyleFromTextNode(node, 'code'),
    }), node)];
  }

  if (node.subtype === 'block') {
    if (canonicalBlock && canonicalBlock.type !== 'code-block' && canonicalBlock.type !== 'ul' && canonicalBlock.type !== 'ol') {
      return [attachStandaloneSnapshot(canonicalBlock, node)];
    }
    const text = getTextContent(node.content.blocks);
    return [attachStandaloneSnapshot(createRichTextBlock(
      htmlTagToRichBlockType(node.htmlTag),
      [createRichTextLeaf(text)],
      {
        direction: node.style?.direction,
        lineHeight: node.style?.lineHeight,
        style: buildRichBlockStyleFromTextNode(node, 'text'),
      },
    ), node)];
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

function captureStandaloneTextNodeSnapshot(node: TextNode): StandaloneTextNodeSnapshot {
  const contentBlock = getTextDocumentBlocks(node.content)[0];
  return {
    subtype: node.subtype === 'rich' ? 'block' : node.subtype,
    name: node.name,
    visible: node.visible,
    locked: node.locked,
    rect: structuredClone(node.rect),
    contentBlock: contentBlock ? stripStandaloneSnapshot(structuredClone(contentBlock)) : createRichTextBlock('paragraph', [createRichTextLeaf('')]),
    ...(node.style ? { style: structuredClone(node.style) } : {}),
    ...(node.lang !== undefined ? { lang: node.lang } : {}),
    ...(node.htmlTag !== undefined ? { htmlTag: node.htmlTag } : {}),
    ...(node.link ? { link: structuredClone(node.link) } : {}),
    ...(node.code ? { code: structuredClone(node.code) } : {}),
    ...(node.sticky !== undefined ? { sticky: structuredClone(node.sticky) } : {}),
    ...(node.animation !== undefined ? { animation: structuredClone(node.animation) } : {}),
  };
}

function mergeRichBlockStyle(
  baseStyle: RichBlockStyle | undefined,
  overrideStyle: RichBlockStyle | undefined,
): RichBlockStyle | undefined {
  if (!baseStyle && !overrideStyle) {
    return undefined;
  }

  return {
    ...(baseStyle ?? {}),
    ...(overrideStyle ?? {}),
  };
}

function materializeStandaloneBlockForMerge(block: RichBlock, node: TextNode): RichBlock {
  if (node.subtype === 'block' && block.type !== 'code-block' && block.type !== 'ul' && block.type !== 'ol') {
    return {
      ...structuredClone(block),
      type: htmlTagToRichBlockType(node.htmlTag),
      direction: node.style?.direction ?? block.direction,
      lineHeight: node.style?.lineHeight ?? block.lineHeight,
      style: mergeRichBlockStyle(block.style, buildRichBlockStyleFromTextNode(node, 'text')),
    };
  }

  if (node.subtype === 'code' && block.type === 'code-block') {
    return {
      ...structuredClone(block),
      direction: node.style?.direction ?? block.direction,
      language: node.code?.language ?? block.language,
      theme: node.code?.theme ?? block.theme,
      highlightedHtml: node.code?.highlightedHtml ?? block.highlightedHtml,
      style: mergeRichBlockStyle(block.style, buildRichBlockStyleFromTextNode(node, 'code')),
    };
  }

  if (node.subtype === 'list' && (block.type === 'ul' || block.type === 'ol')) {
    return {
      ...structuredClone(block),
      direction: node.style?.direction ?? block.direction,
      style: mergeRichBlockStyle(block.style, buildRichBlockStyleFromTextNode(node, 'list')),
    };
  }

  return structuredClone(block);
}

function attachStandaloneSnapshot(block: RichBlock, node: TextNode): RichBlock {
  return {
    ...materializeStandaloneBlockForMerge(block, node),
    standalone: captureStandaloneTextNodeSnapshot(node),
  };
}

function stripStandaloneSnapshot<T extends RichBlock>(block: T): T {
  const clone = structuredClone(block);
  delete clone.standalone;
  return clone;
}

function deriveStandaloneStyleFromRichBlock(
  block: RichBlock,
): TextNode['style'] | undefined {
  const style = block.style;
  const nextStyle: TextNode['style'] = {
    ...(block.direction ? { direction: block.direction } : {}),
    ...(style?.color ? { color: style.color } : {}),
    ...(style?.fontFamily ? { fontFamily: extractPrimaryFontFamily(style.fontFamily) } : {}),
    ...(style?.fontSize ? { fontSize: parseFontSizeValue(style.fontSize) } : {}),
    ...(style?.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style?.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(style?.textDecorationLine ? { textDecorationLine: style.textDecorationLine } : {}),
    ...(style?.textAlign ? { textAlign: style.textAlign } : {}),
    ...(block.type !== 'code-block' && block.type !== 'ul' && block.type !== 'ol' && typeof block.lineHeight === 'number' ? { lineHeight: block.lineHeight } : {}),
    ...(block.type === 'code-block' && style?.background ? { background: style.background } : {}),
  };

  return Object.keys(nextStyle).length > 0 ? nextStyle : undefined;
}

function buildStandaloneNodeFromRichBlock(
  baseNode: TextNode,
  block: RichBlock,
  overrides: {
    id: NodeId;
    name: string;
    rect: TextNode['rect'];
    children: NodeId[];
  },
): TextNode {
  const snapshot = block.standalone;
  const subtype = snapshot?.subtype ?? richBlockToTextSubtype(block);
  const base = createTextNode(subtype, baseNode.parentId ?? '');
  const codeMetadata = snapshot?.code ?? (block.type === 'code-block'
    ? {
        language: block.language ?? 'plaintext',
        theme: block.theme ?? 'light',
        highlightedHtml: block.highlightedHtml,
      }
    : undefined);
  const htmlTag = snapshot?.htmlTag ?? (subtype === 'block' ? richBlockToHtmlTag(block) : undefined);
  const style = snapshot?.style
    ? structuredClone(snapshot.style)
    : deriveStandaloneStyleFromRichBlock(block) ?? structuredClone(base.style);

  return {
    ...base,
    id: overrides.id,
    parentId: baseNode.parentId,
    children: [...overrides.children],
    name: snapshot?.name ?? overrides.name,
    visible: snapshot?.visible ?? baseNode.visible,
    locked: snapshot?.locked ?? baseNode.locked,
    rect: snapshot?.rect ? structuredClone(snapshot.rect) : structuredClone(overrides.rect),
    ...(snapshot?.sticky !== undefined
      ? { sticky: structuredClone(snapshot.sticky) }
      : baseNode.sticky !== undefined
        ? { sticky: structuredClone(baseNode.sticky) }
        : {}),
    ...(snapshot?.animation !== undefined
      ? { animation: structuredClone(snapshot.animation) }
      : baseNode.animation !== undefined
        ? { animation: structuredClone(baseNode.animation) }
        : {}),
    content: createTextDocumentContent([snapshot?.contentBlock ? structuredClone(snapshot.contentBlock) : stripStandaloneSnapshot(block)]),
    ...(snapshot?.lang !== undefined
      ? { lang: snapshot.lang }
      : baseNode.lang !== undefined
        ? { lang: baseNode.lang }
        : {}),
    ...(snapshot?.link ? { link: structuredClone(snapshot.link) } : {}),
    ...(subtype === 'block' && htmlTag ? { htmlTag } : {}),
    ...(subtype === 'code' && codeMetadata ? { code: structuredClone(codeMetadata) } : {}),
    style,
  };
}

function createAnchorNodeFromRichBlock(
  source: TextNode,
  block: RichBlock,
): TextNode {
  return buildStandaloneNodeFromRichBlock(source, block, {
    id: source.id,
    name: source.name,
    rect: source.rect,
    children: source.children,
  });
}

function createSplitSiblingNodeFromRichBlock(
  source: TextNode,
  block: RichBlock,
  splitIndex: number,
  yOffsetPx: number,
): TextNode {
  const originYValue = source.rect.y.base.parsed.value;
  return buildStandaloneNodeFromRichBlock(source, block, {
    id: nextId(richBlockToTextSubtype(block) === 'block' ? 'text' : richBlockToTextSubtype(block)),
    name: `${source.name} ${splitIndex + 1}`,
    rect: {
      x: structuredClone(source.rect.x),
      y: { base: parseUnitValue(`${originYValue + yOffsetPx}px`) },
      width: structuredClone(source.rect.width),
      height: { base: parseHeightValue('auto') },
    },
    children: [],
  });
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
