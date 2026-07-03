import { getNode, validateDocument, validateLinks } from '../documentApi';
import type { DocumentModel, DocumentNode, NodeId } from '../documentApi';
import { getHomePage } from '../pageApi';
import { flattenTextContent } from '../textConversion';
import type { EditorState } from '../../editor/types/index';
import type { DocumentPage } from '../../model/types/site';

/**
 * Read-only projections over `DocumentModel`/`EditorState` for the AI query
 * tool surface (see `AI_TOOL_MANIFEST` in `./toolManifest`). Every function
 * here is a pure, side-effect-free wrapper/composition over existing,
 * already-tested selectors — none of them mutate their inputs, and none of
 * them return a full `DocumentModel`, so it is structurally obvious these
 * cannot be mistaken for mutation commands.
 */

/**
 * A lightweight, serializable projection of a single document node, nested
 * with its children. Deliberately omits style/rect/content payloads — an
 * LLM reasoning about document structure needs ids, types, and hierarchy,
 * not the full node shape (use `getNodeById` for the full node).
 */
export type AiDocumentTreeNode = {
  id: NodeId;
  contentType: DocumentNode['contentType'];
  subtype: string | null;
  name: string;
  visible: boolean;
  children: AiDocumentTreeNode[];
};

function toTreeNode(document: DocumentModel, nodeId: NodeId): AiDocumentTreeNode | null {
  const node = document.nodes[nodeId];
  if (!node) {
    return null;
  }
  return {
    id: node.id,
    contentType: node.contentType,
    subtype: 'subtype' in node ? node.subtype : null,
    name: node.name,
    visible: node.visible,
    children: node.children
      .map((childId) => toTreeNode(document, childId))
      .filter((child): child is AiDocumentTreeNode => child !== null),
  };
}

/**
 * Returns a lightweight, nested tree projection of the document starting at
 * `document.rootId` — ids, content types, subtypes, names, and
 * parent/child structure, without full node payloads.
 */
export function getDocumentTree(document: DocumentModel): AiDocumentTreeNode | null {
  return toTreeNode(document, document.rootId);
}

/**
 * Thin wrapper over `getNode`, returning `undefined` (rather than `null`)
 * for a missing node, matching common lookup-tool conventions.
 */
export function getNodeById(document: DocumentModel, nodeId: NodeId): DocumentNode | undefined {
  return getNode(document, nodeId) ?? undefined;
}

/**
 * Read-only projection of the current editor selection.
 */
export function getSelection(editorState: EditorState): { selectedId: NodeId | null; selectedIds: NodeId[] } {
  return {
    selectedId: editorState.selectedId,
    selectedIds: editorState.selectedIds,
  };
}

/**
 * Filters `document.nodes` by top-level content type.
 */
export function searchNodesByType(
  document: DocumentModel,
  contentType: 'container' | 'text' | 'media',
): DocumentNode[] {
  return Object.values(document.nodes).filter((node) => node.contentType === contentType);
}

/**
 * Finds text nodes whose flattened text content includes `query`
 * (case-insensitive). Reuses `flattenTextContent` rather than writing new
 * text-extraction logic.
 */
export function searchNodesByText(document: DocumentModel, query: string): DocumentNode[] {
  const needle = query.toLowerCase();
  return Object.values(document.nodes).filter((node) => {
    if (node.contentType !== 'text') {
      return false;
    }
    return flattenTextContent(node.content).toLowerCase().includes(needle);
  });
}

/**
 * Thin wrapper over `document.pages`.
 */
export function getPageList(document: DocumentModel): DocumentPage[] {
  return document.pages ?? [];
}

/**
 * Resolves the currently active page from `editorState.activePageId`,
 * falling back to the document's home page (via `getHomePage`) when no
 * page is explicitly active.
 */
export function getActivePage(document: DocumentModel, editorState: EditorState): DocumentPage | null {
  const pages = document.pages ?? [];
  if (editorState.activePageId) {
    const active = pages.find((page) => page.id === editorState.activePageId);
    if (active) {
      return active;
    }
  }
  return getHomePage(document);
}

/**
 * Thin wrapper over `validateDocument`/`validateLinks`, returning a single
 * flat list of human-readable validation error strings.
 */
export function getValidationErrors(document: DocumentModel): string[] {
  const structuralErrors = validateDocument(document);
  const linkErrors = validateLinks(document).map((error) => error.description);
  return [...structuralErrors, ...linkErrors];
}
