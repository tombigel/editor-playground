import { createTextNode } from '../model/defaults';
import {
  createRichTextBlock,
  createRichTextLeaf,
  getTextContent,
  normalizeRichContent,
} from '../model/richContent';
import {
  createUnorderedListContentFromLines,
  getListTextContent,
  listContentToLines,
  listContentToMarkdown,
  normalizeListContent,
} from '../model/listContent';
import { splitRichTextNodeDoc } from './textMerge';
import type {
  DocumentModel,
  HeadingTag,
  ListContent,
  NodeId,
  RichContent,
  TextNode,
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
    return splitRichTextNodeDoc(document, nodeId);
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

export function flattenTextContent(content: string | RichContent | ListContent): string {
  if (typeof content === 'string') {
    return content;
  }
  if ('type' in content && !Array.isArray(content)) {
    return getListTextContent(content);
  }
  return getTextContent(content, { blockSeparator: '\n' });
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
  mode: TextConversionMode,
): string | RichContent | ListContent {
  if (targetSubtype === 'list') {
    return convertToListContent(source);
  }

  if (targetSubtype === 'rich') {
    if (source.subtype === 'list') {
      return listContentToRichContent(normalizeListContent(source.content));
    }

    if (typeof source.content !== 'string') {
      return normalizeRichContent(source.content);
    }

    return [
      createRichTextBlock(
        getRichBlockTypeForTextNode(source),
        [createRichTextLeaf(source.content)],
      ),
    ];
  }

  if (typeof source.content === 'string') {
    return source.content;
  }

  if (source.subtype === 'list') {
    const listContent = normalizeListContent(source.content);
    if (targetSubtype === 'code') {
      return listContentToMarkdown(listContent);
    }
    return getListTextContent(listContent);
  }

  if (mode === 'auto' || mode === 'flatten') {
    return flattenTextContent(source.content);
  }

  return flattenTextContent(source.content);
}

function convertToListContent(source: TextNode): ListContent {
  if (source.subtype === 'list') {
    return normalizeListContent(source.content);
  }

  if (source.subtype === 'code') {
    return createUnorderedListContentFromLines([source.content as string]);
  }

  const rawContent = typeof source.content === 'string'
    ? source.content
    : flattenTextContent(source.content);
  const lines = rawContent.split(/\r?\n/);
  return createUnorderedListContentFromLines(lines);
}

function listContentToRichContent(content: ListContent): RichContent {
  return listContentToLines(content).map((line) =>
    createRichTextBlock('paragraph', [createRichTextLeaf(line)]),
  );
}

function getRichBlockTypeForTextNode(source: TextNode): 'paragraph' | 'blockquote' | 'div' | HeadingTag {
  if (source.subtype !== 'block') {
    return 'paragraph';
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
  content: string | RichContent | ListContent,
): NonNullable<TextNode['code']> {
  const language = source.code?.language ?? 'plaintext';
  const theme = source.code?.theme ?? 'light';
  const rawContent = typeof content === 'string' ? content : flattenTextContent(content);
  return {
    language,
    theme,
    highlightedHtml: highlightCode(rawContent, language),
  };
}
