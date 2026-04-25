import { createTextNode } from '../model/defaults';
import {
  createTextDocumentContent,
  createTextDocumentFromCode,
  createTextDocumentFromText,
  createRichCodeBlock,
  createRichListBlock,
  createRichTextBlock,
  createRichTextLeaf,
  getSingleCodeBlockContent,
  getSingleListBlockContent,
  getSingleTextBlockContent,
  getTextContent,
  getTextDocumentBlocks,
  listContentToRichListBlock,
  normalizeRichContent,
  richListBlockToListContent,
} from '../model/richContent';
import {
  createUnorderedListContentFromLines,
  getListTextContent,
  listContentToLines,
} from '../model/listContent';
import { splitRichTextNodeDoc } from './textMerge';
import type {
  DocumentModel,
  HeadingTag,
  ListContent,
  NodeId,
  RichBlock,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichListItem,
  RichTextLeaf,
  RichTextBlock,
  TextNode,
  TextDocumentContent,
  TextSubtype,
} from '../model/types';
import { isTextNode } from '../model/types';
import { highlightCode } from '../render/codeHighlight';

export type TextConversionMode = 'auto' | 'flatten' | 'split';

export type TextConversionOptions = {
  mode?: TextConversionMode;
};

export function switchTextSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: TextSubtype,
  options?: TextConversionOptions,
): DocumentModel {
  return convertTextNodeDoc(document, nodeId, targetSubtype, options);
}

export function convertTextNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: TextSubtype,
  options?: TextConversionOptions,
): DocumentModel {
  const node = document.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype === targetSubtype) {
    return document;
  }

  const mode = normalizeTextConversionMode(options?.mode);
  if (mode === 'split' && node.subtype === 'rich' && targetSubtype !== 'rich') {
    return splitRichTextNodeToSubtypeDoc(document, nodeId, targetSubtype);
  }

  const next = cloneDocument(document);
  const textSource = next.nodes[nodeId];
  if (!textSource || !isTextNode(textSource)) {
    return document;
  }

  const base = createTextNode(targetSubtype, textSource.parentId ?? '');
  const content = convertTextContent(textSource, targetSubtype, mode);
  const switched: TextNode = {
    ...base,
    id: textSource.id,
    parentId: textSource.parentId,
    children: [...textSource.children],
    name: textSource.name,
    visible: textSource.visible,
    locked: textSource.locked,
    rect: textSource.rect,
    style: structuredClone(textSource.style),
    ...(textSource.sticky !== undefined ? { sticky: textSource.sticky } : {}),
    ...(textSource.animation !== undefined ? { animation: textSource.animation } : {}),
    content,
    ...(textSource.lang !== undefined ? { lang: textSource.lang } : {}),
    ...(textSource.link !== undefined ? { link: textSource.link } : {}),
    ...(targetSubtype === 'block' && textSource.htmlTag !== undefined
      ? { htmlTag: textSource.htmlTag }
      : {}),
    ...(targetSubtype === 'code'
      ? {
          code: buildCodeMetadata(textSource, content),
        }
      : {}),
  };

  next.nodes[nodeId] = switched;
  return next;
}

export function flattenTextContent(content: TextDocumentContent): string {
  return getTextContent(content.blocks, { blockSeparator: '\n' });
}

function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
    fontLibrary: structuredClone(document.fontLibrary),
    pages: document.pages ? structuredClone(document.pages) : undefined,
    sharedRegionIds: document.sharedRegionIds ? [...document.sharedRegionIds] : undefined,
    siteSettings: document.siteSettings ? structuredClone(document.siteSettings) : undefined,
  };
}

function normalizeTextConversionMode(mode: TextConversionMode | undefined): TextConversionMode {
  if (mode === 'flatten' || mode === 'split') {
    return mode;
  }
  return 'auto';
}

