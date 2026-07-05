import {
  createButtonTextNode,
  createContainerNode,
  createLinkTextNode,
  createMediaNode,
  createSectionFromTemplate,
  createTextNode,
  syncIdCountersWithDocument,
  type SectionTemplateId,
} from '../../model/defaults';
import { normalizeDocumentFontState } from '../../fonts';
import { TEXT_NODE_DEFAULTS } from '../../model/textNodeDefaults';
import { createTextDocumentFromText, getTextContent } from '../../model/richContent';
import type { PageId } from '../../model/types/site';
import type { ContainerNode, ContainerSubtype, DocumentModel, DocumentNode, NodeId, TextNode } from '../../model/types';
import { isContainerNode } from '../../model/types';
import { highlightCode, normalizeCodeLanguage } from '../../render/codeHighlight';
import { cloneDocument } from './shared';
import type { LeafInsertionRole, SectionTemplateInsertionOptions } from './types';

export type InsertContainerOptions = {
  pageId?: PageId | null;
};

/**
 * Insert a container node into the document without requiring EditorState.
 * The container is appended as the last child of `parentId`.
 */
export function insertContainerDoc(
  document: DocumentModel,
  subtype: ContainerSubtype,
  parentId: NodeId,
  options: InsertContainerOptions = {},
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
  if (subtype === 'section' && options.pageId && next.pages) {
    const pageIndex = next.pages.findIndex((page) => page.id === options.pageId);
    if (pageIndex >= 0) {
      next.pages = next.pages.map((page, index) =>
        index === pageIndex ? { ...page, sectionIds: [...page.sectionIds, node.id] } : page,
      );
    }
  }
  return next;
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

export function insertLeafDoc(
  document: DocumentModel,
  role: LeafInsertionRole,
  parentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const parent = next.nodes[parentId];
  if (!parent) {
    return document;
  }

  let node = createLeafNode(role, parentId);
  while (next.nodes[node.id]) {
    node = createLeafNode(role, parentId);
  }

  next.nodes[node.id] = node;
  parent.children.push(node.id);
  return next;
}

function createLeafNode(role: LeafInsertionRole, parentId: NodeId): TextNode | ReturnType<typeof createMediaNode> {
  if (role === 'heading') {
    const node = createTextNode('block', parentId);
    const heading = TEXT_NODE_DEFAULTS.heading;
    return {
      ...node,
      htmlTag: 'h2',
      content: createTextDocumentFromText(heading.content, { type: 'h2' }),
      style: { ...node.style, ...heading.style },
    };
  }

  if (role === 'richtext') {
    return createTextNode('rich', parentId);
  }

  if (role === 'list') {
    return createTextNode('list', parentId);
  }

  if (role === 'code') {
    const node = createTextNode('code', parentId);
    const codeText = getTextContent(node.content.blocks, { blockSeparator: '\n' });
    const language = normalizeCodeLanguage(node.code?.language ?? 'plaintext');
    return {
      ...node,
      code: {
        language,
        ...(node.code?.theme !== undefined ? { theme: node.code.theme } : {}),
        highlightedHtml: highlightCode(codeText, language),
      },
    };
  }

  if (role === 'image') {
    return createMediaNode('image', parentId);
  }

  if (role === 'video') {
    return createMediaNode('video', parentId);
  }

  if (role === 'svg') {
    return createMediaNode('svg', parentId);
  }

  if (role === 'link') {
    const node = createLinkTextNode(parentId);
    return {
      ...node,
      htmlTag: 'div',
      content: createTextDocumentFromText(getTextContent(node.content.blocks, { blockSeparator: '\n' }), { type: 'div' }),
    };
  }

  if (role === 'button') {
    return createButtonTextNode(parentId);
  }

  return createTextNode('block', parentId);
}

function isSiteSectionRole(subtype: ContainerSubtype) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

function findSelectedTopLevelWrapper(
  document: DocumentModel,
  selectedId: NodeId | null | undefined,
): ContainerNode | null {
  if (!selectedId) {
    return null;
  }

  let current: DocumentNode | undefined = document.nodes[selectedId];
  while (current) {
    if (
      isContainerNode(current) &&
      current.parentId === document.rootId &&
      isSiteSectionRole(current.subtype)
    ) {
      return current;
    }
    current = current.parentId ? document.nodes[current.parentId] : undefined;
  }

  return null;
}

function resolveInsertedSectionIndex(
  document: DocumentModel,
  rootChildIds: NodeId[],
  referenceWrapper: ContainerNode | null,
): number {
  if (referenceWrapper) {
    const referenceIndex = rootChildIds.indexOf(referenceWrapper.id);
    if (referenceIndex >= 0) {
      return referenceWrapper.subtype === 'footer' ? referenceIndex : referenceIndex + 1;
    }
  }

  const footerIndex = rootChildIds.findIndex((id) => {
    const node = document.nodes[id];
    return node && isContainerNode(node) && node.subtype === 'footer';
  });
  return footerIndex >= 0 ? footerIndex : rootChildIds.length;
}

function insertSectionIntoPage(
  pages: DocumentModel['pages'],
  pageId: PageId | null | undefined,
  sectionId: NodeId,
  referenceWrapper: ContainerNode | null,
) {
  if (!pages || !pageId) {
    return pages;
  }

  const pageIndex = pages.findIndex((page) => page.id === pageId);
  if (pageIndex < 0) {
    return pages;
  }

  return pages.map((page, index) => {
    if (index !== pageIndex) {
      return page;
    }

    const sectionIds = [...page.sectionIds];
    let insertAt = sectionIds.length;

    if (referenceWrapper?.subtype === 'header') {
      insertAt = 0;
    } else if (referenceWrapper?.subtype === 'section') {
      const referenceIndex = sectionIds.indexOf(referenceWrapper.id);
      if (referenceIndex >= 0) {
        insertAt = referenceIndex + 1;
      }
    }

    sectionIds.splice(insertAt, 0, sectionId);
    return { ...page, sectionIds };
  });
}

export function insertSectionTemplateDoc(
  document: DocumentModel,
  templateId: SectionTemplateId,
  options: SectionTemplateInsertionOptions = {},
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);
  const root = next.nodes[next.rootId];
  if (!root || root.contentType !== 'site') {
    return document;
  }

  const referenceWrapper = findSelectedTopLevelWrapper(next, options.selectedId);
  const build = createSectionFromTemplate(templateId, root.id);
  const insertionIndex = resolveInsertedSectionIndex(next, root.children, referenceWrapper);
  root.children.splice(insertionIndex, 0, build.wrapper.id);
  Object.assign(next.nodes, build.nodes);
  next.pages = insertSectionIntoPage(next.pages, options.pageId, build.wrapper.id, referenceWrapper);

  return normalizeDocumentFontState(next);
}
