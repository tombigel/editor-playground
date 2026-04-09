import { createTextNode } from '../model/defaults';
import {
  createTextDocumentContent,
  createTextDocumentFromCode,
  createTextDocumentFromText,
  createRichCodeBlock,
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
  listContentToMarkdown,
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
    return createTextDocumentContent([listContentToRichListBlock(convertToListContent(source))]);
  }

  if (targetSubtype === 'rich') {
    if (source.subtype === 'list') {
      return createTextDocumentContent(listContentToRichContent(convertToListContent(source)));
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
    const listContent = convertToListContent(source);
    if (targetSubtype === 'code') {
      return createTextDocumentFromCode(listContentToMarkdown(listContent), {
        direction: 'ltr',
        language: source.code?.language ?? 'plaintext',
        highlightedHtml: highlightCode(listContentToMarkdown(listContent), source.code?.language ?? 'plaintext'),
      });
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
    return createUnorderedListContentFromLines([flattenTextContent(source.content)]);
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
    return createUnorderedListContentFromLines([
      block.children.map((line) => line.children.map((leaf) => leaf.text).join('')).join('\n'),
    ]);
  }

  return createUnorderedListContentFromLines(flattenRichInlineChildren(block.children).split(/\r?\n/));
}

function convertSingleRichBlock(
  block: RichBlock,
  targetSubtype: Exclude<TextSubtype, 'rich'>,
): TextDocumentContent {
  if (targetSubtype === 'list') {
    return createTextDocumentContent([listContentToRichListBlock(richBlockToListContent(block))]);
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

  return createTextDocumentFromText(getTextContent([block]), {
    type: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? 'paragraph' : block.type,
    direction: block.direction,
    lineHeight: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? undefined : block.lineHeight,
    style: block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? undefined : block.style,
  });
}

function flattenRichInlineChildren(children: RichInlineNode[]): string {
  return children.flatMap((node) => ('type' in node ? node.children.map((leaf) => leaf.text) : [node.text ?? ''])).join('');
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

    next = convertTextNodeDoc(next, childId, targetSubtype, { mode: 'flatten' });
  }

  return next;
}
