import { describe, expect, it } from 'vitest';
import { createInitialDocument, createTextNode } from '../../../model/defaults';
import { createTextDocumentFromText } from '../../../model/richContent';
import type { DocumentModel } from '../../../model/types';
import { isContainerNode } from '../../../model/types';
import type { EditorState } from '../../../editor/types/index';
import {
  getActivePage,
  getDocumentTree,
  getNodeById,
  getPageList,
  getSelection,
  getValidationErrors,
  searchNodesByText,
  searchNodesByType,
} from '../queryTools';

const KNOWN_TEXT = 'The quick brown fox jumps over the lazy dog';

/** Builds a document fixture with a known, searchable text node appended to an existing container. */
function createFixtureDocument(): DocumentModel {
  const document = createInitialDocument();
  const parentContainer = Object.values(document.nodes).find(isContainerNode);
  if (!parentContainer) {
    throw new Error('Expected fixture document to contain at least one container node');
  }

  const textNode = createTextNode('block', parentContainer.id);
  textNode.content = createTextDocumentFromText(KNOWN_TEXT);

  return {
    ...document,
    nodes: {
      ...document.nodes,
      [parentContainer.id]: { ...parentContainer, children: [...parentContainer.children, textNode.id] },
      [textNode.id]: textNode,
    },
  };
}

function createFixtureEditorState(document: DocumentModel, overrides: Partial<EditorState> = {}): EditorState {
  return {
    document,
    activePageId: document.pages?.[0]?.id ?? null,
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: {
      showHidden: false,
      previewSticky: false,
      animationPreview: {
        enabled: false,
        mode: 'passive',
        triggers: { entrance: false, ongoing: false, scroll: false, mouse: false, click: false, hover: false },
      },
      spacerVisibility: 'selected',
      showGridLanes: false,
      showDebugInfo: false,
      snapSettings: {
        guideSnap: { enabled: true, threshold: 8, power: 1, maxSpeedPxPerSecond: 1200 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
      themeMode: 'auto',
      accentColor: '#1668ff',
      lightTheme: 'air',
      darkTheme: 'monokai',
      focusedMode: null,
      startupFocusedMode: null,
      inspectorCollapsed: false,
      temporaryInspectorOpen: false,
      focusedPanelOffset: { x: 0, y: 0 },
    },
    ...overrides,
  };
}

describe('api/ai/queryTools', () => {
  it('getDocumentTree: returns a nested read projection rooted at document.rootId without mutating the document', () => {
    const document = createFixtureDocument();
    const before = structuredClone(document);

    const tree = getDocumentTree(document);

    expect(tree).not.toBeNull();
    expect(tree?.id).toBe(document.rootId);
    expect(tree?.contentType).toBe('site');
    expect(tree?.children.length).toBe(document.nodes[document.rootId]?.children.length);
    // Projection must not be (or alias) a full DocumentModel/DocumentNode.
    expect(tree).not.toHaveProperty('rootId');
    expect(tree).not.toHaveProperty('nodes');
    expect(document).toEqual(before);
  });

  it('getNodeById: thin-wraps getNode and returns undefined (not null) for a missing id', () => {
    const document = createFixtureDocument();
    const before = structuredClone(document);

    const found = getNodeById(document, document.rootId);
    const missing = getNodeById(document, 'nonexistent-node-id');

    expect(found?.id).toBe(document.rootId);
    expect(missing).toBeUndefined();
    expect(document).toEqual(before);
  });

  it('getSelection: reads selectedId/selectedIds off EditorState without mutating it', () => {
    const document = createFixtureDocument();
    const someNodeId = Object.keys(document.nodes)[1] ?? document.rootId;
    const editorState = createFixtureEditorState(document, {
      selectedId: someNodeId,
      selectedIds: [someNodeId],
    });
    const before = structuredClone(editorState);

    const selection = getSelection(editorState);

    expect(selection).toEqual({ selectedId: someNodeId, selectedIds: [someNodeId] });
    expect(editorState).toEqual(before);
  });

  it('searchNodesByType: filters document.nodes by contentType without mutating the document', () => {
    const document = createFixtureDocument();
    const before = structuredClone(document);

    const containers = searchNodesByType(document, 'container');
    const textNodes = searchNodesByType(document, 'text');
    const mediaNodes = searchNodesByType(document, 'media');

    expect(containers.every((node) => node.contentType === 'container')).toBe(true);
    expect(textNodes.every((node) => node.contentType === 'text')).toBe(true);
    expect(mediaNodes.every((node) => node.contentType === 'media')).toBe(true);
    expect(containers.length).toBeGreaterThan(0);
    expect(textNodes.length).toBeGreaterThan(0);
    expect(document).toEqual(before);
  });

  it('searchNodesByText: finds text nodes by case-insensitive flattened content without mutating the document', () => {
    const document = createFixtureDocument();
    const before = structuredClone(document);

    const foundLower = searchNodesByText(document, 'quick brown fox');
    const foundUpper = searchNodesByText(document, 'QUICK BROWN FOX');
    const notFound = searchNodesByText(document, 'no such phrase anywhere');

    expect(foundLower.length).toBe(1);
    expect(foundLower[0]?.contentType).toBe('text');
    expect(foundUpper.length).toBe(1);
    expect(foundUpper[0]?.id).toBe(foundLower[0]?.id);
    expect(notFound.length).toBe(0);
    expect(document).toEqual(before);
  });

  it('getPageList: thin-wraps document.pages without mutating the document', () => {
    const document = createFixtureDocument();
    const before = structuredClone(document);

    const pages = getPageList(document);

    expect(pages).toEqual(document.pages ?? []);
    expect(document).toEqual(before);
  });

  it('getActivePage: resolves editorState.activePageId against document.pages, falling back to the home page', () => {
    const document = createFixtureDocument();
    const pages = document.pages ?? [];
    expect(pages.length).toBeGreaterThan(0);
    const targetPage = pages[0]!;

    const editorStateWithActive = createFixtureEditorState(document, { activePageId: targetPage.id });
    const editorStateWithoutActive = createFixtureEditorState(document, { activePageId: null });
    const beforeDoc = structuredClone(document);
    const beforeState = structuredClone(editorStateWithActive);

    const resolved = getActivePage(document, editorStateWithActive);
    const fallback = getActivePage(document, editorStateWithoutActive);

    expect(resolved?.id).toBe(targetPage.id);
    expect(fallback?.id).toBe(targetPage.id); // home page in the fixture
    expect(document).toEqual(beforeDoc);
    expect(editorStateWithActive).toEqual(beforeState);
  });

  it('getValidationErrors: thin-wraps validateDocument + validateLinks without mutating the document', () => {
    const document = createFixtureDocument();
    const before = structuredClone(document);

    const errors = getValidationErrors(document);

    expect(Array.isArray(errors)).toBe(true);
    expect(errors).toEqual([]);
    expect(document).toEqual(before);
  });
});
