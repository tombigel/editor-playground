import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialDocument, createLeaf } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import type { DocumentModel, TextLeaf, WrapperNode } from '../../model/types';
import {
  DEFAULT_EDITOR_ACCENT_COLOR,
  DEFAULT_EDITOR_DARK_THEME,
  DEFAULT_EDITOR_LIGHT_THEME,
} from '../../lib/theme';
import { DEFAULT_SNAP_SETTINGS } from '../types';
import { DEFAULT_FOCUSED_PANEL_OFFSET } from '../focusedPanelPosition';
import {
  cloneDocument,
  clearPersistedState,
  clearSessionState,
  createFactoryResetState,
  createInitialState,
  createUniqueLeaf,
  DEFAULT_DOCUMENT_STORAGE_KEY,
  isStructuralWrapper,
  loadPersistedState,
  normalizeDocument,
  normalizeTextHtmlTag,
  parseImportedDocumentJson,
  persistState,
  STORAGE_KEY,
} from '../editorPersistence';

function createWindowStorageStub() {
  const storage = new Map<string, string>();
  return {
    location: {
      search: '',
    },
    localStorage: {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      clear() {
        storage.clear();
      },
    },
  };
}

function getRoot(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    throw new Error('Expected site root');
  }
  return root;
}

function buildMinimalDocument(): DocumentModel {
  const doc = createInitialDocument();
  return doc;
}

