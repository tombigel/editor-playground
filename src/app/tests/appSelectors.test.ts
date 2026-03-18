import { describe, expect, it } from 'vitest';
import { createDefaultSticky, createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import type { EditorState } from '../../api/editorApi';
import {
  getNodeOrderState,
  getSectionOrderState,
  selectedNodeDisallowsContentWrapperTarget,
  selectedNodeHasBottomEdge,
  selectedNodeHasTopEdge,
} from '../appSelectors';

function createState(): EditorState {
  return {
    document: createInitialDocument(),
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: {
      previewSticky: true,
      spacerVisibility: 'selected',
      showGridLanes: false,
      snapEnabled: true,
      themeMode: 'auto',
      focusedMode: null,
      startupFocusedMode: null,
      inspectorCollapsed: false,
      temporaryInspectorOpen: false,
    },
  };
}

describe('app/appSelectors', () => {
  it('reports reorder availability for leaf nodes within their parent order', () => {
    const state = createState();
    const section = Object.values(state.document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected starter section');
    }

    const firstChild = state.document.nodes[section.children[0]];
    const lastChild = state.document.nodes[section.children[section.children.length - 1]];

    expect(getNodeOrderState(state, firstChild)).toEqual({
      show: true,
      canBack: false,
      canForward: true,
    });
    expect(getNodeOrderState(state, lastChild)).toEqual({
      show: true,
      canBack: true,
      canForward: false,
    });
  });

  it('tracks section order only against sibling sections at the site root', () => {
    const state = createState();
    const root = state.document.nodes[state.document.rootId];
    if (root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const extraSection = createWrapper('section', root.id);
    extraSection.name = 'Extra Section';
    state.document.nodes[extraSection.id] = extraSection;
    root.children.splice(root.children.length - 1, 0, extraSection.id);

    const firstSection = state.document.nodes[root.children.find((id) => state.document.nodes[id]?.type === 'wrapper' && state.document.nodes[id]?.role === 'section') ?? ''];
    const secondSection = extraSection;

    expect(getSectionOrderState(state, firstSection)).toEqual({
      canBack: false,
      canForward: true,
    });
    expect(getSectionOrderState(state, secondSection)).toEqual({
      canBack: true,
      canForward: false,
    });
  });

  it('derives sticky edge and target capabilities from the selected node', () => {
    const state = createState();
    const section = Object.values(state.document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section');
    }

    const stickyLeaf = createLeaf('text', section.id);
    stickyLeaf.sticky = createDefaultSticky();
    state.document.nodes[stickyLeaf.id] = stickyLeaf;
    section.children.push(stickyLeaf.id);

    const container = createWrapper('container', section.id);
    state.document.nodes[container.id] = container;

    expect(selectedNodeHasTopEdge(state, stickyLeaf.id)).toBe(true);
    expect(selectedNodeHasBottomEdge(state, stickyLeaf.id)).toBe(false);
    expect(selectedNodeDisallowsContentWrapperTarget(state, container.id)).toBe(true);
  });
});
