import { createTextNode } from '../model/defaults';
import { isRichTextLink } from '../model/richContent';
import type {
  DocumentModel,
  NodeId,
  RichContent,
  RichTextLeaf,
  TextNode,
  TextSubtype,
} from '../model/types';
import { isTextNode } from '../model/types';
import { highlightCode } from '../render/codeHighlight';

export type TextConversionMode = 'auto' | 'flatten';

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

export function flattenTextContent(content: string | RichContent): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .flatMap((node) =>
      isRichTextLink(node)
        ? node.children.map((leaf) => leaf.text)
        : [(node as RichTextLeaf).text],
    )
    .join('');
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
  return mode === 'flatten' ? 'flatten' : 'auto';
}

function convertTextContent(
  source: TextNode,
  targetSubtype: TextSubtype,
  mode: TextConversionMode,
): string | RichContent {
  if (targetSubtype === 'rich') {
    return typeof source.content === 'string'
      ? [{ text: source.content }]
      : source.content;
  }

  if (typeof source.content === 'string') {
    return source.content;
  }

  if (mode === 'auto' || mode === 'flatten') {
    return flattenTextContent(source.content);
  }

  return flattenTextContent(source.content);
}

function buildCodeMetadata(
  source: TextNode,
  content: string | RichContent,
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
