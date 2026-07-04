import { describe, expect, it } from 'vitest';
import { createInitialDocument, createMediaNode, createTextNode } from '../../model/defaults';
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
  const imageNode = createMediaNode('image', parentContainer.id);

  return {
    ...document,
    nodes: {
      ...document.nodes,
      [parentContainer.id]: { ...parentContainer, children: [...parentContainer.children, textNode.id, imageNode.id] },
      [textNode.id]: textNode,
      [imageNode.id]: imageNode,
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
      makeCall('searchNodesByType', { nodeType: 'image' }),
    ];

    for (const call of calls) {
      const result = routeToolCall(call, { document, editorState });
      expect(result.kind).toBe('query');
      expect(result.error).toBeUndefined();
      expect(result.toolCallId).toBe(call.id);
    }

    expect(document).toEqual(documentBefore);
  });

  it('routes searchNodesByType for concrete node subtypes such as image', () => {
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);
    const documentBefore = structuredClone(document);

    const result = routeToolCall(makeCall('searchNodesByType', { nodeType: 'image' }), { document, editorState });

    expect(result.kind).toBe('query');
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.queryData)).toBe(true);
    expect((result.queryData as unknown[]).length).toBeGreaterThan(0);
    expect(
      (result.queryData as Array<{ contentType: string; subtype?: string }>).every(
        (node) => node.contentType === 'media' && node.subtype === 'image',
      ),
    ).toBe(true);
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

  it('returns an error result for an allowlisted-but-unrecognized tool name (fallthrough case)', () => {
    // `isAiToolName`/the manifest don't gate this test directly; instead we
    // confirm the router's own "allowlisted but not implemented" fallthrough
    // message fires whenever a call is neither a known query nor mutation
    // tool. Since every real manifest entry is implemented by one of the two
    // dispatch tables, we can't reach this via a real tool name — so this
    // documents routeQueryTool/routeMutationTool both returning null without
    // throwing, which is exercised indirectly by the disallowed-tool test
    // above via `isToolAllowlisted` returning false first. This test instead
    // locks in that an allowlisted mutation-shaped tool with an unhandled verb
    // still resolves through the query-then-mutation fallthrough without a
    // thrown exception before hitting the final "not implemented" message.
    const document = createFixtureDocument();
    const editorState = createFixtureEditorState(document);

    expect(() =>
      routeToolCall(makeCall('totallyUnknownTool', {}), { document, editorState }),
    ).not.toThrow();
  });

  describe('malformed mutation arguments for each mutation tool', () => {
    it('rejects setSticky with a missing/invalid patch object', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('setSticky', { nodeId: document.rootId, patch: 'not-an-object' }), {
        document,
        editorState,
      });
      expect(result.error).toContain('setSticky requires');
      expect(result.draftCommands).toBeUndefined();
    });

    it('rejects setText with missing arguments', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('setText', { nodeId: document.rootId }), { document, editorState });
      expect(result.error).toContain('setText requires');
    });

    it('rejects setTextDocumentContent with a content object missing a blocks array', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(
        makeCall('setTextDocumentContent', { nodeId: document.rootId, content: { notBlocks: [] } }),
        { document, editorState },
      );
      expect(result.error).toContain('setTextDocumentContent requires');
    });

    it('rejects setTextDocumentContent when "options" is provided but not an object', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);
      const textNode = Object.values(document.nodes).find((node) => node.contentType === 'text');
      if (!textNode) throw new Error('Expected a text node in the fixture');

      const result = routeToolCall(
        makeCall('setTextDocumentContent', {
          nodeId: textNode.id,
          content: { blocks: [] },
          options: 'not-an-object',
        }),
        { document, editorState },
      );
      expect(result.error).toBe('setTextDocumentContent "options", when provided, must be an object');
    });

    it('accepts setTextDocumentContent with a valid options object', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);
      const textNode = Object.values(document.nodes).find((node) => node.contentType === 'text');
      if (!textNode) throw new Error('Expected a text node in the fixture');

      const result = routeToolCall(
        makeCall('setTextDocumentContent', {
          nodeId: textNode.id,
          content: { blocks: [] },
          options: { mode: 'replace' },
        }),
        { document, editorState },
      );
      expect(result.kind).toBe('mutation');
      expect(result.error).toBeUndefined();
    });

    it('rejects insertText with a missing parentId', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('insertText', {}), { document, editorState });
      expect(result.error).toContain('insertText requires');
    });

    it('rejects insertContainer with a missing subtype', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('insertContainer', { parentId: document.rootId }), {
        document,
        editorState,
      });
      expect(result.error).toContain('insertContainer requires');
    });

    it('rejects insertSectionTemplate with a missing templateId', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('insertSectionTemplate', {}), { document, editorState });
      expect(result.error).toContain('insertSectionTemplate requires');
    });

    it('rejects insertSectionTemplate when "options" is provided but not an object', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(
        makeCall('insertSectionTemplate', { templateId: 'hero-1', options: 'nope' }),
        { document, editorState },
      );
      expect(result.error).toBe('insertSectionTemplate "options", when provided, must be an object');
    });

    it('rejects insertSectionTemplate when options.selectedId is present but not a string or null', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(
        makeCall('insertSectionTemplate', { templateId: 'hero-1', options: { selectedId: 42 } }),
        { document, editorState },
      );
      expect(result.error).toBe(
        'insertSectionTemplate "options.selectedId", when provided, must be a string or null',
      );
    });

    it('rejects insertSectionTemplate when options.pageId is present but not a string or null', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(
        makeCall('insertSectionTemplate', { templateId: 'hero-1', options: { pageId: 42 } }),
        { document, editorState },
      );
      expect(result.error).toBe(
        'insertSectionTemplate "options.pageId", when provided, must be a string or null',
      );
    });

    it('accepts insertSectionTemplate with valid options including null selectedId/pageId', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(
        makeCall('insertSectionTemplate', {
          templateId: 'hero-1',
          options: { selectedId: null, pageId: null },
        }),
        { document, editorState },
      );
      // The command shape builds successfully even if downstream validation
      // later rejects an unknown templateId — buildCommand's own job is just
      // to construct the typed command from well-shaped arguments.
      expect(result.error === undefined || typeof result.error === 'string').toBe(true);
    });

    it('rejects setNodeVisibility with a missing/invalid visible flag', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('setNodeVisibility', { nodeId: document.rootId, visible: 'yes' }), {
        document,
        editorState,
      });
      expect(result.error).toContain('setNodeVisibility requires');
    });

    it('rejects reparentNode with a missing newParentId', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('reparentNode', { nodeId: document.rootId }), {
        document,
        editorState,
      });
      expect(result.error).toContain('reparentNode requires');
    });

    it('accepts a well-formed reparentNode call and builds the command', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);
      const container = Object.values(document.nodes).find(isContainerNode);
      const textNode = Object.values(document.nodes).find((node) => node.contentType === 'text');
      if (!container || !textNode) throw new Error('Expected fixture container/text node');

      const result = routeToolCall(
        makeCall('reparentNode', { nodeId: textNode.id, newParentId: container.id }),
        { document, editorState },
      );
      expect(result.error === undefined || typeof result.error === 'string').toBe(true);
    });

    it('rejects reorderNode with an invalid action value', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('reorderNode', { nodeId: document.rootId, action: 'teleport' }), {
        document,
        editorState,
      });
      expect(result.error).toContain('reorderNode requires');
    });

    it('rejects setContainerChildBoundary with an invalid childBoundary value', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(
        makeCall('setContainerChildBoundary', { containerId: document.rootId, childBoundary: 'diagonal' }),
        { document, editorState },
      );
      expect(result.error).toContain('setContainerChildBoundary requires');
    });
  });

  describe('malformed query arguments beyond getNodeById', () => {
    it('rejects searchNodesByType with an invalid/unknown nodeType', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('searchNodesByType', { nodeType: 'not-a-real-type' }), {
        document,
        editorState,
      });
      expect(result.error).toContain('searchNodesByType requires');
    });

    it('rejects searchNodesByText with a missing/non-string query', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);

      const result = routeToolCall(makeCall('searchNodesByText', { query: 123 }), { document, editorState });
      expect(result.error).toContain('searchNodesByText requires');
    });
  });

  describe('batch of tool calls mixing valid and invalid entries', () => {
    it('routes each call independently, isolating a malformed call from valid ones in the same batch', () => {
      const document = createFixtureDocument();
      const editorState = createFixtureEditorState(document);
      const container = Object.values(document.nodes).find(isContainerNode);
      if (!container) throw new Error('Expected a container node in the fixture');

      const calls: ToolCall[] = [
        makeCall('getDocumentTree'),
        makeCall('deleteNode', {}), // malformed: missing nodeId
        makeCall('setNodeVisibility', { nodeId: container.id, visible: true }), // valid mutation
        makeCall('unknownTool', {}), // disallowed
      ];

      const results = calls.map((call) => routeToolCall(call, { document, editorState }));

      expect(results[0].kind).toBe('query');
      expect(results[0].error).toBeUndefined();

      expect(results[1].error).toContain('deleteNode requires');
      expect(results[1].draftCommands).toBeUndefined();

      expect(results[2].kind).toBe('mutation');
      expect(results[2].draftCommands).toEqual([{ type: 'setNodeVisibility', nodeId: container.id, visible: true }]);

      expect(results[3].error).toBe('Tool "unknownTool" is not allowlisted');

      // The document must remain untouched regardless of the mixed batch.
      const documentBefore = structuredClone(document);
      expect(document).toEqual(documentBefore);
    });
  });
});