describe('editor/editorPersistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── normalizeTextHtmlTag ─────────────────────────────────────────

  describe('normalizeTextHtmlTag', () => {
    it('returns valid heading tags unchanged', () => {
      expect(normalizeTextHtmlTag('h1')).toBe('h1');
      expect(normalizeTextHtmlTag('h2')).toBe('h2');
      expect(normalizeTextHtmlTag('h3')).toBe('h3');
      expect(normalizeTextHtmlTag('h4')).toBe('h4');
      expect(normalizeTextHtmlTag('h5')).toBe('h5');
      expect(normalizeTextHtmlTag('h6')).toBe('h6');
    });

    it('returns valid non-heading tags unchanged', () => {
      expect(normalizeTextHtmlTag('p')).toBe('p');
      expect(normalizeTextHtmlTag('blockquote')).toBe('blockquote');
      expect(normalizeTextHtmlTag('div')).toBe('div');
    });

    it('falls back to p for undefined', () => {
      expect(normalizeTextHtmlTag(undefined)).toBe('p');
    });

    it('falls back to p for unknown tags', () => {
      expect(normalizeTextHtmlTag('span' as TextLeaf['htmlTag'])).toBe('p');
      expect(normalizeTextHtmlTag('section' as TextLeaf['htmlTag'])).toBe('p');
      expect(normalizeTextHtmlTag('' as TextLeaf['htmlTag'])).toBe('p');
    });
  });

  // ─── isStructuralWrapper ──────────────────────────────────────────

  describe('isStructuralWrapper', () => {
    it('returns true for section, header, and footer', () => {
      expect(isStructuralWrapper('section')).toBe(true);
      expect(isStructuralWrapper('header')).toBe(true);
      expect(isStructuralWrapper('footer')).toBe(true);
    });

    it('returns false for container', () => {
      expect(isStructuralWrapper('container')).toBe(false);
    });
  });

  // ─── normalizeDocument ────────────────────────────────────────────

  describe('normalizeDocument', () => {
    it('returns a deep clone that does not share references with the input', () => {
      const doc = buildMinimalDocument();
      const normalized = normalizeDocument(doc);
      expect(normalized).not.toBe(doc);
      expect(normalized.nodes).not.toBe(doc.nodes);
    });

    it('preserves valid document structure through round-trip', () => {
      const doc = buildMinimalDocument();
      const normalized = normalizeDocument(doc);
      const root = getRoot(normalized);
      expect(root.type).toBe('site');
      expect(root.children.length).toBeGreaterThanOrEqual(2);
    });

    it('ensures header and footer exist when missing', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);
      // Strip all children that are headers/footers
      const strippedChildren = root.children.filter((id) => {
        const node = doc.nodes[id];
        return !(node?.type === 'wrapper' && (node.role === 'header' || node.role === 'footer'));
      });
      // Remove header/footer nodes
      for (const id of root.children) {
        const node = doc.nodes[id];
        if (node?.type === 'wrapper' && (node.role === 'header' || node.role === 'footer')) {
          delete doc.nodes[id];
          // Also remove their children
          for (const childId of node.children) {
            delete doc.nodes[childId];
          }
        }
      }
      root.children = strippedChildren;

      const normalized = normalizeDocument(doc);
      const normalizedRoot = getRoot(normalized);
      const wrappers = normalizedRoot.children
        .map((id) => normalized.nodes[id])
        .filter((n): n is WrapperNode => n?.type === 'wrapper');

      expect(wrappers.some((w) => w.role === 'header')).toBe(true);
      expect(wrappers.some((w) => w.role === 'footer')).toBe(true);
    });

    it('normalizes text htmlTag fields to valid values', () => {
      const doc = buildMinimalDocument();
      // Find a text leaf that is NOT a starter shell title (those get overridden by normalizeStarterShellTextTags)
      const textNode = Object.values(doc.nodes).find(
        (n): n is TextLeaf =>
          n.type === 'leaf' &&
          n.role === 'text' &&
          n.name !== 'Product Title' &&
          n.name !== 'Footer Title',
      );
      if (textNode) {
        textNode.htmlTag = 'span' as TextLeaf['htmlTag'];
      }

      const normalized = normalizeDocument(doc);
      if (textNode) {
        const normalizedText = normalized.nodes[textNode.id] as TextLeaf;
        expect(normalizedText.htmlTag).toBe('p');
      }
    });

    it('normalizes container sticky target from contentWrapper to self', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);
      // Find a section to use as parent
      const sectionId = root.children.find((id) => {
        const node = doc.nodes[id];
        return node?.type === 'wrapper' && node.role === 'section';
      });
      if (!sectionId) {
        return;
      }
      const section = doc.nodes[sectionId] as WrapperNode;

      // Create a container child manually
      const _container = createLeaf('text', sectionId) as unknown as WrapperNode;
      // Simulate a wrapper node manually for the purpose of this test
      const containerId = `container_test_${Date.now()}`;
      doc.nodes[containerId] = {
        id: containerId,
        type: 'wrapper',
        role: 'container',
        parentId: sectionId,
        children: [],
        name: 'Test Container',
        visible: true,
        locked: false,
        rect: section.rect,
        style: { ...section.style },
        sticky: {
          enabled: true,
          target: 'contentWrapper',
          durationMode: 'auto',
          duration: parseUnitValue('50vh'),
          durationTop: parseUnitValue('50vh'),
          durationBottom: parseUnitValue('50vh'),
          edges: { top: true, bottom: false },
        },
      } as unknown as WrapperNode;
      section.children.push(containerId);

      const normalized = normalizeDocument(doc);
      const normalizedContainer = normalized.nodes[containerId];
      if (normalizedContainer?.type === 'wrapper') {
        expect(normalizedContainer.sticky?.target).toBe('self');
      }
    });

    it('forces opaque background on structural wrappers', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (section) {
        section.style.background = '#33669980';
      }

      const normalized = normalizeDocument(doc);
      if (section) {
        const normalizedSection = normalized.nodes[section.id] as WrapperNode;
        // Should not contain alpha channel
        expect(normalizedSection.style.background).not.toContain('80');
      }
    });

    it('normalizes sticky definition defaults when sticky is partially defined', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (section) {
        section.sticky = { enabled: true } as unknown as WrapperNode['sticky'];
      }

      const normalized = normalizeDocument(doc);
      if (section) {
        const normalizedSection = normalized.nodes[section.id] as WrapperNode;
        expect(normalizedSection.sticky?.enabled).toBe(true);
        expect(normalizedSection.sticky?.target).toBe('self');
        expect(normalizedSection.sticky?.durationMode).toBe('auto');
        expect(normalizedSection.sticky?.edges).toEqual({ top: true, bottom: false });
      }
    });

    it('migrates legacy dual-edge sticky to single edge using offset heuristic', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (section) {
        section.sticky = {
          enabled: true,
          target: 'self',
          durationMode: 'auto',
          duration: parseUnitValue('50vh'),
          durationTop: parseUnitValue('50vh'),
          durationBottom: parseUnitValue('50vh'),
          edges: { top: true, bottom: true },
          offsetTop: undefined,
          offsetBottom: parseUnitValue('20px'),
        } as unknown as WrapperNode['sticky'];
      }

      const normalized = normalizeDocument(doc);
      if (section) {
        const s = normalized.nodes[section.id] as WrapperNode;
        // With offsetBottom but no offsetTop, should keep bottom and disable top
        expect(s.sticky?.edges?.top).toBe(false);
        expect(s.sticky?.edges?.bottom).toBe(true);
      }
    });
  });

  // ─── cloneDocument ────────────────────────────────────────────────

  describe('cloneDocument', () => {
    it('produces a deep clone with same rootId', () => {
      const doc = buildMinimalDocument();
      const clone = cloneDocument(doc);
      expect(clone.rootId).toBe(doc.rootId);
      expect(clone.nodes).not.toBe(doc.nodes);
      expect(clone.fontLibrary).not.toBe(doc.fontLibrary);
    });

    it('does not share node references between original and clone', () => {
      const doc = buildMinimalDocument();
      const clone = cloneDocument(doc);
      const firstNodeId = Object.keys(doc.nodes)[0];
      const originalNode = doc.nodes[firstNodeId];
      const clonedNode = clone.nodes[firstNodeId];

      expect(clonedNode).toEqual(originalNode);
      expect(clonedNode).not.toBe(originalNode);
    });

    it('does not share fontLibrary references between original and clone', () => {
      const doc = buildMinimalDocument();
      const clone = cloneDocument(doc);

      if (doc.fontLibrary.usedFamilies.length > 0) {
        expect(clone.fontLibrary.usedFamilies).not.toBe(doc.fontLibrary.usedFamilies);
        expect(clone.fontLibrary.usedFamilies).toEqual(doc.fontLibrary.usedFamilies);
      }
    });

    it('mutations to clone do not affect original', () => {
      const doc = buildMinimalDocument();
      const clone = cloneDocument(doc);
      const nodeId = Object.keys(clone.nodes)[0];

      clone.nodes[nodeId].name = 'MUTATED';
      expect(doc.nodes[nodeId].name).not.toBe('MUTATED');
    });
  });

  // ─── createInitialState ───────────────────────────────────────────

  describe('createInitialState', () => {
    it('creates a valid initial state with no selection', () => {
      const state = createInitialState();
      expect(state.selectedId).toBeNull();
      expect(state.selectedIds).toEqual([]);
      expect(state.pendingRoleSwap).toBeNull();
    });

    it('creates a document with a site root', () => {
      const state = createInitialState();
      const root = state.document.nodes[state.document.rootId];
      expect(root).toBeDefined();
      expect(root.type).toBe('site');
    });

    it('creates default UI settings', () => {
      const state = createInitialState();
      expect(state.ui.previewSticky).toBe(true);
      expect(state.ui.spacerVisibility).toBe('selected');
      expect(state.ui.showGridLanes).toBe(false);
      expect(state.ui.snapSettings.guideSnap.enabled).toBe(true);
      expect(state.ui.snapSettings.guideSnap.maxSpeedPxPerSecond).toBe(1200);
      expect(state.ui.themeMode).toBe('auto');
      expect(state.ui.focusedMode).toBeNull();
      expect(state.ui.startupFocusedMode).toBeNull();
      expect(state.ui.inspectorCollapsed).toBe(false);
      expect(state.ui.temporaryInspectorOpen).toBe(false);
    });

    it('includes header, section, and footer in the document', () => {
      const state = createInitialState();
      const root = getRoot(state.document);
      const wrappers = root.children
        .map((id) => state.document.nodes[id])
        .filter((n): n is WrapperNode => n?.type === 'wrapper');

      expect(wrappers.some((w) => w.role === 'header')).toBe(true);
      expect(wrappers.some((w) => w.role === 'section')).toBe(true);
      expect(wrappers.some((w) => w.role === 'footer')).toBe(true);
    });
  });

  // ─── createFactoryResetState ──────────────────────────────────────

  describe('createFactoryResetState', () => {
    it('returns a fresh document with no selection', () => {
      const reset = createFactoryResetState();
      expect(reset.selectedId).toBeNull();
      expect(reset.selectedIds).toEqual([]);
      expect(reset.pendingRoleSwap).toBeNull();
    });

    it('uses default UI when no ui argument provided', () => {
      const reset = createFactoryResetState();
      expect(reset.ui.themeMode).toBe('auto');
      expect(reset.ui.previewSticky).toBe(true);
    });

    it('preserves provided UI settings but clears temporaryInspectorOpen', () => {
      const reset = createFactoryResetState({
        previewSticky: false,
        animationPreview: {
          enabled: false,
          mode: 'passive',
          triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
        },
        spacerVisibility: 'all',
        showGridLanes: true,
        showDebugInfo: false,
        snapSettings: { ...DEFAULT_SNAP_SETTINGS, guideSnap: { ...DEFAULT_SNAP_SETTINGS.guideSnap, enabled: false } },
        themeMode: 'dark',
        focusedMode: 'sticky',
        startupFocusedMode: 'sticky',
        inspectorCollapsed: true,
        temporaryInspectorOpen: true,
        accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
        lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
        darkTheme: DEFAULT_EDITOR_DARK_THEME,
        focusedPanelOffset: DEFAULT_FOCUSED_PANEL_OFFSET,
      });

      expect(reset.ui.previewSticky).toBe(false);
      expect(reset.ui.themeMode).toBe('dark');
      expect(reset.ui.temporaryInspectorOpen).toBe(false);
    });

    it('creates a document distinct from createInitialState', () => {
      const initial = createInitialState();
      const reset = createFactoryResetState();
      expect(reset.document).not.toBe(initial.document);
    });
  });

  // ─── persistState / loadPersistedState ────────────────────────────

  describe('persistState and loadPersistedState', () => {
    it('round-trips state through localStorage', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      persistState(state);

      const loaded = loadPersistedState();
      expect(loaded.document.rootId).toBe(state.document.rootId);
      expect(Object.keys(loaded.document.nodes).length).toBeGreaterThan(0);
    });

    it('returns initial state when no persisted data exists', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const loaded = loadPersistedState();
      expect(loaded.selectedId).toBeNull();
      expect(loaded.document.nodes[loaded.document.rootId]).toBeDefined();
    });

    it('returns initial state when localStorage contains invalid JSON', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);
      windowStub.localStorage.setItem(STORAGE_KEY, '{not valid json');

      const loaded = loadPersistedState();
      expect(loaded.selectedId).toBeNull();
      expect(loaded.document.nodes[loaded.document.rootId].type).toBe('site');
    });

    it('returns initial state when persisted document fails validation', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      // Persist a state with an invalid document (missing root node)
      windowStub.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          document: {
            rootId: 'nonexistent',
            nodes: {},
            fontLibrary: { defaults: [], favorites: [], usedFamilies: [] },
          },
          selectedId: null,
          selectedIds: [],
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapSettings: DEFAULT_SNAP_SETTINGS,
            themeMode: 'auto',
            focusedMode: null,
            startupFocusedMode: null,
            inspectorCollapsed: false,
            temporaryInspectorOpen: false,
          },
        }),
      );

      const loaded = loadPersistedState();
      // Should fall back to initial state since document is invalid
      const root = loaded.document.nodes[loaded.document.rootId];
      expect(root).toBeDefined();
      expect(root.type).toBe('site');
    });

    it('clears pendingRoleSwap when persisting', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      const stateWithSwap = {
        ...state,
        pendingRoleSwap: {
          requestedId: 'some_id',
          targetRole: 'header' as const,
          existingId: 'other_id',
        },
      };
      persistState(stateWithSwap);

      const raw = JSON.parse(windowStub.localStorage.getItem(STORAGE_KEY)!);
      expect(raw.pendingRoleSwap).toBeNull();
    });

    it('normalizes spacerVisibility to "selected" when invalid', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      windowStub.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          ui: { ...state.ui, spacerVisibility: 'invalid_value' },
        }),
      );

      const loaded = loadPersistedState();
      expect(loaded.ui.spacerVisibility).toBe('selected');
    });

    it('normalizes missing UI fields to defaults', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      windowStub.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          ui: {},
        }),
      );

      const loaded = loadPersistedState();
      expect(loaded.ui.previewSticky).toBe(true);
      expect(loaded.ui.snapSettings.guideSnap.enabled).toBe(true);
      expect(loaded.ui.snapSettings.guideSnap.maxSpeedPxPerSecond).toBe(1200);
      expect(loaded.ui.showGridLanes).toBe(false);
    });

    it('backfills missing guide snap max speed for older persisted state', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      windowStub.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          ui: {
            ...state.ui,
            snapSettings: {
              guideSnap: {
                enabled: true,
                threshold: 8,
                power: 1,
              },
              containerSnap: {
                enabled: true,
                threshold: 0,
                power: 1,
              },
            },
          },
        }),
      );

      const loaded = loadPersistedState();
      expect(loaded.ui.snapSettings.guideSnap.maxSpeedPxPerSecond).toBe(1200);
    });

    it('drops selectedId that references a missing node', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      windowStub.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          selectedId: 'nonexistent_node_999',
          selectedIds: ['nonexistent_node_999'],
        }),
      );

      const loaded = loadPersistedState();
      expect(loaded.selectedId).toBeNull();
      expect(loaded.selectedIds).toEqual([]);
    });

    it('is a no-op in server environment (no window)', () => {
      // persistState should not throw when window is undefined
      const _original = globalThis.window;
      vi.stubGlobal('window', undefined);

      expect(() => persistState(createInitialState())).not.toThrow();
      const loaded = loadPersistedState();
      expect(loaded.selectedId).toBeNull();
    });
  });

  // ─── clearSessionState / clearPersistedState ──────────────────────

  describe('clearSessionState', () => {
    it('removes session storage key but keeps default document', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      windowStub.localStorage.setItem(STORAGE_KEY, 'some-data');
      windowStub.localStorage.setItem(DEFAULT_DOCUMENT_STORAGE_KEY, 'default-doc');

      clearSessionState();

      expect(windowStub.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(windowStub.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)).toBe('default-doc');
    });

    it('is a no-op in server environment', () => {
      vi.stubGlobal('window', undefined);
      expect(() => clearSessionState()).not.toThrow();
    });
  });

  describe('clearPersistedState', () => {
    it('removes both session and default document storage keys', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      windowStub.localStorage.setItem(STORAGE_KEY, 'some-data');
      windowStub.localStorage.setItem(DEFAULT_DOCUMENT_STORAGE_KEY, 'default-doc');

      clearPersistedState();

      expect(windowStub.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(windowStub.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)).toBeNull();
    });

    it('is a no-op in server environment', () => {
      vi.stubGlobal('window', undefined);
      expect(() => clearPersistedState()).not.toThrow();
    });
  });

  // ─── parseImportedDocumentJson ────────────────────────────────────

  describe('parseImportedDocumentJson', () => {
    it('parses a valid document JSON string', () => {
      const doc = buildMinimalDocument();
      const json = JSON.stringify(doc);
      const parsed = parseImportedDocumentJson(json);

      expect(parsed.rootId).toBe(doc.rootId);
      expect(parsed.nodes[parsed.rootId]).toBeDefined();
      expect(parsed.nodes[parsed.rootId].type).toBe('site');
    });

    it('throws on invalid JSON syntax', () => {
      expect(() => parseImportedDocumentJson('{bad json')).toThrow('Import failed: invalid JSON.');
    });

    it('throws on empty string', () => {
      expect(() => parseImportedDocumentJson('')).toThrow('Import failed: invalid JSON.');
    });

    it('throws on non-document structures (e.g., editor state object)', () => {
      const state = createInitialState();
      expect(() => parseImportedDocumentJson(JSON.stringify(state))).toThrow(
        'Import failed: invalid document structure.',
      );
    });

    it('throws on document with missing root node', () => {
      const invalidDoc = {
        rootId: 'missing_root',
        nodes: {},
        fontLibrary: { defaults: [], favorites: [], usedFamilies: [] },
      };
      expect(() => parseImportedDocumentJson(JSON.stringify(invalidDoc))).toThrow('Import failed:');
    });

    it('throws on a plain number', () => {
      expect(() => parseImportedDocumentJson('42')).toThrow('Import failed:');
    });

    it('throws on a plain array', () => {
      expect(() => parseImportedDocumentJson('[]')).toThrow('Import failed:');
    });

    it('throws on null', () => {
      expect(() => parseImportedDocumentJson('null')).toThrow('Import failed:');
    });

    it('normalizes imported documents (adds missing header/footer)', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);

      // Create a minimal valid doc with only a site root and no children
      const minimalDoc = {
        rootId: doc.rootId,
        nodes: {
          [root.id]: {
            ...root,
            children: [],
          },
        },
        fontLibrary: doc.fontLibrary,
      };

      const parsed = parseImportedDocumentJson(JSON.stringify(minimalDoc));
      const parsedRoot = getRoot(parsed);
      const wrappers = parsedRoot.children
        .map((id) => parsed.nodes[id])
        .filter((n): n is WrapperNode => n?.type === 'wrapper');

      expect(wrappers.some((w) => w.role === 'header')).toBe(true);
      expect(wrappers.some((w) => w.role === 'footer')).toBe(true);
    });

    it('migrates legacy repository links in imported documents', () => {
      const doc = buildMinimalDocument();
      // Find a link node and set legacy href
      const linkNode = Object.values(doc.nodes).find(
        (n) => n.type === 'leaf' && n.role === 'link',
      );
      if (linkNode && linkNode.type === 'leaf' && linkNode.role === 'link') {
        linkNode.label = 'github.com/tombigel/codex-playground';
        linkNode.href = 'https://github.com/tombigel/codex-playground';
      }

      const parsed = parseImportedDocumentJson(JSON.stringify(doc));
      if (linkNode) {
        const migrated = parsed.nodes[linkNode.id];
        if (migrated?.type === 'leaf' && migrated.role === 'link') {
          expect(migrated.label).toBe('github.com/tombigel/sticky-playground');
          expect(migrated.href).toBe('https://github.com/tombigel/sticky-playground');
        }
      }
    });
  });

  // ─── createUniqueLeaf ─────────────────────────────────────────────

  describe('createUniqueLeaf', () => {
    it('creates a leaf node with the correct role and parentId', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);
      const sectionId = root.children.find((id) => {
        const node = doc.nodes[id];
        return node?.type === 'wrapper' && node.role === 'section';
      });
      if (!sectionId) {
        throw new Error('Expected section');
      }

      const leaf = createUniqueLeaf(doc, 'text', sectionId);
      expect(leaf.type).toBe('leaf');
      expect(leaf.role).toBe('text');
      expect(leaf.parentId).toBe(sectionId);
    });

    it('returns a node with an id not already in the document', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);
      const sectionId = root.children[0];

      const leaf = createUniqueLeaf(doc, 'text', sectionId);
      expect(doc.nodes[leaf.id]).toBeUndefined();
    });

    it('generates different ids on repeated calls', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);
      const sectionId = root.children[0];

      const leaf1 = createUniqueLeaf(doc, 'text', sectionId);
      const leaf2 = createUniqueLeaf(doc, 'text', sectionId);
      expect(leaf1.id).not.toBe(leaf2.id);
    });

    it('works for all leaf roles', () => {
      const doc = buildMinimalDocument();
      const root = getRoot(doc);
      const sectionId = root.children[0];

      for (const role of ['text', 'image', 'link', 'button'] as const) {
        const leaf = createUniqueLeaf(doc, role, sectionId);
        expect(leaf.role).toBe(role);
        expect(leaf.type).toBe('leaf');
      }
    });
  });

  // ─── loadPersistedState edge cases ────────────────────────────────

  describe('loadPersistedState edge cases', () => {
    it('seeds default document from session state when default key is missing', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      windowStub.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // No DEFAULT_DOCUMENT_STORAGE_KEY set

      loadPersistedState();

      // ensureDefaultDocumentSeeded should have seeded it from the session state
      const seeded = windowStub.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY);
      expect(seeded).not.toBeNull();
      if (seeded) {
        const parsed = JSON.parse(seeded) as DocumentModel;
        expect(parsed.rootId).toBe(state.document.rootId);
      }
    });

    it('seeds factory default when session state is also invalid', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      windowStub.localStorage.setItem(STORAGE_KEY, '{invalid}');
      // No DEFAULT_DOCUMENT_STORAGE_KEY set

      const loaded = loadPersistedState();
      // Should have seeded a factory default
      const seeded = windowStub.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY);
      expect(seeded).not.toBeNull();
      expect(loaded.document.nodes[loaded.document.rootId].type).toBe('site');
    });

    it('does not re-seed default document when it already exists', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const existingDefault = JSON.stringify(buildMinimalDocument());
      windowStub.localStorage.setItem(DEFAULT_DOCUMENT_STORAGE_KEY, existingDefault);
      windowStub.localStorage.setItem(STORAGE_KEY, JSON.stringify(createInitialState()));

      loadPersistedState();

      // Should keep the existing default, not overwrite
      expect(windowStub.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)).toBe(existingDefault);
    });

    it('migrates legacy selectedId array format to selectedIds', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      const firstNodeId = Object.keys(state.document.nodes).find(
        (id) => id !== state.document.rootId,
      );

      windowStub.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          selectedId: firstNodeId,
          // selectedIds is missing - legacy format
        }),
      );

      const loaded = loadPersistedState();
      // Should normalize selectedIds from the single selectedId
      if (firstNodeId && loaded.document.nodes[firstNodeId]) {
        expect(loaded.selectedIds).toContain(firstNodeId);
      }
    });
  });

  // ─── normalizeDocument: sticky migration edge cases ───────────────

  describe('normalizeDocument sticky migration', () => {
    it('defaults sticky edges.top to true when bottom is false and top is undefined', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (!section) return;

      section.sticky = {
        enabled: true,
        edges: { bottom: false },
      } as unknown as WrapperNode['sticky'];

      const normalized = normalizeDocument(doc);
      const s = normalized.nodes[section.id] as WrapperNode;
      expect(s.sticky?.edges?.top).toBe(true);
      expect(s.sticky?.edges?.bottom).toBe(false);
    });

    it('defaults sticky edges.top to false when bottom is true and top is undefined', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (!section) return;

      section.sticky = {
        enabled: true,
        edges: { bottom: true },
      } as unknown as WrapperNode['sticky'];

      const normalized = normalizeDocument(doc);
      const s = normalized.nodes[section.id] as WrapperNode;
      expect(s.sticky?.edges?.top).toBe(false);
      expect(s.sticky?.edges?.bottom).toBe(true);
    });

    it('resolves dual-edge conflict using offsetTop heuristic', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (!section) return;

      section.sticky = {
        enabled: true,
        edges: { top: true, bottom: true },
        offsetTop: parseUnitValue('10px'),
        offsetBottom: undefined,
      } as unknown as WrapperNode['sticky'];

      const normalized = normalizeDocument(doc);
      const s = normalized.nodes[section.id] as WrapperNode;
      // With offsetTop but no offsetBottom, should keep top and disable bottom
      expect(s.sticky?.edges?.top).toBe(true);
      expect(s.sticky?.edges?.bottom).toBe(false);
    });

    it('leaves undefined sticky as undefined', () => {
      const doc = buildMinimalDocument();
      const section = Object.values(doc.nodes).find(
        (n): n is WrapperNode => n.type === 'wrapper' && n.role === 'section',
      );
      if (!section) return;

      section.sticky = undefined;

      const normalized = normalizeDocument(doc);
      const s = normalized.nodes[section.id] as WrapperNode;
      expect(s.sticky).toBeUndefined();
    });
  });

  // ─── showDebugInfo persistence ────────────────────────────────────

  describe('showDebugInfo defaults and persistence', () => {
    it('showDebugInfo defaults to false in createDefaultUiState', () => {
      const state = createInitialState();
      expect(state.ui.showDebugInfo).toBe(false);
    });

    it('showDebugInfo is loaded from persisted state', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      const modifiedState = { ...state, ui: { ...state.ui, showDebugInfo: true } };
      persistState(modifiedState);

      const loaded = loadPersistedState();
      expect(loaded.ui.showDebugInfo).toBe(true);
    });

    it('showDebugInfo falls back to false when absent from persisted state', () => {
      const windowStub = createWindowStorageStub();
      vi.stubGlobal('window', windowStub);

      const state = createInitialState();
      const { showDebugInfo, ...uiWithoutDebugInfo } = state.ui;
      const modifiedState = { ...state, ui: uiWithoutDebugInfo as typeof state.ui };
      window.localStorage.setItem('sticky-playground.editor-state.v1', JSON.stringify(modifiedState));

      const loaded = loadPersistedState();
      expect(loaded.ui.showDebugInfo).toBe(false);
    });
  });
});