function convertTextContent(
  source: TextNode,
  targetSubtype: TextSubtype,
  _mode: TextConversionMode,
): TextDocumentContent {
  if (targetSubtype === 'list') {
    const richContent = normalizeRichContent(getTextDocumentBlocks(source.content));
    const richListBlock = convertRichBlocksToListBlock(richContent, source.style?.direction);
    if (richListBlock) {
      return createTextDocumentContent([richListBlock]);
    }
    return createTextDocumentContent([listContentToRichListBlock(convertToListContent(source))]);
  }

  if (targetSubtype === 'rich') {
    if (source.subtype === 'list') {
      const listBlock = getSingleListBlockContent(source.content);
      return createTextDocumentContent(
        listBlock
          ? [structuredClone(listBlock)]
          : listContentToRichContent(convertToListContent(source)),
      );
    }

    if (source.subtype === 'code') {
      return createTextDocumentContent([createRichCodeBlock(flattenTextContent(source.content), {
        language: source.code?.language ?? getSingleCodeBlockContent(source.content)?.language,
        theme: source.code?.theme ?? getSingleCodeBlockContent(source.content)?.theme,
        highlightedHtml: source.code?.highlightedHtml ?? getSingleCodeBlockContent(source.content)?.highlightedHtml,
      })], { blockGap: source.content.blockGap });
    }

    return createTextDocumentContent(normalizeRichContent(getTextDocumentBlocks(source.content)), {
      blockGap: source.subtype === 'rich' ? source.content.blockGap : undefined,
    });
  }

  if (source.subtype === 'list') {
    const listBlock = getSingleListBlockContent(source.content);
    const listContent = convertToListContent(source);
    if (targetSubtype === 'code') {
      const plainText = getListTextContent(listContent);
      return createTextDocumentFromCode(plainText, {
        direction: 'ltr',
        language: source.code?.language ?? 'plaintext',
        highlightedHtml: highlightCode(plainText, source.code?.language ?? 'plaintext'),
      });
    }
    if (listBlock) {
      return createTextDocumentContent([
        createRichTextBlock(
          getRichBlockTypeForTextNode(source),
          flattenListBlockInlineChildren(listBlock),
          { direction: source.style?.direction },
        ),
      ]);
    }
    return createTextDocumentFromText(getListTextContent(listContent), {
      type: getRichBlockTypeForTextNode(source),
      direction: source.style?.direction,
    });
  }

  if (source.subtype === 'rich') {
    const richContent = normalizeRichContent(getTextDocumentBlocks(source.content));
    if (richContent.length === 1) {
      return convertSingleRichBlock(richContent[0], targetSubtype);
    }
    if (targetSubtype === 'block') {
      return createTextDocumentContent([
        createRichTextBlock(
          'paragraph',
          flattenRichBlocksInlineChildren(richContent),
          { direction: source.style?.direction },
        ),
      ]);
    }
  }

  const flat = flattenTextContent(source.content);
  if (targetSubtype === 'code') {
    return createTextDocumentFromCode(flat, {
      direction: 'ltr',
      language: source.code?.language ?? 'plaintext',
      highlightedHtml: highlightCode(flat, source.code?.language ?? 'plaintext'),
    });
  }

  return createTextDocumentFromText(flat, {
    type: getRichBlockTypeForTextNode(source),
    direction: source.style?.direction,
  });
}

function convertToListContent(source: TextNode): ListContent {
  if (source.subtype === 'list') {
    const listBlock = getSingleListBlockContent(source.content);
    return listBlock ? richListBlockToListContent(listBlock) : createUnorderedListContentFromLines(['']);
  }

  if (source.subtype === 'code') {
    return createUnorderedListContentFromLines(splitLinesForListItems(flattenTextContent(source.content)));
  }

  if (source.subtype === 'rich') {
    const richContent = normalizeRichContent(getTextDocumentBlocks(source.content));
    if (richContent.length === 1) {
      return richBlockToListContent(richContent[0]);
    }
  }

  const rawContent = flattenTextContent(source.content);
  const lines = rawContent.split(/\r?\n/);
  return createUnorderedListContentFromLines(lines);
}

function listContentToRichContent(content: ListContent): RichContent {
  if (content.type === 'ul' || content.type === 'ol') {
    return [listContentToRichListBlock(content)];
  }

  return listContentToLines(content).map((line) =>
    createRichTextBlock('paragraph', [createRichTextLeaf(line)]),
  );
}

function getRichBlockTypeForTextNode(source: TextNode): 'paragraph' | 'blockquote' | 'div' | HeadingTag {
  if (source.subtype !== 'block') {
    const blockType = getSingleTextBlockContent(source.content)?.type;
    return blockType === 'blockquote'
      ? 'blockquote'
      : blockType && blockType !== 'paragraph' && blockType !== 'div'
        ? blockType as HeadingTag
        : 'paragraph';
  }

  if (source.htmlTag === 'blockquote') {
    return 'blockquote';
  }

  if (source.htmlTag && source.htmlTag !== 'p') {
    return source.htmlTag;
  }

  return 'paragraph';
}

