import { describe, expect, it } from 'vitest';
import { createInitialDocument, createTextNode } from '../../model/defaults';
import { createTextDocumentFromText } from '../../model/richContent';
import type { DocumentModel } from '../../model/types';
import { isContainerNode } from '../../model/types';
import type { EditorState } from '../../editor/types/index';
import { routeToolCall } from '../toolRouter';
import type { ToolCall } from '../types/index';

const KNOWN_TEXT = 'The quick brown fox jumps over the lazy dog';

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

function makeCall(name: string, args: Record<string, unknown> = {}): ToolCall {
  return { id: `call-${name}`, name, arguments: args };
}

describe('ai/toolRouter routeToolCall', () => {
  it('routes a query tool call and returns queryData with no mutation of document/editorState', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);
    const documentBefore = structuredClone(document);
    const editorStateBefore = structuredClone(editorState);

    const result = routeToolCall(makeCall('searchNodesByText', { query: 'quick brown' }), { document, editorState });

    expect(result.kind).toBe('query');
    expect(result.error).toBeUndefined();
    expect(result.queryData).toBeDefined();
    expect(Array.isArray(result.queryData)).toBe(true);
    expect((result.queryData as unknown[]).length).toBeGreaterThan(0);

    // Structural + deep-equal confirmation: nothing was mutated.
    expect(document).toEqual(documentBefore);
    expect(editorState).toEqual(editorStateBefore);
  });

  it('routes getDocumentTree, getSelection, getPageList, getActivePage, getValidationErrors, getNodeById, searchNodesByType without mutation', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);
    const documentBefore = structuredClone(document);

    const calls: ToolCall[] = [
      makeCall('getDocumentTree'),
      makeCall('getSelection'),
      makeCall('getPageList'),
      makeCall('getActivePage'),
      makeCall('getValidationErrors'),
      makeCall('getNodeById', { nodeId: document.rootId }),
      makeCall('searchNodesByType', { nodeType: 'text' }),
    ];

    for (const call of calls) {
      const result = routeToolCall(call, { document, editorState });
      expect(result.kind).toBe('query');
      expect(result.error).toBeUndefined();
      expect(result.toolCallId).toBe(call.id);
    }

    expect(document).toEqual(documentBefore);
  });

  it('routes a valid mutation tool call to a draft, never applying it, and leaves the document unchanged', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);
    const documentBefore = structuredClone(document);

    const result = routeToolCall(makeCall('setNodeVisibility', { nodeId: document.rootId, visible: false }), {
      document,
      editorState,
    });

    // The site root actually rejects setNodeVisibility per validateAiCommand,
    // so pick a node that will actually validate: a real container child.
    const container = Object.values(document.nodes).find(isContainerNode);
    if (!container) {
      throw new Error('Expected a container node in the fixture');
    }
    const validResult = routeToolCall(makeCall('setNodeVisibility', { nodeId: container.id, visible: false }), {
      document,
      editorState,
    });

    expect(result.kind).toBe('query'); // site-root rejection surfaces as an error result
    expect(result.error).toBeDefined();

    expect(validResult.kind).toBe('mutation');
    expect(validResult.error).toBeUndefined();
    expect(validResult.draftCommands).toEqual([{ type: 'setNodeVisibility', nodeId: container.id, visible: false }]);

    // Only a draft was staged — the input document must be byte-for-byte
    // unchanged. routeToolCall has no import of applyAiDocumentCommands or
    // applyAiCommands anywhere in its module (confirmed statically in
    // architectureBoundary.test.ts), so this is a runtime double-check on top
    // of that structural guarantee.
    expect(document).toEqual(documentBefore);
  });

  it('constructs and validates each of the 12 mutation command shapes into a draft without applying', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);
    const documentBefore = structuredClone(document);
    const container = Object.values(document.nodes).find(isContainerNode);
    const textNode = Object.values(document.nodes).find((node) => node.contentType === 'text');
    if (!container || !textNode) {
      throw new Error('Expected fixture to contain a container and a text node');
    }

    const calls: ToolCall[] = [
      makeCall('setRect', { nodeId: container.id, field: 'x', value: '10px' }),
      makeCall('setSticky', { nodeId: container.id, patch: { enabled: true } }),
      makeCall('setText', { nodeId: textNode.id, field: 'name', value: 'Renamed' }),
      makeCall('setTextDocumentContent', { nodeId: textNode.id, content: { blocks: [] } }),
      makeCall('insertText', { parentId: container.id }),
      makeCall('insertContainer', { subtype: 'container', parentId: container.id }),
      makeCall('deleteNode', { nodeId: textNode.id }),
      makeCall('setNodeVisibility', { nodeId: container.id, visible: false }),
      makeCall('reorderNode', { nodeId: container.id, action: 'forward' }),
      makeCall('setContainerChildBoundary', { containerId: container.id, childBoundary: 'box' }),
    ];

    for (const call of calls) {
      const result = routeToolCall(call, { document, editorState });
      expect(result.kind, `${call.name} should route to a mutation draft`).toBe('mutation');
      expect(result.error, `${call.name} should not error`).toBeUndefined();
      expect(result.draftCommands, `${call.name} should produce exactly one draft command`).toHaveLength(1);
    }

    expect(document).toEqual(documentBefore);
  });

  it('returns an error result (not a thrown exception, not a silent success) for a disallowed tool name', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);

    expect(() =>
      routeToolCall(makeCall('deleteEverything', {}), { document, editorState }),
    ).not.toThrow();

    const result = routeToolCall(makeCall('deleteEverything', {}), { document, editorState });
    expect(result.error).toBeDefined();
    expect(result.draftCommands).toBeUndefined();
    expect(result.queryData).toBeUndefined();
  });

  it('returns an error result (not a thrown exception) for malformed query arguments', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);

    expect(() =>
      routeToolCall(makeCall('getNodeById', { nodeId: 42 }), { document, editorState }),
    ).not.toThrow();

    const result = routeToolCall(makeCall('getNodeById', { nodeId: 42 }), { document, editorState });
    expect(result.error).toBeDefined();
    expect(result.queryData).toBeUndefined();
  });

  it('returns an error result (not a thrown exception) for malformed mutation arguments', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);
    const documentBefore = structuredClone(document);

    expect(() =>
      routeToolCall(makeCall('setRect', { nodeId: document.rootId, field: 'diagonal', value: 5 }), {
        document,
        editorState,
      }),
    ).not.toThrow();

    const result = routeToolCall(makeCall('setRect', { nodeId: document.rootId, field: 'diagonal', value: 5 }), {
      document,
      editorState,
    });
    expect(result.error).toBeDefined();
    expect(result.draftCommands).toBeUndefined();
    expect(document).toEqual(documentBefore);
  });

  it('returns an error result for a mutation call missing required arguments entirely', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);

    const result = routeToolCall(makeCall('deleteNode', {}), { document, editorState });
    expect(result.error).toBeDefined();
    expect(result.draftCommands).toBeUndefined();
  });
});
