import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeStickyState } from '../sticky/stickyCompute';
import { createInitialDocument } from '../model/defaults';
import { parseUnitValue } from '../model/units';
import {
  confirmPromoteWrapperRole,
  createInitialState,
  deleteNode,
  importDocument,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  nudgeNode,
  parseImportedDocumentJson,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  STORAGE_KEY,
  updateStickyField,
} from './editorStore';

function getRoot(state: ReturnType<typeof createInitialState>['document']) {
  const root = state.nodes[state.rootId];
  if (!root || root.type !== 'site') {
    throw new Error('Expected site root');
  }
  return root;
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
    const storage = new Map<string, string>();
    const localStorage = {
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
    };

    vi.stubGlobal('window', { localStorage });

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

  it('integrates editor sticky mutation with sticky compute registrations', () => {
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

    const stickyState = computeStickyState(state2.document);
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