function buildCodeMetadata(
  source: TextNode,
  content: TextDocumentContent,
): NonNullable<TextNode['code']> {
  const language = source.code?.language ?? 'plaintext';
  const theme = source.code?.theme ?? 'light';
  const rawContent = flattenTextContent(content);
  return {
    language,
    theme,
    highlightedHtml: highlightCode(rawContent, language),
  };
}

function richBlockToListContent(block: RichBlock): ListContent {
  if (block.type === 'ul') {
    return {
      type: 'ul',
      markerStyle: block.markerStyle,
      items: block.children.map((item) => ({
        text: flattenRichInlineChildren(item.children),
        direction: 'ltr',
      })),
    };
  }

  if (block.type === 'ol') {
    return {
      type: 'ol',
      start: block.start,
      markerStyle: block.markerStyle,
      items: block.children.map((item) => ({
        text: flattenRichInlineChildren(item.children),
        direction: 'ltr',
      })),
    };
  }

  if (block.type === 'code-block') {
    return createUnorderedListContentFromLines(
      splitLinesForListItems(block.children.map((line) => line.children.map((leaf) => leaf.text).join('')).join('\n')),
    );
  }

  return createUnorderedListContentFromLines(flattenRichInlineChildren(block.children).split(/\r?\n/));
}

function convertSingleRichBlock(
  block: RichBlock,
  targetSubtype: Exclude<TextSubtype, 'rich'>,
): TextDocumentContent {
  if (targetSubtype === 'list') {
    return createTextDocumentContent([
      convertSingleRichBlockToList(block) ?? listContentToRichListBlock(richBlockToListContent(block)),
    ]);
  }

  if (targetSubtype === 'code') {
    if (block.type === 'code-block') {
      const code = block.children.map((line) => line.children.map((leaf) => leaf.text).join('')).join('\n');
      return createTextDocumentFromCode(code, {
        direction: 'ltr',
        language: block.language,
        theme: block.theme,
        highlightedHtml: block.highlightedHtml,
        style: block.style,
      });
    }
    return createTextDocumentFromCode(getTextContent([block]), {
      direction: 'ltr',
      language: 'plaintext',
      highlightedHtml: highlightCode(getTextContent([block]), 'plaintext'),
    });
  }

  if (isRichTextBlockForStandaloneBlock(block)) {
    return createTextDocumentContent([{
      ...block,
      children: cloneInlineNodes(block.children),
    }]);
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return createTextDocumentContent([
      createRichTextBlock('paragraph', flattenListBlockInlineChildren(block), { direction: block.direction }),
    ]);
  }

  return createTextDocumentFromText(getTextContent([block]), {
    type: 'paragraph',
    direction: block.direction,
  });
}

function isRichTextBlockForStandaloneBlock(block: RichBlock): block is RichTextBlock {
  return block.type !== 'code-block' && block.type !== 'ul' && block.type !== 'ol';
}

function flattenRichInlineChildren(children: RichInlineNode[]): string {
  return children.flatMap((node) => ('type' in node ? node.children.map((leaf) => leaf.text) : [node.text ?? ''])).join('');
}

function cloneInlineNodes(nodes: RichInlineNode[]): RichInlineNode[] {
  const cloned = structuredClone(nodes) as RichInlineNode[];
  return cloned.length > 0 ? cloned : [createRichTextLeaf('')];
}

function flattenListBlockInlineChildren(block: Extract<RichBlock, { type: 'ul' | 'ol' }>): RichInlineNode[] {
  return block.children.flatMap((item, index) => [
    ...(index > 0 ? [createRichTextLeaf('\n')] : []),
    ...cloneInlineNodes(item.children),
  ]);
}

function flattenRichBlockInlineChildren(block: RichBlock): RichInlineNode[] {
  if (isRichTextBlockForStandaloneBlock(block)) {
    return cloneInlineNodes(block.children);
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return flattenListBlockInlineChildren(block);
  }

  return block.children.flatMap((line, index) => [
    ...(index > 0 ? [createRichTextLeaf('\n')] : []),
    ...cloneInlineNodes(line.children),
  ]);
}

function flattenRichBlocksInlineChildren(blocks: RichBlock[]): RichInlineNode[] {
  const children = blocks.flatMap((block, index) => [
    ...(index > 0 ? [createRichTextLeaf('\n')] : []),
    ...flattenRichBlockInlineChildren(block),
  ]);
  return children.length > 0 ? children : [createRichTextLeaf('')];
}

