import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveStickyLayout } from '../../sticky/resolve';
import { createInitialDocument } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import {
  clearSessionState,
  confirmPromoteWrapperRole,
  clearPersistedState,
  createFactoryResetState,
  createInitialState,
  DEFAULT_DOCUMENT_STORAGE_KEY,
  deleteNode,
  importDocument,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  nudgeNode,
  parseImportedDocumentJson,
  persistDefaultDocument,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  STORAGE_KEY,
  updateStickyField,
} from '../editorStore';

function getRoot(state: ReturnType<typeof createInitialState>['document']) {
  const root = state.nodes[state.rootId];
  if (!root || root.type !== 'site') {
    throw new Error('Expected site root');
  }
  return root;
}

function createWindowStorageStub() {
  const storage = new Map<string, string>();
  return {
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

describe('editor/editorStore integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults editor theme mode to auto', () => {
    const state = createInitialState();
    expect(state.ui.themeMode).toBe('auto');
  });

  it('normalizes persisted theme mode values', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    const state = createInitialState();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        ui: {
          ...state.ui,
          themeMode: 'night-mode',
        },
      }),
    );

    expect(loadPersistedState().ui.themeMode).toBe('auto');

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        ui: {
          ...state.ui,
          themeMode: 'dark',
        },
      }),
    );

    expect(loadPersistedState().ui.themeMode).toBe('dark');
  });

  it('restores persisted document and UI state while dropping transient editor state', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    const state0 = createInitialState();
    const state1 = insertLeaf(state0, 'text');
    const textId = state1.selectedId;
    if (!textId) {
      throw new Error('Expected inserted text node');
    }

    const nextDocument = structuredClone(state1.document);
    const nextText = nextDocument.nodes[textId];
    if (!nextText || nextText.type !== 'leaf' || nextText.role !== 'text') {
      throw new Error('Expected inserted text leaf');
    }
    nextText.content = 'Persisted text value';

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state1,
        document: nextDocument,
        selectedId: 'missing_node',
        pendingRoleSwap: {
          requestedId: textId,
          targetRole: 'header',
          existingId: textId,
        },
        ui: {
          previewSticky: false,
          spacerVisibility: 'all',
          showGridLanes: true,
          snapEnabled: false,
          themeMode: 'dark',
        },
      }),
    );

    const loaded = loadPersistedState();
    const loadedText = loaded.document.nodes[textId];

    expect(loaded.selectedId).toBeNull();
    expect(loaded.pendingRoleSwap).toBeNull();
    expect(loaded.ui).toEqual({
      previewSticky: false,
      spacerVisibility: 'all',
      showGridLanes: true,
      snapEnabled: false,
      themeMode: 'dark',
    });
    expect(loadedText.type).toBe('leaf');
    if (loadedText.type === 'leaf' && loadedText.role === 'text') {
      expect(loadedText.content).toBe('Persisted text value');
    }
  });

  it('migrates persisted repository links to the sticky-playground repo', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    const state = createInitialState();
    const nextDocument = structuredClone(state.document);
    const repoLink = Object.values(nextDocument.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Repository Link',
    );
    if (!repoLink || repoLink.type !== 'leaf' || repoLink.role !== 'link') {
      throw new Error('Expected repository link');
    }

    repoLink.label = 'github.com/tombigel/codex-playground';
    repoLink.href = 'https://github.com/tombigel/codex-playground';

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        document: nextDocument,
      }),
    );

    const loaded = loadPersistedState();
    const migratedRepoLink = Object.values(loaded.document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Repository Link',
    );

    expect(migratedRepoLink).toBeTruthy();
    if (!migratedRepoLink || migratedRepoLink.type !== 'leaf' || migratedRepoLink.role !== 'link') {
      return;
    }

    expect(migratedRepoLink.label).toBe('github.com/tombigel/sticky-playground');
    expect(migratedRepoLink.href).toBe('https://github.com/tombigel/sticky-playground');
  });

  it('migrates legacy header and footer text tags to semantic defaults', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    const state = createInitialState();
    const nextDocument = structuredClone(state.document);
    const headerTitle = Object.values(nextDocument.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Product Title',
    );
    const footerTitle = Object.values(nextDocument.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Footer Title',
    );

    if (!headerTitle || headerTitle.type !== 'leaf' || headerTitle.role !== 'text') {
      throw new Error('Expected header title');
    }
    if (!footerTitle || footerTitle.type !== 'leaf' || footerTitle.role !== 'text') {
      throw new Error('Expected footer title');
    }

    headerTitle.htmlTag = 'p';
    footerTitle.htmlTag = 'p';

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        document: nextDocument,
      }),
    );

    const loaded = loadPersistedState();
    const migratedHeaderTitle = Object.values(loaded.document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Product Title',
    );
    const migratedFooterTitle = Object.values(loaded.document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Footer Title',
    );

    expect(migratedHeaderTitle && migratedHeaderTitle.type === 'leaf' && migratedHeaderTitle.role === 'text' ? migratedHeaderTitle.htmlTag : null).toBe('h1');
    expect(migratedFooterTitle && migratedFooterTitle.type === 'leaf' && migratedFooterTitle.role === 'text' ? migratedFooterTitle.htmlTag : null).toBe('h2');
  });

  it('migrates untouched legacy default starter sections to the post template', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    localStorage.setItem(
      DEFAULT_DOCUMENT_STORAGE_KEY,
      JSON.stringify({
        rootId: 'site_1',
        nodes: {
          site_1: {
            id: 'site_1',
            type: 'site',
            parentId: null,
            children: ['section_2'],
            name: 'Site',
            visible: true,
            locked: false,
          },
          section_2: {
            id: 'section_2',
            type: 'wrapper',
            role: 'section',
            parentId: 'site_1',
            children: ['text_3', 'button_4'],
            name: 'Section',
            visible: true,
            locked: false,
            rect: {
              x: { base: { raw: '0px', parsed: { value: 0, unit: 'px' } } },
              y: { base: { raw: '0px', parsed: { value: 0, unit: 'px' } } },
              width: { base: { raw: '100%', parsed: { value: 100, unit: '%' } } },
              height: { base: { raw: '480px', parsed: { value: 480, unit: 'px' } } },
            },
            style: {
              background: '#ffffff',
              borderColor: '#b6c2d1',
              borderWidth: { raw: '1px', parsed: { value: 1, unit: 'px' } },
              paddingTop: { raw: '16px', parsed: { value: 16, unit: 'px' } },
              paddingRight: { raw: '16px', parsed: { value: 16, unit: 'px' } },
              paddingBottom: { raw: '16px', parsed: { value: 16, unit: 'px' } },
              paddingLeft: { raw: '16px', parsed: { value: 16, unit: 'px' } },
            },
          },
          text_3: {
            id: 'text_3',
            type: 'leaf',
            role: 'text',
            parentId: 'section_2',
            children: [],
            name: 'Text',
            visible: true,
            locked: false,
            rect: {
              x: { base: { raw: '32px', parsed: { value: 32, unit: 'px' } } },
              y: { base: { raw: '32px', parsed: { value: 32, unit: 'px' } } },
              width: { base: { raw: 'fit-content', parsed: { keyword: 'fit-content' } } },
              height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
            },
            content: 'Edit text',
            style: {
              color: '#16202a',
              fontSize: { raw: '18px', parsed: { value: 18, unit: 'px' } },
            },
          },
          button_4: {
            id: 'button_4',
            type: 'leaf',
            role: 'button',
            parentId: 'section_2',
            children: [],
            name: 'Button',
            visible: true,
            locked: false,
            rect: {
              x: { base: { raw: '32px', parsed: { value: 32, unit: 'px' } } },
              y: { base: { raw: '32px', parsed: { value: 32, unit: 'px' } } },
              width: { base: { raw: 'fit-content', parsed: { keyword: 'fit-content' } } },
              height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
            },
            label: 'Button',
          },
        },
      }),
    );

    const loaded = loadPersistedState();
    const root = getRoot(loaded.document);
    const postSection = Object.values(loaded.document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    expect(root.children).toHaveLength(3);
    expect(postSection).toBeTruthy();
    if (!postSection || postSection.type !== 'wrapper') {
      return;
    }

    expect(postSection.rect.height.base.raw).toBe('50vh');
    expect(Object.values(loaded.document.nodes).some((node) => node.id === 'section_2')).toBe(false);
  });

  it('clears the seeded default document on reset so a fresh post template is recreated', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    localStorage.setItem(
      DEFAULT_DOCUMENT_STORAGE_KEY,
      JSON.stringify({
        rootId: 'site_1',
        nodes: {
          site_1: {
            id: 'site_1',
            type: 'site',
            parentId: null,
            children: [],
            name: 'Site',
            visible: true,
            locked: false,
          },
        },
      }),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createInitialState()));

    clearPersistedState();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)).toBeNull();

    const reloaded = createInitialState();
    const postSection = Object.values(reloaded.document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    expect(postSection).toBeTruthy();
  });

  it('clears only the live session when requested', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(createInitialState()));
    localStorage.setItem(DEFAULT_DOCUMENT_STORAGE_KEY, JSON.stringify(createInitialDocument()));

    clearSessionState();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)).not.toBeNull();
  });

  it('builds a factory reset state while preserving the provided ui settings', () => {
    const state = createInitialState();
    const reset = createFactoryResetState({
      previewSticky: false,
      spacerVisibility: 'all',
      showGridLanes: true,
      snapEnabled: false,
      themeMode: 'dark',
    });

    const postSection = Object.values(reset.document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    expect(reset.selectedId).toBeNull();
    expect(reset.pendingRoleSwap).toBeNull();
    expect(reset.ui).toEqual({
      previewSticky: false,
      spacerVisibility: 'all',
      showGridLanes: true,
      snapEnabled: false,
      themeMode: 'dark',
    });
    expect(postSection).toBeTruthy();
    expect(reset.document).not.toBe(state.document);
  });

  it('persists the provided default document snapshot', () => {
    const windowStub = createWindowStorageStub();
    vi.stubGlobal('window', windowStub);
    const { localStorage } = windowStub;
    const document = createInitialDocument();

    persistDefaultDocument(document);

    expect(localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)).toBe(JSON.stringify(document));
  });

  it('inserts sections before footer and selects the inserted section', () => {
    const initial = createInitialState();
    const rootBefore = getRoot(initial.document);
    const footerBefore = rootBefore.children[rootBefore.children.length - 1];

    const next = insertSectionTemplate(initial, 'blank');
    const rootAfter = getRoot(next.document);

    expect(rootAfter.children[rootAfter.children.length - 1]).toBe(footerBefore);
    expect(rootAfter.children.length).toBe(rootBefore.children.length + 1);
    expect(next.selectedId).toBeTruthy();
    if (!next.selectedId) {
      return;
    }
    const selected = next.document.nodes[next.selectedId];
    expect(selected.type).toBe('wrapper');
    if (selected.type === 'wrapper') {
      expect(selected.role).toBe('section');
      expect(selected.rect.height.base.raw).toBe('50vh');
    }
  });

  it('reorders sections only among section siblings', () => {
    const state0 = createInitialState();
    const state1 = insertSectionTemplate(state0, 'blank');
    const sectionA = state1.selectedId;
    const state2 = insertSectionTemplate(state1, 'blank');
    const sectionB = state2.selectedId;
    if (!sectionA || !sectionB) {
      throw new Error('Expected inserted sections');
    }

    const moved = reorderNode(state2, sectionB, 'back');
    const rootMoved = getRoot(moved.document);
    const indexA = rootMoved.children.indexOf(sectionA);
    const indexB = rootMoved.children.indexOf(sectionB);
    expect(indexB).toBe(indexA - 1);

    const untouched = reorderNode(moved, sectionB, 'sendToBack');
    expect(untouched).toBe(moved);
  });

  it('normalizes container sticky target to self', () => {
    const state0 = createInitialState();
    const state1 = insertWrapper(state0, 'container');
    const containerId = state1.selectedId;
    if (!containerId) {
      throw new Error('Expected selected container');
    }

    const next = updateStickyField(state1, containerId, {
      enabled: true,
      target: 'contentWrapper',
    });
    const node = next.document.nodes[containerId];
    expect(node.type).toBe('wrapper');
    if (node.type === 'wrapper') {
      expect(node.sticky?.target).toBe('self');
    }
  });

  it('prevents cyclic reparenting', () => {
    const state0 = createInitialState();
    const state1 = insertWrapper(state0, 'container');
    const containerA = state1.selectedId;
    if (!containerA) {
      throw new Error('Expected container A');
    }
    const state2 = insertWrapper(state1, 'container');
    const containerB = state2.selectedId;
    if (!containerB) {
      throw new Error('Expected container B');
    }

    const next = reparentNode(state2, containerA, containerB, '0px', '0px');
    expect(next).toBe(state2);
  });

  it('clears selection when selected descendant is deleted via ancestor removal', () => {
    const state0 = createInitialState();
    const state1 = insertWrapper(state0, 'container');
    const containerId = state1.selectedId;
    if (!containerId) {
      throw new Error('Expected container');
    }

    const state2 = insertLeaf(state1, 'text');
    const selectedLeafId = state2.selectedId;
    expect(selectedLeafId).toBeTruthy();

    const next = deleteNode(state2, containerId);
    expect(next.selectedId).toBeNull();
    expect(next.document.nodes[containerId]).toBeUndefined();
    if (selectedLeafId) {
      expect(next.document.nodes[selectedLeafId]).toBeUndefined();
    }
  });

  it('handles promote-to-header with pending confirmation flow', () => {
    const state0 = createInitialState();
    const firstSectionId = Object.keys(state0.document.nodes).find((id) => {
      const node = state0.document.nodes[id];
      return node?.type === 'wrapper' && node.role === 'section' && node.parentId === state0.document.rootId;
    });
    if (!firstSectionId) {
      throw new Error('Expected section');
    }

    const beforeRoot = getRoot(state0.document);
    const existingHeaderId = beforeRoot.children.find((id) => {
      const node = state0.document.nodes[id];
      return node?.type === 'wrapper' && node.role === 'header';
    });
    if (!existingHeaderId) {
      throw new Error('Expected existing header');
    }

    const requested = requestPromoteWrapperRole(state0, firstSectionId, 'header');
    expect(requested.pendingRoleSwap).toBeTruthy();

    const confirmed = confirmPromoteWrapperRole(requested);
    const promoted = confirmed.document.nodes[firstSectionId];
    const oldHeader = confirmed.document.nodes[existingHeaderId];
    const rootAfter = getRoot(confirmed.document);

    expect(promoted.type).toBe('wrapper');
    expect(oldHeader.type).toBe('wrapper');
    if (promoted.type === 'wrapper' && oldHeader.type === 'wrapper') {
      expect(promoted.role).toBe('header');
      expect(oldHeader.role).toBe('section');
    }
    expect(rootAfter.children[0]).toBe(firstSectionId);
    expect(confirmed.pendingRoleSwap).toBeNull();
  });

  it('integrates editor sticky mutation with sticky layout resolution', () => {
    const state0 = createInitialState();
    const state1 = insertLeaf(state0, 'text');
    const leafId = state1.selectedId;
    if (!leafId) {
      throw new Error('Expected selected text leaf');
    }

    const state2 = updateStickyField(state1, leafId, {
      enabled: true,
      target: 'self',
      durationMode: 'custom',
      duration: parseUnitValue('120px'),
      durationTop: parseUnitValue('120px'),
      offsetTop: parseUnitValue('10px'),
    });

    const leaf = state2.document.nodes[leafId];
    if (leaf.type === 'site' || !leaf.parentId) {
      throw new Error('Expected leaf with parent wrapper');
    }

    const stickyState = resolveStickyLayout(state2.document);
    const parent = state2.document.nodes[leaf.parentId];
    if (!parent || parent.type !== 'wrapper') {
      throw new Error('Expected parent wrapper');
    }

    const registration = stickyState[parent.id]?.registrations.find((item) => item.ownerId === leafId);
    expect(registration).toBeTruthy();
    expect(registration?.durationPx).toBe(120);
  });

  it('normalizes imported documents and clears selection on replace', () => {
    const state0 = createInitialState();
    const state1 = insertLeaf(state0, 'text');
    expect(state1.selectedId).toBeTruthy();

    const baseDocument = createInitialDocument();
    const baseRoot = getRoot(baseDocument);
    const imported = {
      rootId: baseDocument.rootId,
      nodes: {
        [baseRoot.id]: {
          ...baseRoot,
          children: [],
        },
      },
    };

    const parsed = parseImportedDocumentJson(JSON.stringify(imported));
    const next = importDocument(state1, parsed);
    const nextRoot = getRoot(next.document);
    const topLevelWrappers = nextRoot.children.map((id) => next.document.nodes[id]);

    expect(next.selectedId).toBeNull();
    expect(topLevelWrappers.some((node) => node.type === 'wrapper' && node.role === 'header')).toBe(true);
    expect(topLevelWrappers.some((node) => node.type === 'wrapper' && node.role === 'footer')).toBe(true);
  });

  it('rejects editor session payloads as imported documents', () => {
    const state = createInitialState();

    expect(() => parseImportedDocumentJson(JSON.stringify(state))).toThrow('Import failed: invalid document structure.');
  });

  it('nudges selected components by pixel deltas and clamps to zero', () => {
    const state0 = createInitialState();
    const state1 = insertLeaf(state0, 'text');
    const leafId = state1.selectedId;
    if (!leafId) {
      throw new Error('Expected selected leaf');
    }

    const before = state1.document.nodes[leafId];
    if (before.type === 'site') {
      throw new Error('Expected non-site node');
    }

    const moved = nudgeNode(state1, leafId, { x: 10, y: -999 });
    const after = moved.document.nodes[leafId];
    if (after.type === 'site') {
      throw new Error('Expected non-site node');
    }

    expect(after.rect.x.base.raw).toBe(`${Math.max(0, Number.parseFloat(before.rect.x.base.raw) + 10)}px`);
    expect(after.rect.y.base.raw).toBe('0px');
  });

  it('does not nudge top-level wrappers', () => {
    const state = createInitialState();
    const root = getRoot(state.document);
    const sectionId = root.children.find((id) => {
      const node = state.document.nodes[id];
      return node?.type === 'wrapper' && node.role === 'section';
    });

    if (!sectionId) {
      throw new Error('Expected top-level section');
    }

    expect(nudgeNode(state, sectionId, { x: 10, y: 10 })).toBe(state);
  });
});