function convertRichBlocksToListBlock(
  blocks: RichBlock[],
  fallbackDirection?: RichListItem['direction'],
): RichListBlock | null {
  if (blocks.length === 0) {
    return null;
  }

  if (blocks.length === 1) {
    return convertSingleRichBlockToList(blocks[0], fallbackDirection);
  }

  return createRichListBlock(
    'ul',
    splitInlineChildrenIntoListItems(flattenRichBlocksInlineChildren(blocks), fallbackDirection),
    { direction: fallbackDirection, markerStyle: 'disc' },
  );
}

function convertSingleRichBlockToList(
  block: RichBlock,
  fallbackDirection?: RichListItem['direction'],
): RichListBlock | null {
  if (block.type === 'ul' || block.type === 'ol') {
    return structuredClone(block);
  }

  if (!isRichTextBlockForStandaloneBlock(block)) {
    return null;
  }

  return createRichListBlock(
    'ul',
    splitInlineChildrenIntoListItems(block.children, block.direction),
    { direction: fallbackDirection ?? block.direction, markerStyle: 'disc' },
  );
}

function splitInlineChildrenIntoListItems(
  children: RichInlineNode[],
  direction?: RichListItem['direction'],
): RichListItem[] {
  const items: RichInlineNode[][] = [[]];
  const currentChildren = () => items[items.length - 1];
  const startNextItem = () => {
    items.push([]);
  };

  for (const child of children) {
    if (isRichTextLinkNode(child)) {
      for (const leaf of child.children) {
        appendLeafSegments(leaf, startNextItem, (segment) => {
          currentChildren().push(createSplitRichTextLink(child, [segment]));
        });
      }
      continue;
    }

    appendLeafSegments(child, startNextItem, (segment) => {
      currentChildren().push(segment);
    });
  }

  return items.map((itemChildren) => ({
    type: 'list-item',
    ...(direction ? { direction } : {}),
    children: itemChildren.length > 0 ? itemChildren : [createRichTextLeaf('')],
  }));
}

function appendLeafSegments(
  leaf: RichTextLeaf,
  startNextItem: () => void,
  appendSegment: (segment: RichTextLeaf) => void,
): void {
  const segments = leaf.text.split(/\r?\n/);
  segments.forEach((segment, index) => {
    if (index > 0) {
      startNextItem();
    }
    if (segment.length > 0) {
      appendSegment({ ...leaf, text: segment });
    }
  });
}

function isRichTextLinkNode(node: RichInlineNode): node is Extract<RichInlineNode, { type: 'link' }> {
  return 'type' in node && node.type === 'link';
}

function createSplitRichTextLink(
  link: Extract<RichInlineNode, { type: 'link' }>,
  children: RichTextLeaf[],
): Extract<RichInlineNode, { type: 'link' }> {
  return {
    ...link,
    children,
  };
}

function splitLinesForListItems(text: string): string[] {
  return text.split(/\r?\n/);
}

function splitRichTextNodeToSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: Exclude<TextSubtype, 'rich'>,
): DocumentModel {
  const source = document.nodes[nodeId];
  if (!source || !isTextNode(source) || source.subtype !== 'rich') {
    return document;
  }

  const richContent = normalizeRichContent(getTextDocumentBlocks(source.content));
  if (richContent.length <= 1) {
    return convertTextNodeDoc(document, nodeId, targetSubtype, { mode: 'flatten' });
  }

  let next = splitRichTextNodeDoc(document, nodeId);
  const parentId = source.parentId;
  if (!parentId) {
    return document;
  }

  const parent = next.nodes[parentId];
  if (!parent || source.parentId == null) {
    return document;
  }

  const anchorIndex = parent.children.indexOf(nodeId);
  if (anchorIndex === -1) {
    return document;
  }

  const splitChildIds = parent.children.slice(anchorIndex, anchorIndex + richContent.length);

  for (const childId of splitChildIds) {
    const child = next.nodes[childId];
    if (!child || !isTextNode(child) || child.parentId !== parentId || child.subtype === 'rich') {
      continue;
    }

    if (!isSplitChildSupportedByTargetSubtype(child, targetSubtype)) {
      next = convertTextNodeDoc(next, childId, 'rich', { mode: 'flatten' });
    }
  }

  return next;
}

function isSplitChildSupportedByTargetSubtype(
  child: TextNode,
  targetSubtype: Exclude<TextSubtype, 'rich'>,
): boolean {
  return child.subtype === targetSubtype;
}
